import React from 'react';
import { Wifi, WifiOff, CheckCircle, RefreshCw } from 'lucide-react';

interface SyncState {
  isOnline: boolean;
  lastSync: Date | null;
  syncCount: number;
  hasChanges: boolean;
}

interface SyncIndicatorProps {
  syncState: SyncState;
  className?: string;
  onForceSync?: () => void;
}

export function SyncIndicator({ syncState, className = '', onForceSync }: SyncIndicatorProps) {
  const { isOnline, lastSync, hasChanges } = syncState;

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m atrás`;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {/* Connection Status */}
      <div className={`flex items-center gap-1 ${
        isOnline ? 'text-green-600' : 'text-red-600'
      }`}>
        {isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span className="hidden sm:inline">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Last Sync Status */}
      {isOnline && (
        <>
          <div className="w-px h-3 bg-gray-300"></div>
          <div className={`flex items-center gap-1 ${hasChanges ? 'text-blue-600' : 'text-gray-500'}`}>
            <CheckCircle className={`h-3 w-3 ${hasChanges ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">
              Sync: {formatLastSync(lastSync)}
            </span>
          </div>
          
          {/* Force Sync Button */}
          {onForceSync && (
            <>
              <div className="w-px h-3 bg-gray-300"></div>
              <button
                onClick={onForceSync}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                title="Forçar sincronização"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}