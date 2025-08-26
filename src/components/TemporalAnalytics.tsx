import React, { useMemo } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';

interface TemporalAnalyticsProps {
  records: LogisticsRecord[];
  period: 'day' | 'week' | 'month';
}

interface TrendData {
  period: string;
  date: Date;
  total: number;
  resolved: number;
  active: number;
  critical: number;
  averageResolutionHours: number;
}

interface StatusTrend {
  status: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  current: number;
  previous: number;
}

export function TemporalAnalytics({ records, period }: TemporalAnalyticsProps) {
  // Calcular dados de tendência
  const trendData = useMemo(() => {
    const trends: TrendData[] = [];
    const periodsToAnalyze = period === 'day' ? 14 : period === 'week' ? 8 : 12;

    for (let i = periodsToAnalyze - 1; i >= 0; i--) {
      const date = new Date();
      let startDate: Date;
      let endDate: Date;
      let periodLabel: string;

      if (period === 'day') {
        startDate = new Date(date);
        startDate.setDate(startDate.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        periodLabel = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else if (period === 'week') {
        startDate = new Date(date);
        startDate.setDate(startDate.getDate() - (startDate.getDay() + 7 * i));
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        
        periodLabel = `Sem ${periodsToAnalyze - i}`;
      } else {
        startDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
        endDate = new Date(date.getFullYear(), date.getMonth() - i + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        periodLabel = startDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }

      const periodRecords = records.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate >= startDate && recordDate < endDate;
      });

      const total = periodRecords.length;
      const resolved = periodRecords.filter(r => r.status === 'finalizado' || r.status === 'resolvido').length;
      const active = total - resolved;
      const critical = periodRecords.filter(r => {
        const timeHours = (new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
        return timeHours > 0.5 && r.status !== 'finalizado' && r.status !== 'resolvido';
      }).length;

      // Calcular tempo médio de resolução
      const resolvedWithTime = periodRecords.filter(r => 
        (r.status === 'finalizado' || r.status === 'resolvido') && r.completion_time
      );
      const averageResolutionHours = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum, record) => {
            const timeStr = record.completion_time;
            const hours = parseFloat(timeStr.replace(/[^\d.]/g, '')) || 0;
            return sum + hours;
          }, 0) / resolvedWithTime.length
        : 0;

      trends.push({
        period: periodLabel,
        date: startDate,
        total,
        resolved,
        active,
        critical,
        averageResolutionHours
      });
    }

    return trends;
  }, [records, period]);

  // Calcular tendências de status
  const statusTrends = useMemo(() => {
    if (trendData.length < 2) return [];

    const currentPeriod = trendData[trendData.length - 1];
    const previousPeriod = trendData[trendData.length - 2];

    const trends: StatusTrend[] = [
      {
        status: 'Total',
        current: currentPeriod.total,
        previous: previousPeriod.total,
        change: currentPeriod.total - previousPeriod.total,
        trend: currentPeriod.total > previousPeriod.total ? 'up' : 
               currentPeriod.total < previousPeriod.total ? 'down' : 'stable'
      },
      {
        status: 'Resolvidos',
        current: currentPeriod.resolved,
        previous: previousPeriod.resolved,
        change: currentPeriod.resolved - previousPeriod.resolved,
        trend: currentPeriod.resolved > previousPeriod.resolved ? 'up' : 
               currentPeriod.resolved < previousPeriod.resolved ? 'down' : 'stable'
      },
      {
        status: 'Críticos',
        current: currentPeriod.critical,
        previous: previousPeriod.critical,
        change: currentPeriod.critical - previousPeriod.critical,
        trend: currentPeriod.critical > previousPeriod.critical ? 'up' : 
               currentPeriod.critical < previousPeriod.critical ? 'down' : 'stable'
      }
    ];

    return trends;
  }, [trendData]);

  // Encontrar picos e vales
  const insights = useMemo(() => {
    if (trendData.length < 3) return [];

    const insights: string[] = [];

    // Pico de registros
    const maxTotal = Math.max(...trendData.map(t => t.total));
    const peakPeriod = trendData.find(t => t.total === maxTotal);
    if (peakPeriod && maxTotal > 0) {
      insights.push(`Pico de ${maxTotal} registros em ${peakPeriod.period}`);
    }

    // Melhor taxa de resolução
    const bestResolutionRate = Math.max(...trendData.map(t => 
      t.total > 0 ? (t.resolved / t.total) * 100 : 0
    ));
    const bestPeriod = trendData.find(t => 
      t.total > 0 && ((t.resolved / t.total) * 100) === bestResolutionRate
    );
    if (bestPeriod && bestResolutionRate > 0) {
      insights.push(`Melhor taxa de resolução: ${bestResolutionRate.toFixed(1)}% em ${bestPeriod.period}`);
    }

    // Período mais crítico
    const maxCritical = Math.max(...trendData.map(t => t.critical));
    const criticalPeriod = trendData.find(t => t.critical === maxCritical);
    if (criticalPeriod && maxCritical > 0) {
      insights.push(`Período mais crítico: ${maxCritical} registros em ${criticalPeriod.period}`);
    }

    return insights;
  }, [trendData]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'stable': return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = false) => {
    if (trend === 'stable') return 'text-gray-600';
    if (isGoodWhenUp) {
      return trend === 'up' ? 'text-green-600' : 'text-red-600';
    } else {
      return trend === 'up' ? 'text-red-600' : 'text-green-600';
    }
  };

  if (trendData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sem Dados para Análise</h3>
        <p className="text-gray-500">
          Não há registros suficientes para gerar análise temporal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de Tendência */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Tendência de Registros - {period === 'day' ? 'Últimos 14 Dias' : period === 'week' ? 'Últimas 8 Semanas' : 'Últimos 12 Meses'}
        </h4>

        {/* Gráfico Simples */}
        <div className="relative h-64 bg-gray-50 rounded-lg p-4 overflow-hidden">
          <div className="flex items-end justify-between h-full">
            {trendData.map((data, index) => {
              const maxValue = Math.max(...trendData.map(t => t.total));
              const height = maxValue > 0 ? (data.total / maxValue) * 100 : 0;
              
              return (
                <div key={index} className="flex flex-col items-center flex-1 mx-1">
                  <div className="flex flex-col items-center justify-end h-full">
                    {/* Barra de Total */}
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600 relative group"
                      style={{ height: `${height}%`, minHeight: data.total > 0 ? '4px' : '0' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        {data.total} registros<br/>
                        {data.resolved} resolvidos<br/>
                        {data.critical} críticos
                      </div>
                      
                      {/* Barra de Resolvidos */}
                      {data.resolved > 0 && (
                        <div
                          className="absolute bottom-0 left-0 w-full bg-green-500 rounded-t"
                          style={{ height: `${(data.resolved / data.total) * 100}%` }}
                        ></div>
                      )}
                      
                      {/* Barra de Críticos */}
                      {data.critical > 0 && (
                        <div
                          className="absolute top-0 left-0 w-full bg-red-500 rounded-t"
                          style={{ height: `${(data.critical / data.total) * 100}%` }}
                        ></div>
                      )}
                    </div>
                  </div>
                  
                  {/* Label do Período */}
                  <div className="text-xs text-gray-600 mt-2 text-center transform -rotate-45 origin-center">
                    {data.period}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legenda */}
          <div className="absolute top-4 right-4 bg-white rounded-lg border border-gray-200 p-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Resolvidos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Críticos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tendências Comparativas */}
      {statusTrends.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Comparação com Período Anterior
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusTrends.map((trend) => (
              <div key={trend.status} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{trend.status}</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trend.trend)}
                    <span className={`text-sm font-bold ${getTrendColor(trend.trend, trend.status === 'Resolvidos')}`}>
                      {trend.change > 0 ? '+' : ''}{trend.change}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Atual:</span>
                  <span className="font-medium text-gray-900">{trend.current}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Anterior:</span>
                  <span className="font-medium text-gray-700">{trend.previous}</span>
                </div>
                
                {trend.change !== 0 && (
                  <div className="mt-2 text-xs text-center">
                    <span className={`px-2 py-1 rounded-full ${
                      trend.trend === 'up' 
                        ? trend.status === 'Resolvidos' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        : trend.status === 'Resolvidos' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {Math.abs(((trend.change / Math.max(trend.previous, 1)) * 100)).toFixed(1)}% 
                      {trend.trend === 'up' ? ' ↑' : ' ↓'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights e Recomendações */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Insights do Período
          </h4>

          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="bg-purple-100 p-1 rounded-full">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-sm text-purple-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas de Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          Métricas de Performance
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Taxa de Resolução Média */}
          {(() => {
            const totalRecords = trendData.reduce((sum, t) => sum + t.total, 0);
            const totalResolved = trendData.reduce((sum, t) => sum + t.resolved, 0);
            const resolutionRate = totalRecords > 0 ? (totalResolved / totalRecords) * 100 : 0;
            
            return (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                <div className="text-2xl font-bold text-green-600">{resolutionRate.toFixed(1)}%</div>
                <div className="text-sm text-green-700">Taxa de Resolução</div>
              </div>
            );
          })()}

          {/* Tempo Médio de Resolução */}
          {(() => {
            const avgResolution = trendData
              .filter(t => t.averageResolutionHours > 0)
              .reduce((sum, t, _, arr) => sum + t.averageResolutionHours / arr.length, 0);
            
            return (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                <div className="text-2xl font-bold text-blue-600">{avgResolution.toFixed(1)}h</div>
                <div className="text-sm text-blue-700">Tempo Médio</div>
              </div>
            );
          })()}

          {/* Pico de Atividade */}
          {(() => {
            const maxActivity = Math.max(...trendData.map(t => t.total));
            
            return (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-purple-600">{maxActivity}</div>
                <div className="text-sm text-purple-700">Pico de Atividade</div>
              </div>
            );
          })()}

          {/* Registros Críticos */}
          {(() => {
            const totalCritical = trendData.reduce((sum, t) => sum + t.critical, 0);
            
            return (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                <div className="text-2xl font-bold text-red-600">{totalCritical}</div>
                <div className="text-sm text-red-700">Total Críticos</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabela de Dados Detalhados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-gray-600" />
            Dados Detalhados por Período
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolvidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ativos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Críticos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa Resolução
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tempo Médio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trendData.map((data, index) => {
                const resolutionRate = data.total > 0 ? (data.resolved / data.total) * 100 : 0;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {data.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {data.resolved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {data.active}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {data.critical > 0 ? (
                        <span className="text-red-600 font-bold animate-pulse">{data.critical}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        resolutionRate > 70 ? 'text-green-600' :
                        resolutionRate > 40 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {resolutionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.averageResolutionHours > 0 ? `${data.averageResolutionHours.toFixed(1)}h` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}