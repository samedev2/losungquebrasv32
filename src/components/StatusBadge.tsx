import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Settings, Truck, Wrench, Hammer, Package, Rocket, Flag } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  parado: {
    label: 'Parado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
    animation: 'animate-pulse'
  },
  em_transito: {
    label: 'Em Trânsito',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Truck,
    animation: 'animate-bounce'
  },
  resolvido: {
    label: 'Resolvido',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    animation: 'animate-pulse'
  },
  aguardando_tecnico: {
    label: 'Aguardando Técnico',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    animation: 'animate-spin'
  },
  em_manutencao: {
    label: 'Em Manutenção',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Settings,
    animation: 'animate-spin'
  },
  aguardando_tecnico: {
    label: 'Aguardando Técnico',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Wrench,
    animation: 'animate-pulse'
  },
  aguardando_mecanico: {
    label: 'Aguardando Mecânico',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Settings,
    animation: 'animate-pulse'
  },
  manutencao_sem_previsao: {
    label: 'Manutenção',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Hammer,
    animation: 'animate-bounce'
  },
  sem_previsao: {
    label: 'Sem Previsão',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock,
    animation: 'animate-pulse'
  },
  transbordo_troca_cavalo: {
    label: 'Transbordo - Troca de Cavalo',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Truck,
    animation: 'animate-bounce'
  },
  transbordo_em_andamento: {
    label: 'Transbordo em Andamento',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Package,
    animation: 'animate-bounce'
  },
  transbordo_finalizado: {
    label: 'Transbordo Finalizado',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: CheckCircle,
    animation: 'animate-pulse'
  },
  reinicio_viagem: {
    label: 'Reinício de Viagem',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Rocket,
    animation: 'animate-bounce'
  },
  finalizado: {
    label: 'Finalizado',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Flag,
    animation: 'animate-pulse'
  }
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-300 hover:scale-105 hover:shadow-md ${config.color} ${sizeClasses[size]}`}>
      <Icon 
        size={iconSizes[size]} 
        className={`${config.animation} ${status === 'aguardando_tecnico' || status === 'em_manutencao' ? 'animate-spin' : ''}`}
        style={{
          animationDuration: status === 'parado' ? '2s' : 
                           status === 'em_transito' ? '1s' : 
                           status === 'resolvido' ? '3s' : 
                           status === 'aguardando_tecnico' ? '2s' : 
                           status === 'em_manutencao' ? '1.5s' : '1s'
        }}
      />
      {config.label}
    </span>
  );
}