import React, { useState, useEffect, useMemo } from 'react';
import { LoginForm } from './components/LoginForm';
import { AdminPanel } from './components/AdminPanel';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { StatusFilterDashboard } from './components/StatusFilterDashboard';
import { LogisticsTable } from './components/LogisticsTable';
import { NewRecordForm } from './components/NewRecordForm';
import { TrackingDashboard } from './components/TrackingDashboard';
import { LogisticsRoadmap } from './components/LogisticsRoadmap';
import { FloatingTrashButton } from './components/FloatingTrashButton';
import { MobileLayout } from './components/MobileLayout';
import { SyncIndicator } from './components/SyncIndicator';
import { DebugPanel } from './components/DebugPanel';
import { useViewMode } from './hooks/useViewMode';
import { useLogistics } from './hooks/useLogistics';
import { useAuth, AuthProvider, useAuthHook } from './hooks/useAuth';
import { PROFILE_CONFIGS } from './types/auth';
import { authService } from './lib/authService';
import { OccurrenceManager } from './components/OccurrenceManager';
import { BreakdownNotification } from './components/BreakdownNotification';
import { useBreakdownNotification } from './hooks/useBreakdownNotification';
import { LogOut, Settings, User, RefreshCw } from 'lucide-react';

type ViewType = 'records' | 'new' | 'tracking' | 'occurrence';

