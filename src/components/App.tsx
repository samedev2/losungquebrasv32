import React, { useState, useEffect, useMemo } from 'react';
import { LoginForm } from './LoginForm';
import { AdminPanel } from './AdminPanel';
import { Header } from './Header';
import { Dashboard } from './Dashboard';
import { StatusFilterDashboard } from './StatusFilterDashboard';
import { LogisticsTable } from './LogisticsTable';
import { NewRecordForm } from './NewRecordForm';
import { TrackingDashboard } from './TrackingDashboard';
import { LogisticsRoadmap } from './LogisticsRoadmap';
import { FloatingTrashButton } from './FloatingTrashButton';
import { MobileLayout } from './MobileLayout';
import { SyncIndicator } from './SyncIndicator';
import { DebugPanel } from './DebugPanel';
import { SoundControlPanel } from './SoundControlPanel';
import { useViewMode } from './hooks/useViewMode';
import { useLogistics } from './hooks/useLogistics';
import { useAuth, AuthProvider, useAuthHook } from './hooks/useAuth';
import { PROFILE_CONFIGS } from './types/auth';
import { authService } from './lib/authService';
import { PhotoService } from './lib/photoService';
import { OccurrenceManager } from './components/OccurrenceManager';
import { BreakdownNotification } from './components/BreakdownNotification';
import { useBreakdownNotification } from './hooks/useBreakdownNotification';
import { OperatorRankingPanel } from './components/OperatorRankingPanel';
import { PermissionTestPanel } from './components/PermissionTestPanel';
import { PanelVisibilityController } from './components/PanelVisibilityController';
import { useSoundEffects } from './hooks/useSoundEffects';
import { LogOut, Settings, User, RefreshCw } from 'lucide-react';

function AppContent() {
  const { authState, login, logout } = useAuth();
  const { isPinned: isViewModePinned } = useViewMode();
  const { playSuccess, playError, playButtonClick } = useSoundEffects();
  
  // Todos os hooks no topo, antes de qualquer retorno condicional
  const { 
    records, 
    loading, 
    error, 
    syncState,
    forceSync,
    addRecord, 
    updateRecordStatus, 
    updateRecord, 
    deleteRecord, 
    deleteMultipleRecords,
    clearError 
  } = useLogistics();

  const handleNewRecord = async (recordData: any) => {
    try {
      const createdRecord = await addRecord(recordData);
      await playSuccess();
      setCurrentView('records');
      
      // Force immediate sync after adding record
      setTimeout(() => {
        forceSync();
      }, 2000);
      
      return createdRecord; // Retornar o registro criado
    } catch (error) {
      console.error('Error creating record:', error);
      await playError();
      throw error; // Re-throw para que o formulário possa lidar com o erro
    }
  };

  const handleUpdateStatusFromDashboard = async (recordId: string, newStatus: string) => {
    try {
      console.log('Dashboard status update:', { recordId, newStatus });
      await updateRecordStatus(recordId, newStatus);
      await playSuccess();
      handleHighlightRecord(recordId);
      
      // Force immediate sync after status update
      setTimeout(() => {
        forceSync();
      }, 1000);
    } catch (error) {
      console.error('Error updating record status from dashboard:', error);
      await playError();
      // Mostrar erro para o usuário
      alert(`Erro ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleOpenTracking = (recordId: string) => {
    playButtonClick();
    setSelectedRecordForTracking(recordId);
    setCurrentView('tracking');
  };

  const handleDeleteRecords = async (recordIds: string[]) => {
    try {
      console.log('App.tsx: Iniciando exclusão de registros:', recordIds);
      
      // Usar a função de exclusão múltipla otimizada
      await deleteMultipleRecords(recordIds);
      
      await playSuccess();
      
      // Force immediate sync after deletion
      setTimeout(() => {
        forceSync();
      }, 1000);
      
      console.log('Todos os registros foram deletados com sucesso');
    } catch (error) {
      console.error('Erro ao deletar registros:', error);
      await playError();
      throw error;
    }
  };

  const handleOpenOccurrenceManager = (recordId: string) => {
    playButtonClick();
    setSelectedRecordForOccurrenceManager(recordId);
    setCurrentView('occurrence');
  };

        {/* Debug Panel - apenas para desenvolvimento e admins */}
        <DebugPanel />
        
        {/* Sound Control Panel - apenas para admins */}
        {authState.user?.user_type === 'admin' && (
          <div className="mt-8">
            <SoundControlPanel />
          </div>
        )}
        
        {/* Permission Test Panel - apenas para admins */}
        {authState.user?.user_type === 'admin' && (
          <div className="mt-8">
            <PermissionTestPanel />
          </div>
        )}
      </main>