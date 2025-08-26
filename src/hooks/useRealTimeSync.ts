import { useState, useEffect, useRef } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { logisticsService } from '../lib/supabase';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';

interface SyncState {
  isOnline: boolean;
  lastSync: Date | null;
  syncCount: number;
  hasChanges: boolean;
}

export function useRealTimeSync(
  records: LogisticsRecord[],
  onRecordsUpdate: (records: LogisticsRecord[]) => void,
  enabled: boolean = true
) {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSync: null,
    syncCount: 0,
    hasChanges: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecordsHashRef = useRef<string>('');
  const isActiveRef = useRef(true);
  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const forceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate hash for records to detect changes
  const generateRecordsHash = (records: LogisticsRecord[]): string => {
    const relevantData = records.map(record => ({
      id: record.id,
      status: record.status,
      updated_at: record.updated_at
    }));
    return JSON.stringify(relevantData);
  };

  // Check if page is visible (to pause sync when tab is not active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (isActiveRef.current && enabled && !syncInProgressRef.current) {
        // Resume sync immediately when page becomes visible
        performSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      if (enabled && isActiveRef.current && !syncInProgressRef.current) {
        performSync();
      }
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled]);

  const performSync = async () => {
    if (!enabled || !syncState.isOnline || !isActiveRef.current || syncInProgressRef.current) {
      return;
    }

    // Throttle sync requests - reduced to 5 seconds for better responsiveness
    const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
    if (timeSinceLastSync < 3000) { // Minimum 3 seconds between syncs
      return;
    }

    syncInProgressRef.current = true;
    lastSyncTimeRef.current = Date.now();

    try {
      // Fetch latest records silently in background
      const latestRecords = await logisticsService.getRecords();
      const newHash = generateRecordsHash(latestRecords);
      
      // Only update if there are actual changes
      if (newHash !== lastRecordsHashRef.current) {
        lastRecordsHashRef.current = newHash;
        
        // Use requestAnimationFrame to ensure smooth updates
        requestAnimationFrame(() => {
          onRecordsUpdate(latestRecords);
          
          setSyncState(prev => ({
            ...prev,
            lastSync: new Date(),
            syncCount: prev.syncCount + 1,
            hasChanges: true
          }));

          // Reset hasChanges flag after a short delay
          setTimeout(() => {
            setSyncState(prev => ({ ...prev, hasChanges: false }));
          }, 2000);
        });
      } else {
        // Update sync time even if no changes
        setSyncState(prev => ({
          ...prev,
          lastSync: new Date(),
          syncCount: prev.syncCount + 1
        }));
      }
    } catch (error) {
      // Silent error handling - log but don't show to user
      console.warn('Background sync failed:', error);
      ErrorAnalyzer.logError(error instanceof Error ? error : 'Background sync failed', 'system', 'useRealTimeSync');
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // Force sync function for immediate updates
  const forceSync = async () => {
    // Clear any existing throttling
    lastSyncTimeRef.current = 0;
    await performSync();
  };

  // Set up sync interval - reduced to 15 seconds for better responsiveness
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial hash
    lastRecordsHashRef.current = generateRecordsHash(records);

    // Set up 5-second interval for faster alert sharing
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current && syncState.isOnline && !syncInProgressRef.current) {
        performSync();
      }
    }, 5000);

    // Perform initial sync after 2 seconds
    const initialSyncTimeout = setTimeout(() => {
      if (!syncInProgressRef.current) {
        performSync();
      }
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(initialSyncTimeout);
    };
  }, [enabled, syncState.isOnline]);

  // Force update after record operations
  const scheduleForceUpdate = () => {
    if (forceUpdateTimeoutRef.current) {
      clearTimeout(forceUpdateTimeoutRef.current);
    }
    
    forceUpdateTimeoutRef.current = setTimeout(() => {
      forceSync();
    }, 1000); // Force sync 1 second after operation
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (forceUpdateTimeoutRef.current) {
        clearTimeout(forceUpdateTimeoutRef.current);
      }
      syncInProgressRef.current = false;
    };
  }, []);

  return {
    syncState: {
      ...syncState,
    },
    forceSync,
    scheduleForceUpdate
  };
}