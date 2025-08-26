import React, { useState, useEffect } from 'react';
import { TimelineEntry, TrackingStatus, STATUS_CONFIGS } from '../types/tracking';
import { TrackingService } from '../lib/trackingService';
import { Clock, X, User, CheckCircle, Play, Pause } from 'lucide-react';

interface MobileTimelineBalloonProps {
  recordId: string;
  vehicleCode: string;
  isVisible: boolean;
  onClose: () => void;
  onStatusChange?: (newStatus: TrackingStatus, operator: string, notes?: string) => void;
}

export function MobileTimelineBalloon({ 
  recordId, 
  vehicleCode, 
  isVisible, 
  onClose,
  onStatusChange 
}: MobileTimelineBalloonProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [showStatusChanger, setShowStatusChanger] = useState(false);
  const [newStatus, setNewStatus] = useState<TrackingStatus>('aguardando_tecnico');
  const [operatorName, setOperatorName] = useState('');

  useEffect(() => {
    if (isVisible) {
      loadTimeline();
      const interval = setInterval(updateCurrentDuration, 1000);
      return () => clearInterval(interval);
    }
  }, [recordId, isVisible]);

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
      await TrackingService.startStatus(recordId, newStatus, operatorName);
      await loadTimeline();
      setShowStatusChanger(false);
      setOperatorName('');
      
      if (onStatusChange) {
        onStatusChange(newStatus, operatorName);
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
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = () => {
    const totalSteps = Object.keys(STATUS_CONFIGS).length;
    const completedSteps = timeline.filter(entry => entry.exited_at).length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4 md:hidden">
      <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-3xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Timeline - {vehicleCode}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progresso do Processo</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="ml-2 text-gray-600 text-sm">Carregando...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Nenhum status registrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map((entry, index) => {
                const config = STATUS_CONFIGS[entry.status];
                const duration = entry.is_current ? currentDuration : (entry.duration_seconds || 0);
                const isLast = index === timeline.length - 1;

                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline connector */}
                    {!isLast && (
                      <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
                    )}

                    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                      entry.is_current 
                        ? `${config.bgColor} border-current shadow-md` 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      {/* Status Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        entry.is_current ? 'bg-white shadow-sm' : 'bg-gray-200'
                      }`}>
                        {config.icon}
                      </div>

                      {/* Status Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium text-sm ${config.color}`}>
                            {config.label}
                          </h4>
                          {entry.is_current && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              ATUAL
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{entry.operator_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(entry.entered_at)}</span>
                          </div>
                          {entry.exited_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Fim: {formatDateTime(entry.exited_at)}</span>
                            </div>
                          )}
                          <div className="font-medium text-blue-600">
                            Duração: {TrackingService.formatDuration(duration)}
                            {entry.is_current && <span className="animate-pulse"> (em andamento)</span>}
                          </div>
                        </div>

                        {entry.notes && (
                          <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-700">
                            <strong>Obs:</strong> {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {!showStatusChanger ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowStatusChanger(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Play className="h-4 w-4" />
                Alterar Status
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Novo Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TrackingStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {getAvailableTransitions().map(status => (
                    <option key={status} value={status}>
                      {STATUS_CONFIGS[status].icon} {STATUS_CONFIGS[status].label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Operador Responsável *
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Nome do operador"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleStatusChange}
                  disabled={!operatorName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => {
                    setShowStatusChanger(false);
                    setOperatorName('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}