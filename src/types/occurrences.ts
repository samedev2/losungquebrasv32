// Tipos para o sistema de múltiplas ocorrências
export interface Occurrence {
  id: string;
  record_id: string;
  title: string;
  description: string;
  category: OccurrenceCategory;
  priority: OccurrencePriority;
  status: OccurrenceStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface OccurrenceTimeline {
  id: string;
  occurrence_id: string;
  action_type: TimelineActionType;
  description: string;
  created_by: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export type OccurrenceCategory = 
  | 'mecanica'
  | 'eletrica'
  | 'pneu'
  | 'combustivel'
  | 'documentacao'
  | 'carga'
  | 'rota'
  | 'clima'
  | 'acidente'
  | 'outros';

export type OccurrencePriority = 'baixa' | 'media' | 'alta' | 'critica';

export type OccurrenceStatus = 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada';

export type TimelineActionType = 
  | 'criada'
  | 'atualizada'
  | 'comentario'
  | 'status_alterado'
  | 'prioridade_alterada'
  | 'resolvida'
  | 'cancelada';

export interface OccurrenceConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const OCCURRENCE_CATEGORIES: Record<OccurrenceCategory, OccurrenceConfig> = {
  mecanica: {
    label: 'Mecânica',
    color: 'text-red-800',
    bgColor: 'bg-red-100 border-red-200',
    icon: '🔧',
    description: 'Problemas mecânicos do veículo'
  },
  eletrica: {
    label: 'Elétrica',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: '⚡',
    description: 'Problemas elétricos e eletrônicos'
  },
  pneu: {
    label: 'Pneu',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: '🛞',
    description: 'Problemas com pneus e rodas'
  },
  combustivel: {
    label: 'Combustível',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: '⛽',
    description: 'Problemas relacionados a combustível'
  },
  documentacao: {
    label: 'Documentação',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100 border-purple-200',
    icon: '📋',
    description: 'Problemas documentais e burocráticos'
  },
  carga: {
    label: 'Carga',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100 border-orange-200',
    icon: '📦',
    description: 'Problemas com a carga transportada'
  },
  rota: {
    label: 'Rota',
    color: 'text-green-800',
    bgColor: 'bg-green-100 border-green-200',
    icon: '🗺️',
    description: 'Problemas de rota e navegação'
  },
  clima: {
    label: 'Clima',
    color: 'text-cyan-800',
    bgColor: 'bg-cyan-100 border-cyan-200',
    icon: '🌦️',
    description: 'Problemas relacionados ao clima'
  },
  acidente: {
    label: 'Acidente',
    color: 'text-red-800',
    bgColor: 'bg-red-100 border-red-200',
    icon: '🚨',
    description: 'Acidentes e emergências'
  },
  outros: {
    label: 'Outros',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: '❓',
    description: 'Outras ocorrências não categorizadas'
  }
};

export const PRIORITY_CONFIGS: Record<OccurrencePriority, OccurrenceConfig> = {
  baixa: {
    label: 'Baixa',
    color: 'text-green-800',
    bgColor: 'bg-green-100 border-green-200',
    icon: '🟢',
    description: 'Prioridade baixa'
  },
  media: {
    label: 'Média',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: '🟡',
    description: 'Prioridade média'
  },
  alta: {
    label: 'Alta',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100 border-orange-200',
    icon: '🟠',
    description: 'Prioridade alta'
  },
  critica: {
    label: 'Crítica',
    color: 'text-red-800',
    bgColor: 'bg-red-100 border-red-200',
    icon: '🔴',
    description: 'Prioridade crítica'
  }
};

export const STATUS_CONFIGS: Record<OccurrenceStatus, OccurrenceConfig> = {
  aberta: {
    label: 'Aberta',
    color: 'text-red-800',
    bgColor: 'bg-red-100 border-red-200',
    icon: '🔓',
    description: 'Ocorrência em aberto'
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: '⏳',
    description: 'Ocorrência sendo tratada'
  },
  resolvida: {
    label: 'Resolvida',
    color: 'text-green-800',
    bgColor: 'bg-green-100 border-green-200',
    icon: '✅',
    description: 'Ocorrência resolvida'
  },
  cancelada: {
    label: 'Cancelada',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: '❌',
    description: 'Ocorrência cancelada'
  }
};