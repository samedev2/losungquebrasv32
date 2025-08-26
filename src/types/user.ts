export interface User {
  id: string;
  email: string;
  full_name: string;
  user_type: UserType;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type UserType = 'admin' | 'compras' | 'operacao' | 'monitoramento';
export type UserType = 'admin' | 'torre' | 'compras' | 'operacao' | 'monitoramento';

export interface UserPermissions {
  canDelete: boolean;
  canEdit: boolean;
  canCreateInputs: boolean;
  canChangeStatus: boolean;
  canManageOccurrences: boolean;
  canViewDashboard: boolean;
  canManageUsers: boolean;
}

export const USER_TYPE_CONFIGS: Record<UserType, {
  label: string;
  description: string;
  permissions: UserPermissions;
  color: string;
  bgColor: string;
}> = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema',
    permissions: {
      canDelete: true,
      canEdit: true,
      canCreateInputs: true,
      canChangeStatus: true,
      canManageOccurrences: true,
      canViewDashboard: true,
      canManageUsers: true
    },
    color: 'text-purple-800',
    bgColor: 'bg-purple-100'
  },
  torre: {
    label: 'Torre de Controle',
    description: 'Dashboard completo com roadmap e tracking temporal',
    permissions: {
      canDelete: false,
      canEdit: true,
      canCreateInputs: true,
      canChangeStatus: true,
      canManageOccurrences: true,
      canViewDashboard: true,
      canManageUsers: false
    },
    color: 'text-blue-800',
    bgColor: 'bg-blue-100'
  },
  compras: {
    label: 'Setor de Compras',
    description: 'Inputs e alteração de status/ocorrências',
    permissions: {
      canDelete: false,
      canEdit: false,
      canCreateInputs: true,
      canChangeStatus: true,
      canManageOccurrences: true,
      canViewDashboard: true,
      canManageUsers: false
    },
    color: 'text-green-800',
    bgColor: 'bg-green-100'
  },
  operacao: {
    label: 'Setor de Operação',
    description: 'Inputs e alteração de status/ocorrências',
    permissions: {
      canDelete: false,
      canEdit: false,
      canCreateInputs: true,
      canChangeStatus: true,
      canManageOccurrences: true,
      canViewDashboard: true,
      canManageUsers: false
    },
    color: 'text-blue-800',
    bgColor: 'bg-blue-100'
  },
  monitoramento: {
    label: 'Setor de Monitoramento',
    description: 'Inputs e alteração de status/ocorrências',
    permissions: {
      canDelete: false,
      canEdit: false,
      canCreateInputs: true,
      canChangeStatus: true,
      canManageOccurrences: true,
      canViewDashboard: true,
      canManageUsers: false
    },
    color: 'text-orange-800',
    bgColor: 'bg-orange-100'
  }
};

export interface OccurrenceHistoryEntry {
  id: string;
  record_id: string;
  occurrence_title: string;
  occurrence_description: string;
  occurrence_category: string;
  priority_level: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada';
  created_by: string;
  resolved_by?: string;
  created_at: string;
  resolved_at?: string;
  duration_hours: number;
  notes?: string;
}

export interface OccurrenceSummary {
  record_id: string;
  vehicle_code: string;
  driver_name: string;
  operator_name: string;
  record_status: string;
  record_created_at: string;
  total_occurrences: number;
  open_occurrences: number;
  resolved_occurrences: number;
  total_occurrence_hours: number;
  first_occurrence_at?: string;
  last_resolved_at?: string;
}