import { useState, useEffect } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { logisticsService } from '../lib/supabase';
import { TrackingService } from '../lib/trackingService';
import { StatusCountService } from '../lib/statusCountService';
import { useRealTimeSync } from './useRealTimeSync';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';
import { useRenderMonitor } from './useRenderMonitor';

export function useLogistics() {
  const [records, setRecords] = useState<LogisticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitoramento de renderização
  useRenderMonitor('useLogistics', 'system', [records.length, loading, error]);
  useEffect(() => {
    loadRecords();
  }, []);

  // Real-time sync hook
  const { syncState, forceSync, scheduleForceUpdate } = useRealTimeSync(
    records,
    (updatedRecords) => {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        setRecords(updatedRecords);
      });
    },
    !loading // Only disable sync when initially loading
  );

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Test connection first
      const isConnected = await logisticsService.testConnection();
      if (!isConnected) {
        throw new Error('Não foi possível conectar ao banco de dados. Verifique as configurações do Supabase.');
      }
      
      const data = await logisticsService.getRecords();
      setRecords(data);
      console.log('Records loaded successfully:', data.length);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar registros';
      ErrorAnalyzer.logError(err instanceof Error ? err : errorMessage, 'system', 'useLogistics');
      setError(errorMessage);
      // Don't set empty array on error, keep existing records
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (recordData: Partial<LogisticsRecord>) => {
    try {
      console.log('Adding new record:', recordData);
      
      const newRecord = await logisticsService.createRecord(recordData);
      
      // Inicializar o primeiro status no sistema de contagem
      try {
        await StatusCountService.initializeFirstStatus(
          newRecord.id,
          newRecord.status || 'aguardando_tecnico',
          recordData.operator_name || 'Sistema',
          'Status inicial do registro'
        );
        console.log('First status initialized for new record');
      } catch (statusError) {
        console.warn('Erro ao inicializar primeiro status:', statusError);
      }
      
      // Use functional update to prevent race conditions
      setRecords(prev => {
        const exists = prev.find(r => r.id === newRecord.id);
        return exists ? prev : [newRecord, ...prev];
      });
      console.log('Record added successfully to state');
      
      // Force immediate sync to update all clients
      scheduleForceUpdate();
      
      return newRecord;
    } catch (err) {
      console.error('Erro ao criar registro:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar registro';
      ErrorAnalyzer.logError(err instanceof Error ? err : errorMessage, 'system', 'useLogistics');
      setError(errorMessage);
      throw err;
    }
  };

  const updateRecordStatus = async (recordId: string, newStatus: string) => {
    try {
      console.log(`Updating record ${recordId} status to ${newStatus}`);
      
      // Atualizar diretamente usando o serviço
      const updatedRecord = await logisticsService.updateRecordStatus(recordId, newStatus, 'Sistema');
      
      // Atualizar o estado local imediatamente
      setRecords(prev => {
        const updated = prev.map(record => 
          record.id === recordId ? updatedRecord : record
        );
        return updated;
      });
      
      // Buscar o status atual antes da atualização para o sistema de contagem
      const currentRecord = records.find(r => r.id === recordId);
      const previousStatus = currentRecord?.status || null;
      
      // Usar o novo sistema de contagem de status em background
      try {
        await StatusCountService.transitionStatus(
          recordId, 
          newStatus, 
          'Sistema', 
          `Status alterado de ${previousStatus || 'inicial'} para ${newStatus}`
        );
        console.log('Status count tracking updated successfully');
      } catch (countError) {
        console.warn('Erro no sistema de contagem de status:', countError);
        // Não falhar a operação principal se o sistema de contagem falhar
      }
      
      // Criar timestamp de rastreamento em background
      try {
        await TrackingService.startStatus(recordId, newStatus as any, 'Sistema', `Status alterado para ${newStatus}`);
        console.log('Tracking timestamp created successfully');
      } catch (trackingError) {
        console.warn('Erro no sistema de tracking:', trackingError);
        // Não falhar a operação principal se o tracking falhar
      }
      
      // Force immediate sync to update all clients
      scheduleForceUpdate();
      
      console.log('Record status updated successfully in state');
      
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar status';
      ErrorAnalyzer.logError(err instanceof Error ? err : errorMessage, 'system', 'useLogistics');
      setError(errorMessage);
      throw err;
    }
  };

  const updateRecord = async (recordId: string, updates: Partial<LogisticsRecord>) => {
    try {
      console.log(`Updating record ${recordId}:`, updates);
      
      const updatedRecord = await logisticsService.updateRecord(recordId, updates);
      setRecords(prev => {
        const updated = prev.map(record => 
          record.id === recordId ? updatedRecord : record
        );
        return updated;
      });
      
      // Force immediate sync to update all clients
      scheduleForceUpdate();
      
      console.log('Record updated successfully in state');
      
      return updatedRecord;
    } catch (err) {
      console.error('Erro ao atualizar registro:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar registro';
      ErrorAnalyzer.logError(err instanceof Error ? err : errorMessage, 'system', 'useLogistics');
      setError(errorMessage);
      throw err;
    }
  };

  const deleteRecord = async (recordId: string) => {
    try {
      console.log(`Deleting record ${recordId}`);
      
      // Primeiro, remover do estado local para feedback imediato
      setRecords(prev => prev.filter(record => record.id !== recordId));
      
      // Depois, deletar do banco de dados
      await logisticsService.deleteRecord(recordId);
      
      // Force immediate sync to update all clients
      scheduleForceUpdate();
      
      console.log('Record deleted successfully from state');
      
    } catch (err) {
      console.error('Erro ao deletar registro:', err);
      
      // Se falhar, recarregar os dados para restaurar o estado correto
      await loadRecords();
      
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao deletar registro';
      ErrorAnalyzer.logError(err instanceof Error ? err : errorMessage, 'system', 'useLogistics');
      setError(errorMessage);
      throw err;
    }
  };

  const deleteMultipleRecords = async (recordIds: string[]) => {
    try {
      console.log(`Deleting ${recordIds.length} records:`, recordIds);
      
      // Depois, deletar do banco de dados
      await logisticsService.deleteMultipleRecords(recordIds);
      
      // Só remover do estado local após sucesso na exclusão
      setRecords(prev => prev.filter(record => !recordIds.includes(record.id)));
      
      // Force immediate sync to update all clients
      scheduleForceUpdate();
      
      console.log(`${recordIds.length} records deleted successfully from state`);
      
    } catch (err) {
      console.error('Erro ao deletar registros:', err);
      
      // Se falhar, recarregar os dados para restaurar o estado correto
      await loadRecords();
      
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao deletar registros';
      ErrorAnalyzer.logError(err instanceof Error ? err : errorMessage, 'system', 'useLogistics');
      setError(errorMessage);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    records,
    loading,
    error,
    syncState,
    addRecord,
    updateRecordStatus,
    updateRecord,
    deleteRecord,
    deleteMultipleRecords,
    refreshRecords: loadRecords,
    forceSync,
    clearError
  };
}