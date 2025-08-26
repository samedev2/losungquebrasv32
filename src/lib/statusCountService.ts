import { supabase } from './supabase';

export interface StatusCountEntry {
  id: string;
  record_id: string;
  count_sequence: number;
  previous_status?: string;
  new_status: string;
  operator_name: string;
  status_started_at: string;
  status_ended_at?: string;
  duration_seconds?: number;
  duration_hours?: number;
  notes?: string;
  is_current_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusBreakdown {
  status: string;
  total_time_seconds: number;
  total_time_hours: number;
  occurrences: number;
  average_time_seconds: number;
  average_time_hours: number;
  min_time_seconds: number;
  max_time_seconds: number;
  percentage_of_total: number;
}

export interface RecordStatusAnalysis {
  record_id: string;
  vehicle_code: string;
  driver_name: string;
  operator_name: string;
  process_started_at: string;
  current_status: string;
  total_process_time_seconds: number;
  total_process_time_hours: number;
  total_status_changes: number;
  status_breakdown: StatusBreakdown[];
  timeline: StatusCountEntry[];
  current_status_info: {
    status: string;
    operator_name: string;
    started_at: string;
    current_duration_seconds: number;
    current_duration_hours: number;
    count_sequence: number;
    notes?: string;
  };
}

export class StatusCountService {
  /**
   * Transiciona para um novo status com contagem automática
   */
  static async transitionStatus(
    recordId: string,
    newStatus: string,
    operatorName: string,
    notes: string = ''
  ): Promise<any> {
    try {
      console.log(`Transitioning status for record ${recordId} to ${newStatus} by ${operatorName}`);
      
      // Verificar se o registro existe
      const { data: recordExists, error: checkError } = await supabase
        .from('logistics_records')
        .select('id')
        .eq('id', recordId)
        .single();

      if (checkError || !recordExists) {
        console.error('Record not found:', checkError);
        throw new Error('Registro não encontrado');
      }
      
      // Primeiro, finalizar o status atual se existir
      const { data: currentStatus } = await supabase
        .from('status_count_tracking')
        .select('*')
        .eq('record_id', recordId)
        .eq('is_current_status', true)
        .order('count_sequence', { ascending: false })
        .limit(1);

      let nextSequence = 1;
      
      if (currentStatus && currentStatus.length > 0) {
        const current = currentStatus[0];
        nextSequence = current.count_sequence + 1;
        
        // Finalizar status atual
        const endTime = new Date().toISOString();
        const startTime = new Date(current.status_started_at);
        const durationSeconds = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 1000);
        const durationHours = durationSeconds / 3600;
        
        const { error: updateError } = await supabase
          .from('status_count_tracking')
          .update({
            status_ended_at: endTime,
            duration_seconds: durationSeconds,
            duration_hours: durationHours,
            is_current_status: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', current.id);
        
        if (updateError) {
          console.warn('Error updating current status:', updateError);
        }
      }
      
      // Criar novo status
      const { data: newStatusData, error } = await supabase
        .from('status_count_tracking')
        .insert([{
          record_id: recordId,
          count_sequence: nextSequence,
          previous_status: currentStatus && currentStatus.length > 0 ? currentStatus[0].new_status : null,
          new_status: newStatus,
          operator_name: operatorName,
          status_started_at: new Date().toISOString(),
          notes: notes,
          is_current_status: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating new status:', error);
        throw error;
      }


      console.log('Status transition successful:', newStatusData);
      return { success: true, data: newStatusData };
    } catch (error) {
      console.error('Error transitioning status:', error);
      throw error;
    }
  }

  /**
   * Obtém análise completa de um registro
   */
  static async getRecordAnalysis(recordId: string): Promise<RecordStatusAnalysis> {
    try {
      // Buscar informações do registro
      const { data: record, error: recordError } = await supabase
        .from('logistics_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (recordError) throw recordError;

      // Buscar timeline de status
      const { data: timeline, error: timelineError } = await supabase
        .from('status_count_tracking')
        .select('*')
        .eq('record_id', recordId)
        .order('count_sequence', { ascending: true });

      if (timelineError) throw timelineError;

      if (!timeline || timeline.length === 0) {
        throw new Error('Nenhum dado de status encontrado');
      }

      // Calcular tempo total do processo
      const processStart = new Date(record.created_at);
      const now = new Date();
      const totalProcessTimeSeconds = Math.floor((now.getTime() - processStart.getTime()) / 1000);
      const totalProcessTimeHours = totalProcessTimeSeconds / 3600;

      // Calcular breakdown por status
      const statusBreakdownMap = new Map<string, {
        totalSeconds: number;
        totalHours: number;
        occurrences: number;
        minSeconds: number;
        maxSeconds: number;
      }>();

      timeline.forEach(entry => {
        if (entry.duration_seconds !== null && entry.duration_seconds !== undefined) {
          const existing = statusBreakdownMap.get(entry.new_status) || {
            totalSeconds: 0,
            totalHours: 0,
            occurrences: 0,
            minSeconds: Infinity,
            maxSeconds: 0
          };
          
          existing.totalSeconds += entry.duration_seconds;
          existing.totalHours += entry.duration_hours || 0;
          existing.occurrences += 1;
          existing.minSeconds = Math.min(existing.minSeconds, entry.duration_seconds);
          existing.maxSeconds = Math.max(existing.maxSeconds, entry.duration_seconds);
          
          statusBreakdownMap.set(entry.new_status, existing);
        }
      });

      // Converter para array de breakdown
      const statusBreakdown: StatusBreakdown[] = Array.from(statusBreakdownMap.entries()).map(([status, data]) => ({
        status,
        total_time_seconds: data.totalSeconds,
        total_time_hours: data.totalHours,
        occurrences: data.occurrences,
        average_time_seconds: Math.floor(data.totalSeconds / data.occurrences),
        average_time_hours: data.totalHours / data.occurrences,
        min_time_seconds: data.minSeconds === Infinity ? 0 : data.minSeconds,
        max_time_seconds: data.maxSeconds,
        percentage_of_total: totalProcessTimeSeconds > 0 ? (data.totalSeconds / totalProcessTimeSeconds) * 100 : 0
      })).sort((a, b) => b.total_time_seconds - a.total_time_seconds);

      // Obter status atual
      const currentStatus = timeline.find(entry => entry.is_current_status);
      const currentStatusInfo = currentStatus ? {
        status: currentStatus.new_status,
        operator_name: currentStatus.operator_name,
        started_at: currentStatus.status_started_at,
        current_duration_seconds: Math.floor((now.getTime() - new Date(currentStatus.status_started_at).getTime()) / 1000),
        current_duration_hours: (now.getTime() - new Date(currentStatus.status_started_at).getTime()) / (1000 * 60 * 60),
        count_sequence: currentStatus.count_sequence,
        notes: currentStatus.notes
      } : {
        status: record.status,
        operator_name: record.operator_name,
        started_at: record.created_at,
        current_duration_seconds: totalProcessTimeSeconds,
        current_duration_hours: totalProcessTimeHours,
        count_sequence: 1,
        notes: ''
      };

      return {
        record_id: recordId,
        vehicle_code: record.vehicle_code,
        driver_name: record.driver_name,
        operator_name: record.operator_name,
        process_started_at: record.created_at,
        current_status: record.status,
        total_process_time_seconds: totalProcessTimeSeconds,
        total_process_time_hours: totalProcessTimeHours,
        total_status_changes: timeline.length,
        status_breakdown: statusBreakdown,
        timeline: timeline,
        current_status_info: currentStatusInfo
      };
    } catch (error) {
      console.error('Error getting record analysis:', error);
      throw error;
    }
  }

  /**
   * Obtém timeline de status de um registro
   */
  static async getStatusTimeline(recordId: string): Promise<StatusCountEntry[]> {
    try {
      const { data, error } = await supabase
        .from('status_count_tracking')
        .select('*')
        .eq('record_id', recordId)
        .order('count_sequence', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting status timeline:', error);
      throw error;
    }
  }

  /**
   * Obtém status atual de um registro
   */
  static async getCurrentStatus(recordId: string): Promise<StatusCountEntry | null> {
    try {
      const { data, error } = await supabase
        .from('status_count_tracking')
        .select('*')
        .eq('record_id', recordId)
        .eq('is_current_status', true)
        .order('count_sequence', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting current status:', error);
      throw error;
    }
  }

  /**
   * Inicializa o primeiro status de um registro
   */
  static async initializeFirstStatus(
    recordId: string,
    initialStatus: string,
    operatorName: string,
    notes: string = 'Status inicial do registro'
  ): Promise<StatusCountEntry> {
    try {
      const { data, error } = await supabase
        .from('status_count_tracking')
        .insert([{
          record_id: recordId,
          count_sequence: 1,
          previous_status: null,
          new_status: initialStatus,
          operator_name: operatorName,
          status_started_at: new Date().toISOString(),
          notes: notes,
          is_current_status: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing first status:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas gerais de todos os registros
   */
  static async getGeneralStats(startDate?: string, endDate?: string): Promise<{
    total_records: number;
    total_status_changes: number;
    average_process_time_hours: number;
    most_time_consuming_status: string;
    fastest_average_resolution_hours: number;
    slowest_average_resolution_hours: number;
  }> {
    try {
      let query = supabase
        .from('status_count_tracking')
        .select(`
          record_id,
          new_status,
          duration_hours,
          created_at
        `);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = data || [];
      const uniqueRecords = new Set(records.map(r => r.record_id)).size;
      const totalChanges = records.length;

      // Calcular estatísticas por status
      const statusStats = new Map<string, number[]>();
      records.forEach(record => {
        if (record.duration_hours) {
          const existing = statusStats.get(record.new_status) || [];
          existing.push(record.duration_hours);
          statusStats.set(record.new_status, existing);
        }
      });

      // Encontrar status que mais consome tempo
      let mostTimeConsumingStatus = '';
      let maxAverageTime = 0;
      let fastestResolution = Infinity;
      let slowestResolution = 0;

      statusStats.forEach((durations, status) => {
        const average = durations.reduce((a, b) => a + b, 0) / durations.length;
        if (average > maxAverageTime) {
          maxAverageTime = average;
          mostTimeConsumingStatus = status;
        }
        if (average < fastestResolution) {
          fastestResolution = average;
        }
        if (average > slowestResolution) {
          slowestResolution = average;
        }
      });

      // Calcular tempo médio de processo
      const processTimesByRecord = new Map<string, number>();
      records.forEach(record => {
        if (record.duration_hours) {
          const existing = processTimesByRecord.get(record.record_id) || 0;
          processTimesByRecord.set(record.record_id, existing + record.duration_hours);
        }
      });

      const averageProcessTime = processTimesByRecord.size > 0 ?
        Array.from(processTimesByRecord.values()).reduce((a, b) => a + b, 0) / processTimesByRecord.size :
        0;

      return {
        total_records: uniqueRecords,
        total_status_changes: totalChanges,
        average_process_time_hours: averageProcessTime,
        most_time_consuming_status: mostTimeConsumingStatus,
        fastest_average_resolution_hours: fastestResolution === Infinity ? 0 : fastestResolution,
        slowest_average_resolution_hours: slowestResolution
      };
    } catch (error) {
      console.error('Error getting general stats:', error);
      throw error;
    }
  }

  /**
   * Formata duração em horas para formato legível
   */
  static formatDurationHours(hours: number): string {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes}min`;
    } else if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.floor((hours - wholeHours) * 60);
      return `${wholeHours}h ${minutes}min`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
  }

  /**
   * Formata duração em segundos para formato legível
   */
  static formatDurationSeconds(seconds: number): string {
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
}