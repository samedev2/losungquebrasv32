import React, { useState, useMemo } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  Users,
  Truck,
  AlertTriangle
} from 'lucide-react';

export type TemporalPeriod = 'day' | 'week' | 'month';

interface TemporalFilterProps {
  records: LogisticsRecord[];
  onFilteredRecordsChange: (filteredRecords: LogisticsRecord[]) => void;
  className?: string;
}

interface PeriodStats {
  period: string;
  totalRecords: number;
  activeRecords: number;
  resolvedRecords: number;
  criticalRecords: number;
  averageResolutionTime: number;
  mostCommonStatus: string;
  records: LogisticsRecord[];
}

export function TemporalFilter({ records, onFilteredRecordsChange, className = '' }: TemporalFilterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TemporalPeriod>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showStats, setShowStats] = useState(true);

  // Calcular dados filtrados baseado no período selecionado
  const filteredData = useMemo(() => {
    const now = new Date();
    const periods: PeriodStats[] = [];

    if (selectedPeriod === 'day') {
      // Últimos 7 dias
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayRecords = records.filter(record => {
          const recordDate = new Date(record.created_at);
          return recordDate >= date && recordDate < nextDate;
        });

        periods.push(createPeriodStats(
          date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          dayRecords
        ));
      }
    } else if (selectedPeriod === 'week') {
      // Últimas 4 semanas
      for (let i = 3; i >= 0; i--) {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 7 * i));
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        const weekRecords = records.filter(record => {
          const recordDate = new Date(record.created_at);
          return recordDate >= startOfWeek && recordDate < endOfWeek;
        });

        const weekLabel = `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${new Date(endOfWeek.getTime() - 1).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
        
        periods.push(createPeriodStats(weekLabel, weekRecords));
      }
    } else if (selectedPeriod === 'month') {
      // Últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        const monthRecords = records.filter(record => {
          const recordDate = new Date(record.created_at);
          return recordDate >= startOfMonth && recordDate <= endOfMonth;
        });

        const monthLabel = startOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        periods.push(createPeriodStats(monthLabel, monthRecords));
      }
    }

    return periods;
  }, [records, selectedPeriod, currentDate]);

  // Criar estatísticas para um período
  const createPeriodStats = (period: string, periodRecords: LogisticsRecord[]): PeriodStats => {
    const totalRecords = periodRecords.length;
    const activeRecords = periodRecords.filter(r => r.status !== 'finalizado' && r.status !== 'resolvido').length;
    const resolvedRecords = periodRecords.filter(r => r.status === 'finalizado' || r.status === 'resolvido').length;
    
    // Registros críticos (mais de 30 minutos e não resolvidos)
    const criticalRecords = periodRecords.filter(record => {
      const timeHours = (new Date().getTime() - new Date(record.created_at).getTime()) / (1000 * 60 * 60);
      return timeHours > 0.5 && record.status !== 'finalizado' && record.status !== 'resolvido';
    }).length;

    // Tempo médio de resolução
    const resolvedWithTime = periodRecords.filter(r => 
      (r.status === 'finalizado' || r.status === 'resolvido') && r.completion_time
    );
    const averageResolutionTime = resolvedWithTime.length > 0 
      ? resolvedWithTime.reduce((sum, record) => {
          const timeStr = record.completion_time;
          const hours = parseFloat(timeStr.replace(/[^\d.]/g, '')) || 0;
          return sum + hours;
        }, 0) / resolvedWithTime.length
      : 0;

    // Status mais comum
    const statusCounts = periodRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonStatus = Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      period,
      totalRecords,
      activeRecords,
      resolvedRecords,
      criticalRecords,
      averageResolutionTime,
      mostCommonStatus,
      records: periodRecords
    };
  };

  // Navegar entre períodos
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (selectedPeriod === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 28 : -28));
    } else if (selectedPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 6 : -6));
    }
    
    setCurrentDate(newDate);
  };

  // Resetar para período atual
  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  // Selecionar período específico
  const selectPeriod = (periodStats: PeriodStats) => {
    onFilteredRecordsChange(periodStats.records);
  };

  // Limpar filtro
  const clearFilter = () => {
    onFilteredRecordsChange(records);
  };

  // Obter cor baseada na performance do período
  const getPeriodColor = (stats: PeriodStats) => {
    if (stats.totalRecords === 0) return 'bg-gray-100 border-gray-200 text-gray-600';
    
    const criticalPercentage = (stats.criticalRecords / stats.totalRecords) * 100;
    const resolutionPercentage = (stats.resolvedRecords / stats.totalRecords) * 100;
    
    if (criticalPercentage > 30) return 'bg-red-100 border-red-300 text-red-800';
    if (resolutionPercentage > 70) return 'bg-green-100 border-green-300 text-green-800';
    if (resolutionPercentage > 40) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  // Obter totais gerais
  const totalStats = useMemo(() => {
    const allPeriodRecords = filteredData.flatMap(p => p.records);
    const uniqueRecords = Array.from(new Set(allPeriodRecords.map(r => r.id)))
      .map(id => allPeriodRecords.find(r => r.id === id)!);
    
    return {
      total: uniqueRecords.length,
      active: uniqueRecords.filter(r => r.status !== 'finalizado' && r.status !== 'resolvido').length,
      resolved: uniqueRecords.filter(r => r.status === 'finalizado' || r.status === 'resolvido').length,
      critical: uniqueRecords.filter(r => {
        const timeHours = (new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
        return timeHours > 0.5 && r.status !== 'finalizado' && r.status !== 'resolvido';
      }).length
    };
  }, [filteredData]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-indigo-600" />
              Filtro Temporal Avançado
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Analise registros por período e identifique tendências
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Eye className="h-4 w-4" />
              {showStats ? 'Ocultar Stats' : 'Mostrar Stats'}
            </button>
            <button
              onClick={clearFilter}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <Filter className="h-4 w-4" />
              Limpar Filtro
            </button>
          </div>
        </div>
      </div>

      {/* Controles de Período */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Visualizar por:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as TemporalPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {period === 'day' ? 'Dias' : period === 'week' ? 'Semanas' : 'Meses'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={resetToToday}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              title="Voltar para hoje"
            >
              <RefreshCw className="h-4 w-4" />
              Hoje
            </button>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Próximo período"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      {showStats && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-indigo-600">{totalStats.total}</div>
              <div className="text-sm text-gray-600">Total no Período</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-green-600">{totalStats.resolved}</div>
              <div className="text-sm text-gray-600">Resolvidos</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-orange-600">{totalStats.active}</div>
              <div className="text-sm text-gray-600">Ativos</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-red-600">{totalStats.critical}</div>
              <div className="text-sm text-gray-600">Críticos</div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Períodos */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredData.map((periodStats, index) => (
            <div
              key={`${periodStats.period}-${index}`}
              className={`cursor-pointer transition-all duration-300 rounded-lg border-2 p-4 hover:shadow-lg hover:scale-105 ${getPeriodColor(periodStats)}`}
              onClick={() => selectPeriod(periodStats)}
            >
              {/* Header do Período */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-sm">
                    {periodStats.period}
                  </h4>
                  <p className="text-xs opacity-75">
                    {selectedPeriod === 'day' ? 'Dia' : selectedPeriod === 'week' ? 'Semana' : 'Mês'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {periodStats.totalRecords}
                  </div>
                  <div className="text-xs opacity-75">registros</div>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mb-3">
                <div
                  className="bg-current h-2 rounded-full transition-all duration-500 opacity-60"
                  style={{ 
                    width: `${periodStats.totalRecords > 0 ? (periodStats.resolvedRecords / periodStats.totalRecords) * 100 : 0}%` 
                  }}
                ></div>
              </div>

              {/* Estatísticas Rápidas */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 opacity-75">
                    <Truck className="h-3 w-3" />
                    Ativos:
                  </span>
                  <span className="font-medium">{periodStats.activeRecords}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 opacity-75">
                    <Clock className="h-3 w-3" />
                    Resolvidos:
                  </span>
                  <span className="font-medium">{periodStats.resolvedRecords}</span>
                </div>

                {periodStats.criticalRecords > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 opacity-75">
                      <AlertTriangle className="h-3 w-3" />
                      Críticos:
                    </span>
                    <span className="font-bold animate-pulse">{periodStats.criticalRecords}</span>
                  </div>
                )}

                {periodStats.averageResolutionTime > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 opacity-75">
                      <TrendingUp className="h-3 w-3" />
                      Tempo Médio:
                    </span>
                    <span className="font-medium">{periodStats.averageResolutionTime.toFixed(1)}h</span>
                  </div>
                )}
              </div>

              {/* Indicador de Seleção */}
              <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                <div className="text-xs text-center opacity-75">
                  Clique para filtrar
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Período Vazio */}
        {filteredData.every(p => p.totalRecords === 0) && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
            <p className="text-gray-500">
              Não há registros no período selecionado.
            </p>
            <button
              onClick={resetToToday}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Voltar para Hoje
            </button>
          </div>
        )}
      </div>

      {/* Resumo Detalhado */}
      {showStats && filteredData.some(p => p.totalRecords > 0) && (
        <div className="border-t border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-indigo-50">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Análise de Tendências
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Período com Mais Registros */}
            {(() => {
              const busiestPeriod = filteredData.reduce((max, current) => 
                current.totalRecords > max.totalRecords ? current : max
              );
              
              return (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Período Mais Movimentado</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{busiestPeriod.period}</div>
                  <div className="text-sm text-gray-600">{busiestPeriod.totalRecords} registros</div>
                </div>
              );
            })()}

            {/* Melhor Performance */}
            {(() => {
              const bestPerformance = filteredData
                .filter(p => p.totalRecords > 0)
                .reduce((best, current) => {
                  const currentResolutionRate = current.resolvedRecords / current.totalRecords;
                  const bestResolutionRate = best.resolvedRecords / best.totalRecords;
                  return currentResolutionRate > bestResolutionRate ? current : best;
                });
              
              return (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Melhor Performance</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">{bestPerformance.period}</div>
                  <div className="text-sm text-gray-600">
                    {((bestPerformance.resolvedRecords / bestPerformance.totalRecords) * 100).toFixed(1)}% resolvidos
                  </div>
                </div>
              );
            })()}

            {/* Período Crítico */}
            {(() => {
              const criticalPeriod = filteredData
                .filter(p => p.totalRecords > 0)
                .reduce((worst, current) => 
                  current.criticalRecords > worst.criticalRecords ? current : worst
                );
              
              return criticalPeriod.criticalRecords > 0 ? (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Período Crítico</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">{criticalPeriod.period}</div>
                  <div className="text-sm text-gray-600">{criticalPeriod.criticalRecords} registros críticos</div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Status Geral</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">Estável</div>
                  <div className="text-sm text-gray-600">Nenhum período crítico</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <span>Clique em um período para filtrar</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span>Período crítico</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Boa performance</span>
          </div>
        </div>
      </div>
    </div>
  );
}