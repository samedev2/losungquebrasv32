import React, { useState, useEffect } from 'react';
import { TimelineEntry, TrackingStatus, STATUS_CONFIGS } from '../types/tracking';
import { TrackingService } from '../lib/trackingService';
import { Clock, User, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface TrackingTimelineProps {
  recordId: string;
  onStatusChange?: (newStatus: TrackingStatus, operator: string, notes?: string) => void;
}

export function TrackingTimeline({ recordId, onStatusChange }: TrackingTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [showStatusChanger, setShowStatusChanger] = useState(false);
  const [newStatus, setNewStatus] = useState<TrackingStatus>('aguardando_tecnico');
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTimeline();
    const interval = setInterval(updateCurrentDuration, 1000);
    return () => clearInterval(interval);
  }, [recordId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const timelineData = await TrackingService.getTimeline(recordId);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Erro ao carregar timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentDuration = async () => {
    const duration = await TrackingService.getCurrentStatusDuration(recordId);
    setCurrentDuration(duration);
  };

  const handleStatusChange = async () => {
    if (!operatorName.trim()) {
      alert('Nome do operador é obrigatório');
      return;
    }

    try {
      // Usar o serviço de contagem de status
      const { StatusCountService } = await import('../lib/statusCountService');
      await StatusCountService.transitionStatus(recordId, newStatus, operatorName, notes);
      
      // Também criar timestamp no sistema antigo para compatibilidade
      try {
        await TrackingService.startStatus(recordId, newStatus, operatorName, notes);
      } catch (trackingError) {
        console.warn('Erro no sistema de tracking antigo:', trackingError);
      }
      
      // Recarregar timeline
      await loadTimeline();
      
      // Limpar formulário
      setShowStatusChanger(false);
      setOperatorName('');
      setNotes('');
      
      // Notificar componente pai sobre a mudança
      if (onStatusChange) {
        onStatusChange(newStatus, operatorName, notes);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status. Tente novamente.');
    }
  };

  const getAvailableTransitions = (): TrackingStatus[] => {
    if (timeline.length === 0) {
      return ['aguardando_tecnico', 'aguardando_mecanico'];
    }

    const currentEntry = timeline.find(entry => entry.is_current);
    if (!currentEntry) {
      return ['aguardando_tecnico', 'aguardando_mecanico'];
    }

    const config = STATUS_CONFIGS[currentEntry.status];
    return config ? config.allowedTransitions : [];
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Carregando timeline...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Timeline de Status
        </h3>
        <button
          onClick={() => setShowStatusChanger(!showStatusChanger)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Alterar Status
        </button>
      </div>

      {/* Status Changer Panel */}
      {showStatusChanger && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-4">Alterar Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as TrackingStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getAvailableTransitions().map(status => (
                  <option key={status} value={status}>
                    {STATUS_CONFIGS[status].icon} {STATUS_CONFIGS[status].label}
                  </option>
                ))}
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
              onClick={handleStatusChange}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar Status
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

      {/* Timeline */}
      <div className="space-y-4">
        {timeline.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum status registrado ainda</p>
            <p className="text-sm">Clique em "Alterar Status" para começar o rastreamento</p>
          </div>
        ) : (
          timeline.map((entry, index) => {
            const config = STATUS_CONFIGS[entry.status];
            const isLast = index === timeline.length - 1;
            const duration = entry.is_current ? currentDuration : (entry.duration_seconds || 0);

            return (
              <div key={entry.id} className="relative">
                {/* Timeline Line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300"></div>
                )}

                <div className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                  entry.is_current 
                    ? `${config.bgColor} border-current shadow-lg animate-pulse` 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  {/* Status Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    entry.is_current ? 'bg-white shadow-md' : 'bg-gray-200'
                  }`}>
                    {config.icon}
                  </div>

                  {/* Status Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${config.color}`}>
                        {config.label}
                        {entry.is_current && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            ATUAL
                          </span>
                        )}
                      </h4>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {TrackingService.formatDuration(duration)}
                        </div>
                        {entry.is_current && (
                          <div className="text-xs text-gray-500">em andamento</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Operador: <strong>{entry.operator_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Início: {formatDateTime(entry.entered_at)}</span>
                      </div>
                      {entry.exited_at && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Fim: {formatDateTime(entry.exited_at)}</span>
                        </div>
                      )}
                    </div>

                    {entry.notes && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Observações:</div>
                            <div className="text-sm text-gray-700">{entry.notes}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}