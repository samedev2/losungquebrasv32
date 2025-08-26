import { supabase } from './supabase';
import { StatusChangeRecord, ProcessTimelineAnalysis, StatusTimeAnalysis, ManagerialReport } from '../types/statusTracking';
import { LogisticsRecord } from '../types/logistics';

export class StatusTrackingService {
  /**
   * Registra uma mudança de status com contagem sequencial e cálculo de tempo
   */
  static async recordStatusChange(
    recordId: string,
    previousStatus: string | null,
    newStatus: string,
    operatorName: string,
    notes?: string
  ): Promise<StatusChangeRecord> {
    try {
      // Buscar o último registro de mudança para obter o número sequencial
      const { data: lastChange } = await supabase
        .from('status_updates')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false })
        .limit(1);

      const sequenceNumber = lastChange && lastChange.length > 0 ? 
        (lastChange[0].sequence_number || 0) + 1 : 1;

      // Calcular duração no status anterior se existir
      let durationInPreviousStatus: number | undefined;
      if (lastChange && lastChange.length > 0 && previousStatus) {
        const lastChangeTime = new Date(lastChange[0].created_at);
        const currentTime = new Date();
        durationInPreviousStatus = Math.floor((currentTime.getTime() - lastChangeTime.getTime()) / 1000);
      }

