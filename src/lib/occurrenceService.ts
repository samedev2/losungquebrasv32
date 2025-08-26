import { supabase } from './supabase';
import { OccurrenceHistoryEntry, OccurrenceSummary } from '../types/user';

export class OccurrenceService {
  /**
   * Adiciona uma nova ocorrência ao histórico
   */
  static async addOccurrence(
    recordId: string,
    title: string,
    description: string,
    category: string = 'geral',
    priority: string = 'media',
    createdBy: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('occurrence_history')
        .insert([{
          record_id: recordId,
          occurrence_title: title,
          occurrence_description: description,
          occurrence_category: category,
          priority_level: priority,
          status: 'aberta',
          created_by: createdBy,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Erro ao adicionar ocorrência:', error);
      throw error;
    }
  }

  /**
   * Resolve uma ocorrência
   */
  static async resolveOccurrence(
    occurrenceId: string,
    resolvedBy: string,
    notes: string = ''
  ): Promise<boolean> {
    try {
      // Calcular duração
      const { data: occurrence } = await supabase
        .from('occurrence_history')
        .select('created_at')
        .eq('id', occurrenceId)
        .single();

      let durationHours = 0;
      if (occurrence) {
        durationHours = (new Date().getTime() - new Date(occurrence.created_at).getTime()) / (1000 * 60 * 60);
      }

      const { data, error } = await supabase
        .from('occurrence_history')
        .update({
          status: 'resolvida',
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          duration_hours: durationHours,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', occurrenceId)
        .select()
        .single();

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao resolver ocorrência:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as ocorrências de um registro
   */
  static async getOccurrencesByRecord(recordId: string): Promise<OccurrenceHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('occurrence_history')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar ocorrências:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo de ocorrências por registro
   */
  static async getOccurrenceSummary(recordId?: string): Promise<OccurrenceSummary[]> {
    try {
      let query = supabase.from('occurrence_summary').select('*');
      
      if (recordId) {
        query = query.eq('record_id', recordId);
      }

      const { data, error } = await query.order('record_created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar resumo de ocorrências:', error);
      throw error;
    }
  }

  /**
   * Obtém total de horas de ocorrências para um registro
   */
  static async getTotalOccurrenceHours(recordId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('occurrence_history')
        .select('duration_hours')
        .eq('record_id', recordId)
        .eq('status', 'resolvida');

      if (error) throw error;
      
      const totalHours = (data || []).reduce((sum, occ) => sum + (occ.duration_hours || 0), 0);
      return totalHours;
    } catch (error) {
      console.error('Erro ao calcular total de horas:', error);
      return 0;
    }
  }

  /**
   * Atualiza status de uma ocorrência
   */
  static async updateOccurrenceStatus(
    occurrenceId: string,
    newStatus: 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada',
    updatedBy: string
  ): Promise<OccurrenceHistoryEntry> {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolvida') {
        // Calcular duração se estiver resolvendo
        const { data: occurrence } = await supabase
          .from('occurrence_history')
          .select('created_at')
          .eq('id', occurrenceId)
          .single();

        if (occurrence) {
          const durationHours = (new Date().getTime() - new Date(occurrence.created_at).getTime()) / (1000 * 60 * 60);
          updateData.resolved_at = new Date().toISOString();
          updateData.resolved_by = updatedBy;
          updateData.duration_hours = durationHours;
        }
      }

      const { data, error } = await supabase
        .from('occurrence_history')
        .update(updateData)
        .eq('id', occurrenceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar status da ocorrência:', error);
      throw error;
    }
  }

  /**
   * Formata duração em horas para exibição
   */
  static formatDuration(hours: number): string {
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
}