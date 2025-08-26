// Tipos para o sistema avançado de rastreamento de status
export interface StatusChangeRecord {
  id: string;
  record_id: string;
  sequence_number: number; // Contador sequencial de mudanças
  previous_status: string | null;
  new_status: string;
  operator_name: string;
  changed_at: string;
  duration_in_previous_status?: number; // Tempo em segundos no status anterior
  notes?: string;
  created_at: string;
}

export interface StatusTimeAnalysis {
  status: string;
  total_time_seconds: number;
  total_occurrences: number;
  average_time_seconds: number;
  min_time_seconds: number;
  max_time_seconds: number;
  percentage_of_total_time: number;
}

export interface ProcessTimelineAnalysis {
  record_id: string;
  vehicle_code: string;
  driver_name: string;
  operator_name: string;
  process_start: string;
  process_end?: string;
  total_process_time_seconds: number;
  total_status_changes: number;
  current_status: string;
  status_history: StatusChangeRecord[];
  time_analysis_by_status: StatusTimeAnalysis[];
  bottlenecks: {
    status: string;
    time_seconds: number;
    percentage: number;
    occurrence_number: number;
  }[];
  efficiency_metrics: {
    average_time_per_status: number;
    fastest_resolution_time: number;
    slowest_resolution_time: number;
    most_time_consuming_status: string;
    least_time_consuming_status: string;
  };
}

export interface StatusTransitionPattern {
  from_status: string;
  to_status: string;
  frequency: number;
  average_duration: number;
  typical_reasons: string[];
}

export interface ManagerialReport {
  period_start: string;
  period_end: string;
  total_processes: number;
  completed_processes: number;
  active_processes: number;
  average_completion_time: number;
  status_performance: StatusTimeAnalysis[];
  common_transition_patterns: StatusTransitionPattern[];
  efficiency_trends: {
    date: string;
    average_completion_time: number;
    total_processes: number;
  }[];
  recommendations: {
    type: 'bottleneck' | 'efficiency' | 'process';
    description: string;
    impact: 'high' | 'medium' | 'low';
    suggested_action: string;
  }[];
}