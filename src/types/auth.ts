export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  profile_type: ProfileType;
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
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type ProfileType = 'admin' | 'torre' | 'compras' | 'operacao' | 'monitoramento';

export interface ProfileConfig {
  label: string;
  description: string;
  features: string[];
  color: string;
  bgColor: string;
}

export const PROFILE_CONFIGS: Record<ProfileType, ProfileConfig> = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema e gerenciamento de usuários',
    features: ['Painel Administrativo', 'Gerenciar Usuários', 'Todos os Ambientes'],
    color: 'text-purple-800',
    bgColor: 'bg-purple-100'
  },
  torre: {
    label: 'Torre de Controle',
    description: 'Dashboard completo com roadmap e tracking temporal',
    features: ['Dashboard Completo', 'Roadmap Logístico', 'Tracking Temporal', 'Relatórios'],
    color: 'text-blue-800',
    bgColor: 'bg-blue-100'
  },
  compras: {
    label: 'Setor de Compras',
    description: 'Interface simplificada focada em processos de compra',
    features: ['Lista de Registros', 'Status Básicos', 'Relatórios de Compras'],
    color: 'text-green-800',
    bgColor: 'bg-green-100'
  },
  operacao: {
    label: 'Operação',
    description: 'Interface focada em operações e controle de campo',
    features: ['Controle Operacional', 'Status em Tempo Real', 'Comunicação'],
    color: 'text-orange-800',
    bgColor: 'bg-orange-100'
  },
  monitoramento: {
    label: 'Monitoramento',
    description: 'Interface focada em monitoramento e acompanhamento',
    features: ['Dashboard de Monitoramento', 'Alertas', 'Relatórios de Performance'],
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100'
  }
};