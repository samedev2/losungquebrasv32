import { supabase } from './supabase';
import { StatusTimestamp, TrackingStatus, ProcessSummary, TimelineEntry, StatusDuration } from '../types/tracking';

export class TrackingService {
  /**
   * Inicia um novo status para um registro
   * @param recordId ID do registro
   * @param newStatus Novo status a ser aplicado
   * @param operatorName Nome do operador responsável
   * @param notes Observações opcionais
   */
  static async startStatus(
    recordId: string, 
    newStatus: TrackingStatus, 
    operatorName: string, 
    notes?: string
  ): Promise<StatusTimestamp> {
    try {
      // Verificar se o registro existe
      const { data: recordExists, error: checkError } = await supabase
        .from('logistics_records')
        .select('id')
        .eq('id', recordId)
        .single();

      if (checkError || !recordExists) {
        console.error('Record not found for tracking:', checkError);
        throw new Error('Registro não encontrado para tracking');
      }
      
      // Primeiro, finaliza o status atual se existir
      await this.finishCurrentStatus(recordId, operatorName);

      // Cria o novo status timestamp
      const { data, error } = await supabase
        .from('status_timestamps')
        .insert([{
          record_id: recordId,
          status: newStatus,
          operator_name: operatorName,
          entered_at: new Date().toISOString(),
          notes: notes || ''
        }])
        .select()
        .single();

      if (error) throw error;


      console.log(`Status iniciado: ${newStatus} para registro ${recordId} por ${operatorName}`);
      return data;
    } catch (error) {
      console.error('Erro ao iniciar status:', error);
      throw error;
    }
  }

  /**
   * Finaliza o status atual de um registro
   * @param recordId ID do registro
   * @param operatorName Nome do operador responsável
   */
  static async finishCurrentStatus(recordId: string, operatorName: string): Promise<void> {
    try {
      // Busca o status atual ativo (sem exit_at)
      const { data: currentStatus, error: fetchError } = await supabase
        .from('status_timestamps')
        .select('*')
        .eq('record_id', recordId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (currentStatus && currentStatus.length > 0) {
        const status = currentStatus[0];
        const exitedAt = new Date().toISOString();
        const enteredAt = new Date(status.entered_at);
        const durationSeconds = Math.floor((new Date(exitedAt).getTime() - enteredAt.getTime()) / 1000);

        // Atualiza o status com tempo de saída e duração
        const { error: updateError } = await supabase
          .from('status_timestamps')
          .update({
            exited_at: exitedAt,
            duration_seconds: durationSeconds
          })
          .eq('id', status.id);

        if (updateError) throw updateError;

        console.log(`Status finalizado: ${status.status} durou ${durationSeconds} segundos`);
      }
    } catch (error) {
      console.error('Erro ao finalizar status atual:', error);
      throw error;
    }
  }

  /**
   * Obtém a linha do tempo completa de um registro
   * @param recordId ID do registro
   */
  static async getTimeline(recordId: string): Promise<TimelineEntry[]> {
    try {
      const { data, error } = await supabase
        .from('status_timestamps')
        .select('*')
        .eq('record_id', recordId)
        .order('entered_at', { ascending: true });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        status: item.status,
        operator_name: item.operator_name,
        entered_at: item.entered_at,
        exited_at: item.exited_at,
        duration_seconds: item.duration_seconds,
        notes: item.notes,
        is_current: !item.exited_at
      }));
    } catch (error) {
      console.error('Erro ao buscar timeline:', error);
      throw error;
    }
  }

  /**
   * Calcula o resumo completo do processo
   * @param recordId ID do registro
   */
  static async getProcessSummary(recordId: string): Promise<ProcessSummary | null> {
    try {
      // Busca informações do registro
      const { data: record, error: recordError } = await supabase
        .from('logistics_records')
        .select('vehicle_code, status')
        .eq('id', recordId)
        .single();

      if (recordError) throw recordError;

      // Busca timeline completa
      const timeline = await this.getTimeline(recordId);

      if (timeline.length === 0) {
        return null;
      }

      // Calcula durações por status
      const statusDurations = this.calculateStatusDurations(timeline);

      // Calcula tempo total do processo
      const firstEntry = timeline[0];
      const lastEntry = timeline[timeline.length - 1];
      const totalProcessTime = lastEntry.exited_at 
        ? Math.floor((new Date(lastEntry.exited_at).getTime() - new Date(firstEntry.entered_at).getTime()) / 1000)
        : Math.floor((new Date().getTime() - new Date(firstEntry.entered_at).getTime()) / 1000);

      // Identifica gargalos (status que demoram mais)
      const bottlenecks = statusDurations
        .sort((a, b) => b.total_seconds - a.total_seconds)
        .slice(0, 3)
        .map(duration => ({
          status: duration.status,
          duration_seconds: duration.total_seconds,
          percentage: totalProcessTime > 0 ? (duration.total_seconds / totalProcessTime) * 100 : 0
        }));

      return {
        record_id: recordId,
        vehicle_code: record.vehicle_code,
        total_process_time: totalProcessTime,
        current_status: record.status,
        status_durations: statusDurations,
        timeline,
        bottlenecks
      };
    } catch (error) {
      console.error('Erro ao calcular resumo do processo:', error);
      throw error;
    }
  }

  /**
   * Calcula durações agrupadas por status
   * @param timeline Array de entradas da timeline
   */
  private static calculateStatusDurations(timeline: TimelineEntry[]): StatusDuration[] {
    const statusMap = new Map<TrackingStatus, { total: number; entries: number }>();

    timeline.forEach(entry => {
      const duration = entry.duration_seconds || 0;
      const existing = statusMap.get(entry.status) || { total: 0, entries: 0 };
      
      statusMap.set(entry.status, {
        total: existing.total + duration,
        entries: existing.entries + 1
      });
    });

    return Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      total_seconds: data.total,
      entries: data.entries,
      average_seconds: data.entries > 0 ? Math.floor(data.total / data.entries) : 0
    }));
  }

  /**
   * Formata duração em segundos para formato legível
   * @param seconds Duração em segundos
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
  }

  /**
   * Obtém o tempo atual de um status ativo
   * @param recordId ID do registro
   */
  static async getCurrentStatusDuration(recordId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('status_timestamps')
        .select('entered_at')
        .eq('record_id', recordId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const enteredAt = new Date(data[0].entered_at);
        const now = new Date();
        return Math.floor((now.getTime() - enteredAt.getTime()) / 1000);
      }

      return 0;
    } catch (error) {
      console.error('Erro ao calcular duração atual:', error);
      return 0;
    }
  }

  /**
   * Valida se uma transição de status é permitida
   * @param currentStatus Status atual
   * @param newStatus Novo status desejado
   */
  static isValidTransition(currentStatus: TrackingStatus, newStatus: TrackingStatus): boolean {
    const { STATUS_CONFIGS } = require('../types/tracking');
    const config = STATUS_CONFIGS[currentStatus];
    return config ? config.allowedTransitions.includes(newStatus) : false;
  }
}