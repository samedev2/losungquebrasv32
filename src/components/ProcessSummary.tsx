import React, { useState, useEffect } from 'react';
import { ProcessSummary as ProcessSummaryType } from '../types/tracking';
import { TrackingService } from '../lib/trackingService';
import { BarChart3, Clock, TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface ProcessSummaryProps {
  recordId: string;
}

export function ProcessSummary({ recordId }: ProcessSummaryProps) {
  const [summary, setSummary] = useState<ProcessSummaryType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, [recordId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const summaryData = await TrackingService.getProcessSummary(recordId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Carregando resumo...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Nenhum dado de processo disponível</p>
        </div>
      </div>
    );
  }

  const getProgressPercentage = () => {
    const totalSteps = 8; // Total de status possíveis
    const completedSteps = summary.timeline.filter(entry => entry.exited_at).length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header com informações gerais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Resumo do Processo - {summary.vehicle_code}
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {TrackingService.formatDuration(summary.total_process_time)}
            </div>
            <div className="text-sm text-gray-500">Tempo Total</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso do Processo</span>
            <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Status Atual</span>
            </div>
            <div className="text-lg font-bold text-blue-700">
              {summary.current_status.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Etapas Concluídas</span>
            </div>
            <div className="text-lg font-bold text-green-700">
              {summary.timeline.filter(entry => entry.exited_at).length} / {summary.timeline.length}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-900">Tempo Médio/Etapa</span>
            </div>
            <div className="text-lg font-bold text-orange-700">
              {summary.timeline.length > 0 
                ? TrackingService.formatDuration(Math.floor(summary.total_process_time / summary.timeline.length))
                : '0s'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown por Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Breakdown de Tempo por Status
        </h4>
        
        <div className="space-y-3">
          {summary.status_durations.map((duration, index) => {
            const percentage = summary.total_process_time > 0 
              ? (duration.total_seconds / summary.total_process_time) * 100 
              : 0;

            return (
              <div key={duration.status} className="flex items-center gap-4">
                <div className="w-48 text-sm font-medium text-gray-700">
                  {duration.status.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-gray-600">
                      {TrackingService.formatDuration(duration.total_seconds)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        index === 0 ? 'bg-red-500' :
                        index === 1 ? 'bg-orange-500' :
                        index === 2 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 w-20 text-right">
                  {duration.entries} vez{duration.entries !== 1 ? 'es' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gargalos Identificados */}
      {summary.bottlenecks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Gargalos Identificados
          </h4>
          
          <div className="space-y-3">
            {summary.bottlenecks.map((bottleneck, index) => (
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
                      Representa {bottleneck.percentage.toFixed(1)}% do tempo total do processo
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${
                    index === 0 ? 'text-red-700' :
                    index === 1 ? 'text-orange-700' :
                    'text-yellow-700'
                  }`}>
                    {TrackingService.formatDuration(bottleneck.duration_seconds)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}