function AppContent() {
  const { authState, login, logout } = useAuth();
  const { isPinned: isViewModePinned } = useViewMode();
  
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
  
  const [currentView, setCurrentView] = useState<ViewType>('records');
  const [showResolved, setShowResolved] = useState(false);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const [selectedRecordForTracking, setSelectedRecordForTracking] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedRecordForOccurrenceManager, setSelectedRecordForOccurrenceManager] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Hook para notificações de quebra
  const { notification, toggleSound, dismissNotification } = useBreakdownNotification(records);

  // Todos os useEffect no topo
  useEffect(() => {
    const initializeDemoUsers = async () => {
      try {
        await authService.ensureDemoUsersExist();
      } catch (error) {
        console.error('Erro ao inicializar usuários demo:', error);
      }
    };

    initializeDemoUsers();
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      setIsMobile(width < 768);
    };

    // Inicialização
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrar registros para a tabela principal (excluir resolvidos por padrão)
  const filteredRecords = useMemo(() => {
    let filtered = showResolved 
      ? records 
      : records.filter(record => record.status !== 'resolvido');
    
    // Aplicar filtro de status se selecionado
    if (statusFilter) {
      filtered = filtered.filter(record => record.status === statusFilter);
    }
    
    return filtered;
  }, [records, showResolved, statusFilter]);

  // Contar registros ativos (não resolvidos)
  const activeRecordsCount = useMemo(() => 
    records.filter(record => record.status !== 'resolvido').length, 
    [records]
  );
  
  const resolvedRecordsCount = useMemo(() => 
    records.filter(record => record.status === 'resolvido').length, 
    [records]
  );

  // Se não estiver autenticado, mostrar tela de login
  if (!authState.isAuthenticated) {
    return (
      <LoginForm
        onLogin={login}
        isLoading={authState.isLoading}
        error={authState.error}
      />
    );
  }

  // Se estiver carregando, mostrar loading
  if (authState.isLoading || (loading && records.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <span className="text-gray-600">
            {authState.isLoading ? 'Verificando autenticação...' : 'Carregando dados...'}
          </span>
        </div>
      </div>
    );
  }

  const handleNewRecord = async (recordData: any) => {
    try {
      await addRecord(recordData);
      setCurrentView('records');
      
      // Force immediate sync after adding record
      setTimeout(() => {
        forceSync();
      }, 2000);
    } catch (error) {
      console.error('Error creating record:', error);
    }
  };

  const handleHighlightRecord = (recordId: string) => {
    setHighlightedRecordId(recordId);
    // Remove highlight after 5 seconds
    setTimeout(() => {
      setHighlightedRecordId(null);
    }, 5000);
  };

  const handleUpdateStatusFromDashboard = async (recordId: string, newStatus: string) => {
    try {
      console.log('Dashboard status update:', { recordId, newStatus });
      await updateRecordStatus(recordId, newStatus);
      handleHighlightRecord(recordId);
      
      // Force immediate sync after status update
      setTimeout(() => {
        forceSync();
      }, 1000);
    } catch (error) {
      console.error('Error updating record status from dashboard:', error);
      // Mostrar erro para o usuário
      alert(`Erro ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleOpenTracking = (recordId: string) => {
    setSelectedRecordForTracking(recordId);
    setCurrentView('tracking');
  };

  const handleTrackingStatusChange = () => {
    // Função para recarregar dados quando status for alterado no tracking
    // Force sync after tracking changes
    setTimeout(() => {
      forceSync();
    }, 1000);
    console.log('Status changed in tracking');
  };

  const handleDeleteRecords = async (recordIds: string[]) => {
    try {
      console.log('App.tsx: Iniciando exclusão de registros:', recordIds);
      
      // Usar a função de exclusão múltipla otimizada
      await deleteMultipleRecords(recordIds);
      
      // Force immediate sync after deletion
      setTimeout(() => {
        forceSync();
      }, 1000);
      
      console.log('Todos os registros foram deletados com sucesso');
    } catch (error) {
      console.error('Erro ao deletar registros:', error);
      throw error;
    }
  };

  const handleOpenOccurrenceManager = (recordId: string) => {
    setSelectedRecordForOccurrenceManager(recordId);
    setCurrentView('occurrence');
  };

  // Mobile Layout
  if (isMobile) {
    if (loading && records.length === 0) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <span className="text-gray-600">Carregando dados...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-800 mb-2">Erro de Conexão</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={clearError}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'records':
        return (
          <>
            <MobileLayout
              records={records}
              onUpdateStatus={updateRecordStatus}
              onUpdateRecord={updateRecord}
              onDeleteRecord={deleteRecord}
              onOpenTracking={handleOpenTracking}
              onOpenOccurrenceManager={handleOpenOccurrenceManager}
              onNewRecord={() => setCurrentView('new')}
              highlightedRecordId={highlightedRecordId}
              showResolved={showResolved}
              onToggleResolved={setShowResolved}
            />
            <FloatingTrashButton
              records={records}
              onDeleteRecords={handleDeleteRecords}
            />
          </>
        );
      
      case 'new':
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="mb-4">
              <button
                onClick={() => setCurrentView('records')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                ← Voltar aos Registros
              </button>
            </div>
            <NewRecordForm
              onSubmit={handleNewRecord}
              onCancel={() => setCurrentView('records')}
            />
          </div>
        );
      
      case 'tracking':
        const selectedRecord = records.find(r => r.id === selectedRecordForTracking);
        if (!selectedRecord) {
          setCurrentView('records');
          return null;
        }
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="mb-4">
              <button
                onClick={() => setCurrentView('records')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                ← Voltar aos Registros
              </button>
            </div>
            <TrackingDashboard 
              recordId={selectedRecord.id}
              vehicleCode={selectedRecord.vehicle_code}
              onStatusChange={handleTrackingStatusChange}
            />
          </div>
        );

      case 'occurrence':
        const selectedRecordForOccurrence = records.find(r => r.id === selectedRecordForOccurrenceManager);
        if (!selectedRecordForOccurrence) {
          setCurrentView('records');
          return null;
        }
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="mb-4">
              <button
                onClick={() => setCurrentView('records')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                ← Voltar aos Registros
              </button>
            </div>
            <OccurrenceManager
              recordId={selectedRecordForOccurrence.id}
              onClose={() => setCurrentView('records')}
            />
          </div>
        );
      
      default:
        return null;
    }
  }

  // Desktop Layout
  const renderContent = () => {
    if (loading && records.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Carregando dados...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-red-800">Erro de Conexão</h3>
              <p className="text-red-600 mt-1">{error}</p>
              <p className="text-sm text-red-500 mt-2">
                Verifique se o Supabase está configurado corretamente e se as variáveis de ambiente estão definidas.
              </p>
            </div>
            <button
              onClick={clearError}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'records':
        return (
          <div className={`space-y-8 transition-opacity duration-300`}>
            {/* Painel Admin - apenas para administradores */}
            {authState.user?.user_type === 'admin' && (
              <div className="mb-8">
                <AdminPanel records={records} />
              </div>
            )}

            {/* Para admin, mostrar apenas Dashboard Geral */}
            {authState.user?.user_type === 'admin' ? (
              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Dashboard Geral</h2>
                  <div className="text-sm text-gray-600">
                    Use o Painel Administrativo acima para gerenciar registros e usuários
                  </div>
                </div>
                <Dashboard 
                  records={records} 
                  onUpdateStatus={handleUpdateStatusFromDashboard}
                  onHighlightRecord={handleHighlightRecord}
                  onOpenTracking={handleOpenTracking}
                  onOpenOccurrenceManager={handleOpenOccurrenceManager}
                  isAdminView={true}
                />
              </div>
            ) : (
              <>
                {/* Status Filter Dashboard - Para todos os usuários */}
                <div className="mt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard de Status</h2>
                    {statusFilter && (
                      <div className="text-sm text-gray-600">
                        Filtrado por: <span className="font-medium text-blue-600">{statusFilter}</span>
                      </div>
                    )}
                  </div>
                  <StatusFilterDashboard
                    records={records}
                    onStatusFilter={setStatusFilter}
                    selectedStatus={statusFilter}
                    onRecordSelect={handleHighlightRecord}
                    onOpenTracking={handleOpenTracking}
                  />
                </div>

                {/* Dashboard - Apenas Distribuição por Status para perfis não-admin */}
                {(authState.user?.user_type === 'torre') && (
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Dashboard - Distribuição por Status</h2>
                    </div>
                    <Dashboard 
                      records={records} 
                      onUpdateStatus={handleUpdateStatusFromDashboard}
                      onHighlightRecord={handleHighlightRecord}
                      onOpenTracking={handleOpenTracking}
                      onOpenOccurrenceManager={handleOpenOccurrenceManager}
                      isAdminView={false}
                    />
                  </div>
                )}

                {/* Logistics Roadmap - Novo Sistema de Roadmap */}
                {(authState.user?.user_type === 'torre') && (
                  <div className="mt-8">
                    <LogisticsRoadmap 
                      records={records}
                      onRecordSelect={handleHighlightRecord}
                      selectedRecordId={highlightedRecordId}
                    />
                  </div>
                )}

                {/* Seção de Registros */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {isViewModePinned && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-blue-700">Visualização Fixada</span>
                        </div>
                      )}
                      <h2 className="text-2xl font-bold text-gray-900">
                        Registros de Quebras
                        <span className="text-lg font-normal text-gray-600 ml-2">
                          ({activeRecordsCount} ativos{resolvedRecordsCount > 0 && `, ${resolvedRecordsCount} resolvidos`})
                        </span>
                      </h2>
                    </div>
                    <button
                      onClick={() => setCurrentView('new')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Nova Quebra
                    </button>
                  </div>
                  
                  {/* Controles de filtro */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showResolved"
                        checked={showResolved}
                        onChange={(e) => setShowResolved(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="showResolved" className="text-sm font-medium text-gray-700">
                        Mostrar registros resolvidos na tabela
                      </label>
                    </div>
                    {statusFilter && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Filtro ativo:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {statusFilter}
                        </span>
                        <button
                          onClick={() => setStatusFilter(null)}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Remover filtro
                        </button>
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {statusFilter
                        ? `Exibindo ${filteredRecords.length} registros com status "${statusFilter}"`
                        : showResolved 
                        ? `Exibindo todos os ${records.length} registros` 
                        : `Exibindo ${activeRecordsCount} registros ativos (${resolvedRecordsCount} resolvidos ocultos)`
                      }
                    </div>
                    
                    {/* Force Sync Button */}
                    <button
                      onClick={forceSync}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                      title="Forçar atualização dos dados"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Atualizar
                    </button>
                  </div>
                  <LogisticsTable
                    records={filteredRecords}
                    onUpdateStatus={updateRecordStatus}
                    onUpdateRecord={updateRecord}
                    onDeleteRecord={deleteRecord}
                    onDeleteMultipleRecords={deleteMultipleRecords}
                    highlightedRecordId={highlightedRecordId}
                    onOpenTracking={handleOpenTracking}
                    onOpenOccurrenceManager={handleOpenOccurrenceManager}
                    onCloseOccurrenceManager={() => setSelectedRecordForOccurrenceManager(null)}
                  />
                </div>
              </>
            )}
          </div>
        );
      
      case 'new':
        return (
          <NewRecordForm
            onSubmit={handleNewRecord}
            onCancel={() => setCurrentView('records')}
          />
        );
      
      case 'tracking':
        const selectedRecord = records.find(r => r.id === selectedRecordForTracking);
        if (!selectedRecord) {
          setCurrentView('records');
          return null;
        }
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('records')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                ← Voltar aos Registros
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Rastreamento Temporal - {selectedRecord.vehicle_code}
              </h2>
            </div>
            <TrackingDashboard 
              recordId={selectedRecord.id}
              vehicleCode={selectedRecord.vehicle_code}
              onStatusChange={handleTrackingStatusChange}
            />
          </div>
        );
      
      case 'occurrence':
        const selectedRecordForOccurrence = records.find(r => r.id === selectedRecordForOccurrenceManager);
        if (!selectedRecordForOccurrence) {
          setCurrentView('records');
          return null;
        }
        return (
          <OccurrenceManager
            recordId={selectedRecordForOccurrence.id}
            onClose={() => setSelectedRecordForOccurrenceManager(null)}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView}
        user={authState.user}
        onLogout={logout}
        syncState={syncState}
      />
      
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
        
        {/* Floating Trash Button */}
        {/* Floating Trash Button - Removido para admins, eles usam o painel administrativo */}
        {authState.user?.user_type !== 'admin' && (
          <FloatingTrashButton
            records={records}
            onDeleteRecords={handleDeleteRecords}
          />
        )}
        
        {/* Occurrence Manager Modal */}
        {selectedRecordForOccurrenceManager && currentView !== 'occurrence' && (
          <OccurrenceManager
            recordId={selectedRecordForOccurrenceManager}
            onClose={() => setSelectedRecordForOccurrenceManager(null)}
          />
        )}
        
        {/* Debug Panel - apenas para desenvolvimento e admins */}
        <DebugPanel />
      </main>
      
      {/* Sistema de Notificação de Quebras */}
      <BreakdownNotification
        isVisible={notification.isVisible}
        record={notification.record}
        soundEnabled={notification.soundEnabled}
        onToggleSound={toggleSound}
        onDismiss={dismissNotification}
      />
    </div>
  );
}

function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  const authHook = useAuthHook();
  
  return (
    <AuthProvider value={authHook}>
      {children}
    </AuthProvider>
  );
}

function App() {
  return (
    <AuthProviderWrapper>
      <AppContent />
    </AuthProviderWrapper>
  );
}

export default App;