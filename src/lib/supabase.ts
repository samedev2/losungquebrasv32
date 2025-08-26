import { createClient } from '@supabase/supabase-js';
import { LogisticsRecord, StatusUpdate } from '../types/logistics';
import { StatusTimestamp } from '../types/tracking';
import { StatusCountService } from './statusCountService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing');
  console.log('VITE_SUPABASE_URL:', supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Database operations
export const logisticsService = {
  // Get all records
  async getRecords(): Promise<LogisticsRecord[]> {
    try {
      console.log('Fetching records from Supabase...');
      const { data, error } = await supabase
        .from('logistics_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        throw error;
      }
      
      console.log('Records fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch records:', error);
      throw error;
    }
  },

  // Create new record
  async createRecord(record: Partial<LogisticsRecord>): Promise<LogisticsRecord> {
    try {
      console.log('Creating new record:', record);
      
      // Ensure all required fields have default values
      const recordWithDefaults = {
        operator_name: '',
        vehicle_code: '',
        vehicle_profile: '',
        internal_prt: '',
        driver_name: '',
        truck_plate: '',
        trailer_plate: '',
        status: 'aguardando_tecnico',
        stopped_time: '',
        completion_time: '',
        technology: '',
        current_address: '',
        maps_link: '',
        occurrence_description: '',
        eta_origin_deadline: '',
        eta_origin_address: '',
        cpt_release_deadline: '',
        eta_destination_deadline: '',
        eta_destination_address: '',
        remaining_distance: '',
        arrival_prediction: '',
        new_arrival_prediction: '',
        original_message: '',
        ...record
      };

      const { data, error } = await supabase
        .from('logistics_records')
        .insert([recordWithDefaults])
        .select()
        .single();

      if (error) {
        console.error('Error creating record:', error);
        throw error;
      }
      
      console.log('Record created successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to create record:', error);
      throw error;
    }
  },

  // Update record status
  async updateRecordStatus(recordId: string, newStatus: string, updatedBy: string = 'System'): Promise<LogisticsRecord> {
    try {
      console.log(`Updating record ${recordId} status to ${newStatus}`);
      
      // Prepare update data
      const updateData: Partial<LogisticsRecord> = {
        status: newStatus as LogisticsRecord['status'],
        updated_at: new Date().toISOString()
      };

      // If status is resolved, calculate completion time
      if (newStatus === 'finalizado') {
        const { data: currentRecordData } = await supabase
          .from('logistics_records')
          .select('created_at')
          .eq('id', recordId)
          .single();
          
        if (currentRecordData) {
          const created = new Date(currentRecordData.created_at);
          const now = new Date();
          const diffMs = now.getTime() - created.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          updateData.completion_time = `${diffHours}h ${diffMinutes}m`;
        }
      }
      
      // If status is resolvido (legacy), also calculate completion time
      if (newStatus === 'resolvido') {
        const { data: currentRecordData } = await supabase
          .from('logistics_records')
          .select('created_at')
          .eq('id', recordId)
          .single();
          
        if (currentRecordData) {
        const created = new Date(currentRecordData.created_at);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        updateData.completion_time = `${diffHours}h ${diffMinutes}m`;
        }
      }

      // Update the record
      const { data, error } = await supabase
        .from('logistics_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating record:', error);
        throw error;
      }
      
      console.log('Record updated successfully:', data);


      return data;
    } catch (error) {
      console.error('Failed to update record status:', error);
      throw error;
    }
  },

  // Update any field in a record
  async updateRecord(recordId: string, updates: Partial<LogisticsRecord>): Promise<LogisticsRecord> {
    try {
      console.log(`Updating record ${recordId} with:`, updates);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('logistics_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating record:', error);
        throw error;
      }
      
      console.log('Record updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to update record:', error);
      throw error;
    }
  },

  // Delete a record
  async deleteRecord(recordId: string): Promise<void> {
    try {
      console.log(`Deleting record ${recordId}`);
      
      // Deletar registros relacionados primeiro
      await supabase.from('status_timestamps').delete().eq('record_id', recordId);
      await supabase.from('status_updates').delete().eq('record_id', recordId);
      await supabase.from('status_count_tracking').delete().eq('record_id', recordId);
      await supabase.from('occurrence_history').delete().eq('record_id', recordId);
      
      // Depois deletar o registro principal
      const { error } = await supabase
        .from('logistics_records')
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Erro ao deletar registro:', error);
        throw error;
      }
      
      console.log('Registro deletado com sucesso');
    } catch (error) {
      console.error('Failed to delete record:', error);
      throw error;
    }
  },

  // Delete multiple records
  async deleteMultipleRecords(recordIds: string[]): Promise<void> {
    try {
      console.log(`Deleting ${recordIds.length} records:`, recordIds);
      
      // Deletar em lotes para melhor performance
      await Promise.all([
        supabase.from('status_timestamps').delete().in('record_id', recordIds),
        supabase.from('status_updates').delete().in('record_id', recordIds),
        supabase.from('status_count_tracking').delete().in('record_id', recordIds),
        supabase.from('occurrence_history').delete().in('record_id', recordIds)
      ]);
      
      // Deletar registros principais
      const { error } = await supabase
        .from('logistics_records')
        .delete()
        .in('id', recordIds);

      if (error) {
        console.error('Erro ao deletar registros:', error);
        throw error;
      }
      
      console.log(`${recordIds.length} registros deletados com sucesso`);
    } catch (error) {
      console.error('Failed to delete multiple records:', error);
      throw error;
    }
  },

  // Get status updates for a record
  async getStatusUpdates(recordId: string): Promise<StatusUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('status_updates')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching status updates:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch status updates:', error);
      throw error;
    }
  },

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('logistics_records')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Connection test failed:', error);
        return false;
      }
      
      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  },

  // Tracking service methods
  async createStatusTimestamp(timestamp: Partial<StatusTimestamp>): Promise<StatusTimestamp> {
    try {
      const { data, error } = await supabase
        .from('status_timestamps')
        .insert([timestamp])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create status timestamp:', error);
      throw error;
    }
  },

  async getStatusTimestamps(recordId: string): Promise<StatusTimestamp[]> {
    try {
      const { data, error } = await supabase
        .from('status_timestamps')
        .select('*')
        .eq('record_id', recordId)
        .order('entered_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch status timestamps:', error);
      throw error;
    }
  },

  async updateStatusTimestamp(id: string, updates: Partial<StatusTimestamp>): Promise<StatusTimestamp> {
    try {
      const { data, error } = await supabase
        .from('status_timestamps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to update status timestamp:', error);
      throw error;
    }
  }
};