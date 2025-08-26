import React, { useState, useEffect } from 'react';
import { StatusCountService, RecordStatusAnalysis, StatusBreakdown } from '../lib/statusCountService';
import { 
  Clock, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Activity,
  Timer,
  Hash,
  User,
  Calendar,
  CheckCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface StatusCountAnalysisProps {
  recordId: string;
  vehicleCode: string;
  onStatusChange?: (newStatus: string, operator: string, notes?: string) => void;
}

export function StatusCountAnalysis({ recordId, vehicleCode, onStatusChange }: StatusCountAnalysisProps) {
  const [analysis, setAnalysis] = useState<RecordStatusAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStatusChanger, setShowStatusChanger] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadAnalysis();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      // Recarregar análise a cada 30 segundos
      if (Date.now() % 30000 < 1000) {
        loadAnalysis();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [recordId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const analysisData = await StatusCountService.getRecordAnalysis(recordId);
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Error loading status count analysis:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!newStatus.trim() || !operatorName.trim()) {
      alert('Status e operador são obrigatórios');
      return;
    }

    setIsUpdating(true);
    try {
      await StatusCountService.transitionStatus(recordId, newStatus, operatorName, notes);
      await loadAnalysis();
      setShowStatusChanger(false);
      setNewStatus('');
      setOperatorName('');
      setNotes('');
      
      if (onStatusChange) {
        onStatusChange(newStatus, operatorName, notes);
      }
    } catch (error) {
      console.error('Error transitioning status:', error);
      alert('Erro ao alterar status. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentDuration = () => {
    if (!analysis?.current_status_info?.started_at) return 0;
    const startTime = new Date(analysis.current_status_info.started_at);
    const duration = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    return Math.max(0, duration); // Garantir que não seja negativo
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Carregando análise de contagem...</span>
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
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={loadAnalysis}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
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
          Não há mudanças de status registradas para este veículo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com informações gerais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Análise de Contagem de Status - {vehicleCode}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Rastreamento detalhado com contadores e tempo por status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStatusChanger(!showStatusChanger)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Alterar Status
            </button>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {StatusCountService.formatDurationHours(analysis.total_process_time_hours)}
              </div>
              <div className="text-sm text-gray-500">Tempo Total</div>
            </div>
          </div>
        </div>

        {/* Status Changer Panel */}
        {showStatusChanger && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-4">Alterar Status (Count #{analysis.total_status_changes + 1})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Novo Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um status</option>
                  <option value="aguardando_tecnico">🔧 Aguardando Técnico</option>
                  <option value="aguardando_mecanico">⚙️ Aguardando Mecânico</option>
                  <option value="manutencao_sem_previsao">🔨 Manutenção</option>
                  <option value="sem_previsao">❓ Sem Previsão</option>
                  <option value="transbordo_troca_cavalo">🚛 Transbordo - Troca de Cavalo</option>
                  <option value="transbordo_em_andamento">📦 Transbordo em Andamento</option>
                  <option value="transbordo_finalizado">✅ Transbordo Finalizado</option>
                  <option value="reinicio_viagem">🚀 Reinício de Viagem</option>
                  <option value="finalizado">🏁 Finalizado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operador Responsável *
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do operador"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações sobre a mudança de status..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleStatusTransition}
                disabled={isUpdating || !newStatus || !operatorName}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Aplicando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Aplicar Status
                  </>
                )}
              </button>
              <button
                onClick={() => setShowStatusChanger(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Total de Mudanças</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{analysis.total_status_changes}</div>
            <div className="text-xs text-blue-600 mt-1">
              Sequência atual: #{analysis.current_status_info?.count_sequence || 0}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Status Atual</span>
            </div>
            <div className="text-lg font-bold text-green-700">
              {analysis.current_status.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Por: {analysis.current_status_info?.operator_name || 'N/A'}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-900">Tempo Atual</span>
            </div>
            <div className="text-lg font-bold text-orange-700">
              {StatusCountService.formatDurationSeconds(getCurrentDuration())}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              {analysis.current_status_info?.is_current_status !== false ? (
                <span className="animate-pulse">Em andamento</span>
              ) : (
                'Finalizado'
              )}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Tempo Médio/Status</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {analysis.total_status_changes > 0 
                ? StatusCountService.formatDurationHours(analysis.total_process_time_hours / analysis.total_status_changes)
                : '0h'
              }
            </div>
            <div className="text-xs text-purple-600 mt-1">
              Eficiência média
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown por Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Breakdown Detalhado por Status
        </h4>
        
        <div className="space-y-4">
          {analysis.status_breakdown.map((breakdown, index) => (
            <div key={breakdown.status} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(breakdown.status)}`}>
                    {breakdown.status.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {breakdown.occurrences} ocorrência{breakdown.occurrences !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {StatusCountService.formatDurationHours(breakdown.total_time_hours)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {breakdown.percentage_of_total.toFixed(1)}% do tempo total
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    index === 0 ? 'bg-red-500' :
                    index === 1 ? 'bg-orange-500' :
                    index === 2 ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(breakdown.percentage_of_total, 100)}%` }}
                ></div>
              </div>

              {/* Estatísticas detalhadas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Médio:</span>
                  <span className="font-medium text-gray-900">
                    {StatusCountService.formatDurationHours(breakdown.average_time_hours)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Mínimo:</span>
                  <span className="font-medium text-green-600">
                    {StatusCountService.formatDurationSeconds(breakdown.min_time_seconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Máximo:</span>
                  <span className="font-medium text-red-600">
                    {StatusCountService.formatDurationSeconds(breakdown.max_time_seconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tempo Total:</span>
                  <span className="font-medium text-blue-600">
                    {StatusCountService.formatDurationSeconds(breakdown.total_time_seconds)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Cronológica */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Timeline Cronológica com Contadores
        </h4>

        <div className="space-y-4">
          {analysis.timeline.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline connector */}
              {index < analysis.timeline.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300"></div>
              )}

              <div className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                entry.is_current_status 
                  ? `${getStatusColor(entry.new_status)} shadow-lg animate-pulse` 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {/* Count Badge */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                  entry.is_current_status ? 'bg-white shadow-md text-blue-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  #{entry.count_sequence}
                </div>

                {/* Status Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.previous_status && (
                        <>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(entry.previous_status)}`}>
                            {entry.previous_status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(entry.new_status)}`}>
                        {entry.new_status.replace(/_/g, ' ')}
                      </span>
                      {entry.is_current_status && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">
                          ATUAL
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.duration_hours 
                          ? StatusCountService.formatDurationHours(entry.duration_hours)
                          : entry.is_current_status 
                          ? StatusCountService.formatDurationSeconds(getCurrentDuration())
                          : 'N/A'
                        }
                      </div>
                      {entry.is_current_status && (
                        <div className="text-xs text-gray-500 animate-pulse">em andamento</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4" />
                      <span>Operador: <strong>{entry.operator_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Play className="h-4 w-4" />
                      <span>Início: {formatDateTime(entry.status_started_at)}</span>
                    </div>
                    {entry.status_ended_at && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Pause className="h-4 w-4" />
                        <span>Fim: {formatDateTime(entry.status_ended_at)}</span>
                      </div>
                    )}
                  </div>

                  {entry.notes && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Observações:</div>
                      <div className="text-sm text-gray-700">{entry.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informações do Processo */}
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
              <span className="text-gray-600">Operador Inicial:</span>
              <span className="font-medium text-gray-900">{analysis.operator_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total de Mudanças:</span>
              <span className="font-medium text-blue-600">{analysis.total_status_changes}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Início do Processo:</span>
              <span className="font-medium text-gray-900">{formatDateTime(analysis.process_started_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tempo Total (Segundos):</span>
              <span className="font-medium text-gray-900">{analysis.total_process_time_seconds.toLocaleString()}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tempo Total (Horas):</span>
              <span className="font-medium text-blue-600">{analysis.total_process_time_hours.toFixed(2)}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status Atual:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(analysis.current_status)}`}>
                {analysis.current_status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}