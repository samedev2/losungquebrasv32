import React, { useState, useMemo } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { STATUS_CONFIGS } from '../types/tracking';
import { 
  BarChart3, 
  Filter, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Truck,
  User,
  Calendar,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';

interface StatusFilterDashboardProps {
  records: LogisticsRecord[];
  onStatusFilter: (status: string | null) => void;
  selectedStatus: string | null;
  onRecordSelect?: (recordId: string) => void;
  onOpenTracking?: (recordId: string) => void;
}

interface StatusStats {
  status: string;
  count: number;
  percentage: number;
  avgTimeHours: number;
  oldestRecord?: LogisticsRecord;
  newestRecord?: LogisticsRecord;
  criticalCount: number;
}

export function StatusFilterDashboard({ 
  records, 
  onStatusFilter, 
  selectedStatus,
  onRecordSelect,
  onOpenTracking 
}: StatusFilterDashboardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  // Calcular estatísticas por status
  const statusStats = useMemo(() => {
    const stats: Record<string, StatusStats> = {};
    const totalRecords = records.length;

    // Inicializar todos os status
    Object.keys(STATUS_CONFIGS).forEach(status => {
      stats[status] = {
        status,
        count: 0,
        percentage: 0,
        avgTimeHours: 0,
        criticalCount: 0
      };
    });

    // Calcular estatísticas
    records.forEach(record => {
      const status = record.status;
      if (stats[status]) {
        stats[status].count++;
        
        // Calcular tempo desde criação
        const createdTime = new Date(record.created_at);
        const now = new Date();
        const timeHours = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
        
        // Verificar se é crítico (mais de 30 minutos e não resolvido)
        if (timeHours > 0.5 && status !== 'finalizado' && status !== 'resolvido') {
          stats[status].criticalCount++;
        }
        
        // Atualizar tempo médio
        const currentAvg = stats[status].avgTimeHours;
        const currentCount = stats[status].count;
        stats[status].avgTimeHours = ((currentAvg * (currentCount - 1)) + timeHours) / currentCount;
        
        // Atualizar registros mais antigo e mais novo
        if (!stats[status].oldestRecord || createdTime < new Date(stats[status].oldestRecord!.created_at)) {
          stats[status].oldestRecord = record;
        }
        if (!stats[status].newestRecord || createdTime > new Date(stats[status].newestRecord!.created_at)) {
          stats[status].newestRecord = record;
        }
      }
    });

    // Calcular percentuais
    Object.values(stats).forEach(stat => {
      stat.percentage = totalRecords > 0 ? (stat.count / totalRecords) * 100 : 0;
    });

    return Object.values(stats).filter(stat => stat.count > 0);
  }, [records]);

  // Estatísticas gerais
  const generalStats = useMemo(() => {
    const total = records.length;
    const active = records.filter(r => r.status !== 'finalizado' && r.status !== 'resolvido').length;
    const resolved = records.filter(r => r.status === 'finalizado' || r.status === 'resolvido').length;
    const critical = records.filter(r => {
      const timeHours = (new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
      return timeHours > 0.5 && r.status !== 'finalizado' && r.status !== 'resolvido';
    }).length;
    const transbordo = records.filter(r => 
      r.status.includes('transbordo')
    ).length;

    return { total, active, resolved, critical, transbordo };
  }, [records]);

  const formatTimeHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
  };

  const getStatusIcon = (status: string) => {
    const config = STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS];
    return config?.icon || '⚡';
  };

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS];
    return config?.bgColor || 'bg-gray-100';
  };

  const getStatusTextColor = (status: string) => {
    const config = STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS];
    return config?.color || 'text-gray-800';
  };

  const handleStatusClick = (status: string) => {
    if (selectedStatus === status) {
      onStatusFilter(null); // Deselecionar se já estiver selecionado
    } else {
      onStatusFilter(status);
    }
  };

  const getFilteredRecords = (status: string) => {
    return records.filter(record => record.status === status);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Dashboard de Status
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Clique em qualquer status para filtrar os registros
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
            </button>
            {selectedStatus && (
              <button
                onClick={() => onStatusFilter(null)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <Filter className="h-4 w-4" />
                Limpar Filtro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{generalStats.total}</div>
            <div className="text-sm text-blue-700">Total</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-green-600">{generalStats.active}</div>
            <div className="text-sm text-green-700">Ativos</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-600">{generalStats.resolved}</div>
            <div className="text-sm text-gray-700">Resolvidos</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-600">{generalStats.critical}</div>
            <div className="text-sm text-red-700">Críticos</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
            <div className="text-2xl font-bold text-indigo-600">{generalStats.transbordo}</div>
            <div className="text-sm text-indigo-700">Transbordo</div>
          </div>
        </div>
      </div>

      {/* Grid de Status */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statusStats.map((stat) => (
            <div
              key={stat.status}
              className={`relative cursor-pointer transition-all duration-300 rounded-lg border-2 p-4 hover:shadow-lg hover:scale-105 ${
                selectedStatus === stat.status
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300 shadow-lg'
                  : hoveredStatus === stat.status
                  ? 'border-blue-300 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              } ${getStatusColor(stat.status)}`}
              onClick={() => handleStatusClick(stat.status)}
              onMouseEnter={() => setHoveredStatus(stat.status)}
              onMouseLeave={() => setHoveredStatus(null)}
            >
              {/* Status Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getStatusIcon(stat.status)}</span>
                  <div>
                    <h4 className={`font-semibold text-sm ${getStatusTextColor(stat.status)}`}>
                      {STATUS_CONFIGS[stat.status as keyof typeof STATUS_CONFIGS]?.label || stat.status}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {stat.percentage.toFixed(1)}% do total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusTextColor(stat.status)}`}>
                    {stat.count}
                  </div>
                  {stat.criticalCount > 0 && (
                    <div className="text-xs text-red-600 font-bold animate-pulse">
                      {stat.criticalCount} crítico{stat.criticalCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                ></div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tempo Médio:
                  </span>
                  <span className="font-medium">
                    {formatTimeHours(stat.avgTimeHours)}
                  </span>
                </div>
                {stat.oldestRecord && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Mais Antigo:
                    </span>
                    <span className="font-medium text-red-600">
                      {formatTimeHours((new Date().getTime() - new Date(stat.oldestRecord.created_at).getTime()) / (1000 * 60 * 60))}
                    </span>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedStatus === stat.status && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Critical Indicator */}
              {stat.criticalCount > 0 && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
                    !
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detalhes do Status Selecionado */}
      {selectedStatus && showDetails && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-xl">{getStatusIcon(selectedStatus)}</span>
              Detalhes - {STATUS_CONFIGS[selectedStatus as keyof typeof STATUS_CONFIGS]?.label}
            </h4>
            <p className="text-sm text-gray-600">
              {getFilteredRecords(selectedStatus).length} registro{getFilteredRecords(selectedStatus).length !== 1 ? 's' : ''} com este status
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Registros */}
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Registros Ativos</h5>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getFilteredRecords(selectedStatus).slice(0, 10).map((record) => {
                  const timeHours = (new Date().getTime() - new Date(record.created_at).getTime()) / (1000 * 60 * 60);
                  const isCritical = timeHours > 0.5 && record.status !== 'finalizado' && record.status !== 'resolvido';
                  
                  return (
                    <div
                      key={record.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 ${
                        isCritical 
                          ? 'bg-red-50 border-red-200 ring-1 ring-red-300' 
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => onRecordSelect && onRecordSelect(record.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{record.vehicle_code}</span>
                          {isCritical && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-bold animate-pulse">
                              CRÍTICO
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimeHours(timeHours)} atrás
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{record.driver_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{record.current_address || 'Local não informado'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(record.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {onOpenTracking && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTracking(record.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Activity className="h-3 w-3" />
                            Ver Tracking
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {getFilteredRecords(selectedStatus).length > 10 && (
                  <div className="text-center py-2 text-sm text-gray-500">
                    ... e mais {getFilteredRecords(selectedStatus).length - 10} registro{getFilteredRecords(selectedStatus).length - 10 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas Detalhadas */}
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Estatísticas Detalhadas</h5>
              <div className="space-y-3">
                {(() => {
                  const stat = statusStats.find(s => s.status === selectedStatus);
                  if (!stat) return null;

                  return (
                    <>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total de Registros:</span>
                          <span className="font-semibold text-gray-900">{stat.count}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Percentual do Total:</span>
                          <span className="font-semibold text-blue-600">{stat.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Tempo Médio:</span>
                          <span className="font-semibold text-orange-600">{formatTimeHours(stat.avgTimeHours)}</span>
                        </div>
                      </div>
                      
                      {stat.criticalCount > 0 && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-red-700 flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Registros Críticos:
                            </span>
                            <span className="font-semibold text-red-800">{stat.criticalCount}</span>
                          </div>
                        </div>
                      )}
                      
                      {stat.oldestRecord && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <div className="text-sm text-yellow-800 mb-1">Registro Mais Antigo:</div>
                          <div className="text-xs text-yellow-700">
                            <div>{stat.oldestRecord.vehicle_code} - {stat.oldestRecord.driver_name}</div>
                            <div>{formatTimeHours((new Date().getTime() - new Date(stat.oldestRecord.created_at).getTime()) / (1000 * 60 * 60))} atrás</div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé com Instruções */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Clique para filtrar</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span>Status crítico</span>
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Use "Limpar Filtro" para ver todos</span>
          </div>
        </div>
      </div>
    </div>
  );
}