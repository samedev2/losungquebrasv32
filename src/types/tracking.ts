// Tipos para o sistema de rastreamento temporal
export interface StatusTimestamp {
  id: string;
  record_id: string;
  status: TrackingStatus;
  operator_name: string;
  entered_at: string;
  exited_at?: string;
  duration_seconds?: number;
  notes?: string;
  created_at: string;
}

export interface StatusDuration {
  status: TrackingStatus;
  total_seconds: number;
  entries: number;
  average_seconds: number;
}

export interface TimelineEntry {
  id: string;
  status: TrackingStatus;
  operator_name: string;
  entered_at: string;
  exited_at?: string;
  duration_seconds?: number;
  notes?: string;
  is_current: boolean;
}

export interface ProcessSummary {
  record_id: string;
  vehicle_code: string;
  total_process_time: number;
  current_status: TrackingStatus;
  status_durations: StatusDuration[];
  timeline: TimelineEntry[];
  bottlenecks: {
    status: TrackingStatus;
    duration_seconds: number;
    percentage: number;
  }[];
}

export type TrackingStatus = 
  | 'aguardando_tecnico'
  | 'aguardando_mecanico'
  | 'manutencao_sem_previsao'
  | 'sem_previsao'
  | 'transbordo_troca_cavalo'
  | 'transbordo_em_andamento'
  | 'transbordo_finalizado'
  | 'reinicio_viagem'
  | 'finalizado';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  category: 'inicial' | 'intermediario' | 'transbordo' | 'final';
  allowedTransitions: TrackingStatus[];
}

export const STATUS_CONFIGS: Record<TrackingStatus, StatusConfig> = {
  aguardando_tecnico: {
    label: 'Aguardando Técnico',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: '🔧',
    category: 'inicial',
    allowedTransitions: ['aguardando_mecanico', 'manutencao_sem_previsao', 'transbordo_troca_cavalo']
  },
  aguardando_mecanico: {
    label: 'Aguardando Mecânico',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100 border-orange-200',
    icon: '⚙️',
    category: 'inicial',
    allowedTransitions: ['manutencao_sem_previsao', 'transbordo_troca_cavalo']
  },
  manutencao_sem_previsao: {
    label: 'Manutenção',
    color: 'text-red-800',
    bgColor: 'bg-red-100 border-red-200',
    icon: '🔨',
    category: 'intermediario',
    allowedTransitions: ['transbordo_troca_cavalo', 'transbordo_em_andamento', 'reinicio_viagem']
  },
  sem_previsao: {
    label: 'Sem Previsão',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: '❓',
    category: 'intermediario',
    allowedTransitions: ['aguardando_tecnico', 'aguardando_mecanico', 'manutencao_sem_previsao', 'transbordo_troca_cavalo', 'reinicio_viagem']
  },
  transbordo_troca_cavalo: {
    label: 'Transbordo - Troca de Cavalo',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: '🚛',
    category: 'transbordo',
    allowedTransitions: ['transbordo_em_andamento', 'reinicio_viagem']
  },
  transbordo_em_andamento: {
    label: 'Transbordo em Andamento',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100 border-indigo-200',
    icon: '📦',
    category: 'transbordo',
    allowedTransitions: ['transbordo_finalizado', 'reinicio_viagem']
  },
  transbordo_finalizado: {
    label: 'Transbordo Finalizado',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100 border-purple-200',
    icon: '✅',
    category: 'transbordo',
    allowedTransitions: ['reinicio_viagem']
  },
  reinicio_viagem: {
    label: 'Reinício de Viagem',
    color: 'text-green-800',
    bgColor: 'bg-green-100 border-green-200',
    icon: '🚀',
    category: 'final',
    allowedTransitions: ['finalizado']
  },
  finalizado: {
    label: 'Finalizado',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: '🏁',
    category: 'final',
    allowedTransitions: []
  }
};