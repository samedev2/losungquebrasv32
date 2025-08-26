import React, { useState, useEffect } from 'react';
import { ProcessTimelineAnalysis, StatusTimeAnalysis } from '../types/statusTracking';
import { StatusTrackingService } from '../lib/statusTrackingService';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Target,
  Activity,
  Timer,
  Zap,
  Award,
  TrendingDown,
  Calendar,
  User,
  Hash
} from 'lucide-react';

interface StatusTimelineAnalysisProps {
  recordId: string;
  vehicleCode: string;
}

export function StatusTimelineAnalysis({ recordId, vehicleCode }: StatusTimelineAnalysisProps) {
  const [analysis, setAnalysis] = useState<ProcessTimelineAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
    const interval = setInterval(loadAnalysis, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, [recordId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const analysisData = await StatusTrackingService.getProcessTimelineAnalysis(recordId);
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Error loading timeline analysis:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Carregando análise temporal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="font-medium text-red-800">Erro ao carregar análise</h3>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={loadAnalysis}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="font-medium text-gray-900 mb-2">Sem dados de análise</h3>
        <p className="text-gray-600 text-sm">
          Não há mudanças de status suficientes para gerar análise temporal.
        </p>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'aguardando_tecnico': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'aguardando_mecanico': 'bg-orange-100 text-orange-800 border-orange-200',
      'manutencao_sem_previsao': 'bg-red-100 text-red-800 border-red-200',
      'sem_previsao': 'bg-gray-100 text-gray-800 border-gray-200',
      'transbordo_troca_cavalo': 'bg-blue-100 text-blue-800 border-blue-200',
      'transbordo_em_andamento': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'transbordo_finalizado': 'bg-purple-100 text-purple-800 border-purple-200',
      'reinicio_viagem': 'bg-green-100 text-green-800 border-green-200',
      'finalizado': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header com informações gerais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Análise Temporal Detalhada - {vehicleCode}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Rastreamento completo de tempo e eficiência do processo
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {StatusTrackingService.formatDuration(analysis.total_process_time_seconds)}
            </div>
            <div className="text-sm text-gray-500">Tempo Total</div>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Total de Mudanças</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{analysis.total_status_changes}</div>
            <div className="text-xs text-blue-600 mt-1">
              Média: {StatusTrackingService.formatDuration(analysis.efficiency_metrics.average_time_per_status)} por status
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Resolução Mais Rápida</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {StatusTrackingService.formatDuration(analysis.efficiency_metrics.fastest_resolution_time)}
            </div>
            <div className="text-xs text-green-600 mt-1">Melhor performance</div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">Resolução Mais Lenta</span>
            </div>
            <div className="text-2xl font-bold text-red-700">
              {StatusTrackingService.formatDuration(analysis.efficiency_metrics.slowest_resolution_time)}
            </div>
            <div className="text-xs text-red-600 mt-1">Necessita atenção</div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Status Atual</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {analysis.current_status.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {analysis.process_end ? 'Processo finalizado' : 'Em andamento'}
            </div>
          </div>
        </div>
      </div>

      {/* Análise de tempo por status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Breakdown Detalhado por Status
        </h4>

        <div className="space-y-4">
          {analysis.time_analysis_by_status.map((statusAnalysis, index) => (
            <div key={statusAnalysis.status} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(statusAnalysis.status)}`}>
                    {statusAnalysis.status.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {statusAnalysis.total_occurrences} ocorrência{statusAnalysis.total_occurrences !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {StatusTrackingService.formatDuration(statusAnalysis.total_time_seconds)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {statusAnalysis.percentage_of_total_time.toFixed(1)}% do tempo total
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(statusAnalysis.percentage_of_total_time, 100)}%` }}
                ></div>
              </div>

              {/* Estatísticas detalhadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Médio:</span>
                  <span className="font-medium text-gray-900">
                    {StatusTrackingService.formatDuration(statusAnalysis.average_time_seconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Mínimo:</span>
                  <span className="font-medium text-green-600">
                    {StatusTrackingService.formatDuration(statusAnalysis.min_time_seconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Máximo:</span>
                  <span className="font-medium text-red-600">
                    {StatusTrackingService.formatDuration(statusAnalysis.max_time_seconds)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gargalos identificados */}
      {analysis.bottlenecks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Gargalos Identificados
          </h4>

          <div className="space-y-3">
            {analysis.bottlenecks.map((bottleneck, index) => (
              <div
                key={bottleneck.status}
                className={`p-4 rounded-lg border-2 ${
                  index === 0 ? 'bg-red-50 border-red-200' :
                  index === 1 ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${
                      index === 0 ? 'text-red-800' :
                      index === 1 ? 'text-orange-800' :
                      'text-yellow-800'
                    }`}>
                      #{index + 1} - {bottleneck.status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Ocorrência #{bottleneck.occurrence_number} • {bottleneck.percentage.toFixed(1)}% do tempo total
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${
                    index === 0 ? 'text-red-700' :
                    index === 1 ? 'text-orange-700' :
                    'text-yellow-700'
                  }`}>
                    {StatusTrackingService.formatDuration(bottleneck.time_seconds)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico cronológico */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Histórico Cronológico de Mudanças
        </h4>

        <div className="space-y-4">
          {analysis.status_history.map((change, index) => (
            <div key={change.id} className="relative">
              {/* Timeline connector */}
              {index < analysis.status_history.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300"></div>
              )}

              <div className="flex items-start gap-4">
                {/* Sequence number */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                  #{change.sequence_number}
                </div>

                {/* Change details */}
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {change.previous_status && (
                        <>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(change.previous_status)}`}>
                            {change.previous_status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(change.new_status)}`}>
                        {change.new_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(change.changed_at)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Operador:</span>
                      <span className="font-medium text-gray-900">{change.operator_name}</span>
                    </div>
                    
                    {change.duration_in_previous_status && (
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Duração anterior:</span>
                        <span className="font-medium text-blue-600">
                          {StatusTrackingService.formatDuration(change.duration_in_previous_status)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Sequência:</span>
                      <span className="font-medium text-gray-900">#{change.sequence_number}</span>
                    </div>
                  </div>

                  {change.notes && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Observações:</div>
                      <div className="text-sm text-gray-700">{change.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informações do processo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Informações do Processo</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Veículo:</span>
              <span className="font-medium text-gray-900">{analysis.vehicle_code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Motorista:</span>
              <span className="font-medium text-gray-900">{analysis.driver_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Operador:</span>
              <span className="font-medium text-gray-900">{analysis.operator_name}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Início do Processo:</span>
              <span className="font-medium text-gray-900">{formatDateTime(analysis.process_start)}</span>
            </div>
            {analysis.process_end && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Fim do Processo:</span>
                <span className="font-medium text-gray-900">{formatDateTime(analysis.process_end)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status Mais Demorado:</span>
              <span className="font-medium text-red-600">
                {analysis.efficiency_metrics.most_time_consuming_status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}