      // Criar registro de mudança
      const statusChange: Partial<StatusChangeRecord> = {
        record_id: recordId,
        sequence_number: sequenceNumber,
        previous_status: previousStatus,
        new_status: newStatus,
        operator_name: operatorName,
        changed_at: new Date().toISOString(),
        duration_in_previous_status: durationInPreviousStatus,
        notes: notes || '',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('status_updates')
        .insert([statusChange])
        .select()
        .single();

      if (error) throw error;

      console.log(`Status change recorded: ${previousStatus} → ${newStatus} (Sequence: ${sequenceNumber})`);
      return data;
    } catch (error) {
      console.error('Error recording status change:', error);
      throw error;
    }
  }

  /**
   * Obtém análise completa da timeline de um processo
   */
  static async getProcessTimelineAnalysis(recordId: string): Promise<ProcessTimelineAnalysis | null> {
    try {
      // Buscar informações do registro
      const { data: record, error: recordError } = await supabase
        .from('logistics_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (recordError) throw recordError;

      // Buscar histórico de mudanças de status
      const { data: statusHistory, error: historyError } = await supabase
        .from('status_updates')
        .select('*')
        .eq('record_id', recordId)
        .order('sequence_number', { ascending: true });

      if (historyError) throw historyError;

      if (!statusHistory || statusHistory.length === 0) {
        return null;
      }

      // Calcular tempo total do processo
      const processStart = new Date(record.created_at);
      const processEnd = record.status === 'finalizado' || record.status === 'resolvido' ? 
        new Date(record.updated_at) : null;
      const totalProcessTime = processEnd ? 
        Math.floor((processEnd.getTime() - processStart.getTime()) / 1000) :
        Math.floor((new Date().getTime() - processStart.getTime()) / 1000);

      // Analisar tempo por status
      const statusTimeMap = new Map<string, {
        totalTime: number;
        occurrences: number;
        times: number[];
      }>();

      statusHistory.forEach((change, index) => {
        if (change.duration_in_previous_status && change.previous_status) {
          const existing = statusTimeMap.get(change.previous_status) || {
            totalTime: 0,
            occurrences: 0,
            times: []
          };
          
          existing.totalTime += change.duration_in_previous_status;
          existing.occurrences += 1;
          existing.times.push(change.duration_in_previous_status);
          
          statusTimeMap.set(change.previous_status, existing);
        }
      });

      // Calcular tempo no status atual se não finalizado
      if (!processEnd && statusHistory.length > 0) {
        const lastChange = statusHistory[statusHistory.length - 1];
        const currentStatusTime = Math.floor((new Date().getTime() - new Date(lastChange.changed_at).getTime()) / 1000);
        
        const existing = statusTimeMap.get(lastChange.new_status) || {
          totalTime: 0,
          occurrences: 0,
          times: []
        };
        
        existing.totalTime += currentStatusTime;
        existing.occurrences += 1;
        existing.times.push(currentStatusTime);
        
        statusTimeMap.set(lastChange.new_status, existing);
      }

      // Converter para análise de tempo por status
      const timeAnalysisByStatus: StatusTimeAnalysis[] = Array.from(statusTimeMap.entries()).map(([status, data]) => ({
        status,
        total_time_seconds: data.totalTime,
        total_occurrences: data.occurrences,
        average_time_seconds: Math.floor(data.totalTime / data.occurrences),
        min_time_seconds: Math.min(...data.times),
        max_time_seconds: Math.max(...data.times),
        percentage_of_total_time: totalProcessTime > 0 ? (data.totalTime / totalProcessTime) * 100 : 0
      })).sort((a, b) => b.total_time_seconds - a.total_time_seconds);

      // Identificar gargalos (top 3 status que mais consomem tempo)
      const bottlenecks = timeAnalysisByStatus.slice(0, 3).map((analysis, index) => {
        // Encontrar em qual ocorrência esse status demorou mais
        const statusChanges = statusHistory.filter(change => 
          change.previous_status === analysis.status || change.new_status === analysis.status
        );
        
        return {
          status: analysis.status,
          time_seconds: analysis.max_time_seconds,
          percentage: analysis.percentage_of_total_time,
          occurrence_number: statusChanges.length > 0 ? statusChanges[0].sequence_number : 1
        };
      });

      // Calcular métricas de eficiência
      const statusTimes = timeAnalysisByStatus.map(s => s.average_time_seconds).filter(t => t > 0);
      const efficiencyMetrics = {
        average_time_per_status: statusTimes.length > 0 ? Math.floor(statusTimes.reduce((a, b) => a + b, 0) / statusTimes.length) : 0,
        fastest_resolution_time: statusTimes.length > 0 ? Math.min(...statusTimes) : 0,
        slowest_resolution_time: statusTimes.length > 0 ? Math.max(...statusTimes) : 0,
        most_time_consuming_status: timeAnalysisByStatus.length > 0 ? timeAnalysisByStatus[0].status : '',
        least_time_consuming_status: timeAnalysisByStatus.length > 0 ? timeAnalysisByStatus[timeAnalysisByStatus.length - 1].status : ''
      };

      return {
        record_id: recordId,
        vehicle_code: record.vehicle_code,
        driver_name: record.driver_name,
        operator_name: record.operator_name,
        process_start: record.created_at,
        process_end: processEnd?.toISOString(),
        total_process_time_seconds: totalProcessTime,
        total_status_changes: statusHistory.length,
        current_status: record.status,
        status_history: statusHistory,
        time_analysis_by_status: timeAnalysisByStatus,
        bottlenecks,
        efficiency_metrics
      };
    } catch (error) {
      console.error('Error getting process timeline analysis:', error);
      throw error;
    }
  }

  /**
   * Gera relatório gerencial com análises e recomendações
   */
  static async generateManagerialReport(
    startDate: string,
    endDate: string
  ): Promise<ManagerialReport> {
    try {
      // Buscar todos os registros do período
      const { data: records, error: recordsError } = await supabase
        .from('logistics_records')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      // Buscar todas as mudanças de status do período
      const { data: statusChanges, error: changesError } = await supabase
        .from('status_updates')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (changesError) throw changesError;

      const totalProcesses = records?.length || 0;
      const completedProcesses = records?.filter(r => r.status === 'finalizado' || r.status === 'resolvido').length || 0;
      const activeProcesses = totalProcesses - completedProcesses;

      // Calcular tempo médio de conclusão
      const completedRecords = records?.filter(r => r.status === 'finalizado' || r.status === 'resolvido') || [];
      const completionTimes = completedRecords.map(record => {
        const start = new Date(record.created_at);
        const end = new Date(record.updated_at);
        return Math.floor((end.getTime() - start.getTime()) / 1000);
      });
      const averageCompletionTime = completionTimes.length > 0 ? 
        Math.floor(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) : 0;

      // Analisar performance por status
      const statusPerformanceMap = new Map<string, {
        totalTime: number;
        occurrences: number;
        times: number[];
      }>();

      statusChanges?.forEach(change => {
        if (change.duration_in_previous_status && change.previous_status) {
          const existing = statusPerformanceMap.get(change.previous_status) || {
            totalTime: 0,
            occurrences: 0,
            times: []
          };
          
          existing.totalTime += change.duration_in_previous_status;
          existing.occurrences += 1;
          existing.times.push(change.duration_in_previous_status);
          
          statusPerformanceMap.set(change.previous_status, existing);
        }
      });

      const statusPerformance: StatusTimeAnalysis[] = Array.from(statusPerformanceMap.entries()).map(([status, data]) => ({
        status,
        total_time_seconds: data.totalTime,
        total_occurrences: data.occurrences,
        average_time_seconds: Math.floor(data.totalTime / data.occurrences),
        min_time_seconds: Math.min(...data.times),
        max_time_seconds: Math.max(...data.times),
        percentage_of_total_time: 0 // Será calculado depois
      }));

      // Calcular percentuais
      const totalTime = statusPerformance.reduce((sum, s) => sum + s.total_time_seconds, 0);
      statusPerformance.forEach(s => {
        s.percentage_of_total_time = totalTime > 0 ? (s.total_time_seconds / totalTime) * 100 : 0;
      });

      // Gerar recomendações baseadas nos dados
      const recommendations = this.generateRecommendations(statusPerformance, averageCompletionTime, activeProcesses);

      return {
        period_start: startDate,
        period_end: endDate,
        total_processes: totalProcesses,
        completed_processes: completedProcesses,
        active_processes: activeProcesses,
        average_completion_time: averageCompletionTime,
        status_performance: statusPerformance.sort((a, b) => b.total_time_seconds - a.total_time_seconds),
        common_transition_patterns: [], // Implementar se necessário
        efficiency_trends: [], // Implementar se necessário
        recommendations
      };
    } catch (error) {
      console.error('Error generating managerial report:', error);
      throw error;
    }
  }

  /**
   * Gera recomendações baseadas na análise dos dados
   */
  private static generateRecommendations(
    statusPerformance: StatusTimeAnalysis[],
    averageCompletionTime: number,
    activeProcesses: number
  ) {
    const recommendations: ManagerialReport['recommendations'] = [];

    // Identificar gargalos
    const topBottleneck = statusPerformance[0];
    if (topBottleneck && topBottleneck.percentage_of_total_time > 40) {
      recommendations.push({
        type: 'bottleneck',
        description: `O status "${topBottleneck.status}" consome ${topBottleneck.percentage_of_total_time.toFixed(1)}% do tempo total dos processos`,
        impact: 'high',
        suggested_action: `Revisar e otimizar o processo relacionado ao status "${topBottleneck.status}". Considerar adicionar mais recursos ou melhorar procedimentos.`
      });
    }

    // Analisar eficiência geral
    if (averageCompletionTime > 24 * 3600) { // Mais de 24 horas
      recommendations.push({
        type: 'efficiency',
        description: `Tempo médio de conclusão está em ${Math.floor(averageCompletionTime / 3600)} horas, acima do ideal`,
        impact: 'medium',
        suggested_action: 'Implementar melhorias nos processos mais demorados e considerar automação de tarefas repetitivas.'
      });
    }

    // Analisar carga de trabalho
    if (activeProcesses > 20) {
      recommendations.push({
        type: 'process',
        description: `${activeProcesses} processos ativos podem indicar sobrecarga operacional`,
        impact: 'medium',
        suggested_action: 'Considerar aumentar a equipe ou redistribuir a carga de trabalho para melhorar a eficiência.'
      });
    }

    return recommendations;
  }

  /**
   * Formata duração em segundos para formato legível
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
   * Obtém estatísticas rápidas de um registro
   */
  static async getRecordQuickStats(recordId: string): Promise<{
    totalChanges: number;
    currentStatusDuration: number;
    totalProcessTime: number;
  }> {
    try {
      const { data: changes } = await supabase
        .from('status_updates')
        .select('*')
        .eq('record_id', recordId)
        .order('sequence_number', { ascending: false });

      const { data: record } = await supabase
        .from('logistics_records')
        .select('created_at, updated_at')
        .eq('id', recordId)
        .single();

      const totalChanges = changes?.length || 0;
      const lastChange = changes?.[0];
      const currentStatusDuration = lastChange ? 
        Math.floor((new Date().getTime() - new Date(lastChange.changed_at).getTime()) / 1000) : 0;
      
      const totalProcessTime = record ? 
        Math.floor((new Date().getTime() - new Date(record.created_at).getTime()) / 1000) : 0;

      return {
        totalChanges,
        currentStatusDuration,
        totalProcessTime
      };
    } catch (error) {
      console.error('Error getting record quick stats:', error);
      return {
        totalChanges: 0,
        currentStatusDuration: 0,
        totalProcessTime: 0
      };
    }
  }
}