import React, { useState, useEffect } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { TrackingService } from '../lib/trackingService';
import { StatusBadge } from './StatusBadge';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Play, 
  Pause,
  RotateCcw,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';

interface ProcessStep {
  id: string;
  status: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  order: number;
  estimatedDuration: number; // em minutos
}

interface ProcessTimeline {
  recordId: string;
  vehicleCode: string;
  driverName: string;
  operatorName: string;
  currentStep: number;
  steps: ProcessStep[];
  totalDuration: number;
  startTime: Date;
  lastUpdate: Date;
  isActive: boolean;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'parado',
    status: 'parado',
    label: 'Quebra Identificada',
    icon: '🚨',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    order: 0,
    estimatedDuration: 15
  },
  {
    id: 'aguardando_tecnico',
    status: 'aguardando_tecnico',
    label: 'Aguardando Técnico',
    icon: '🔧',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    order: 1,
    estimatedDuration: 45
  },
  {
    id: 'aguardando_mecanico',
    status: 'aguardando_mecanico',
    label: 'Aguardando Mecânico',
    icon: '⚙️',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    order: 2,
    estimatedDuration: 60
  },
  {
    id: 'manutencao_sem_previsao',
    status: 'manutencao_sem_previsao',
    label: 'Manutenção',
    icon: '🔨',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    order: 3,
    estimatedDuration: 120
  },
  {
    id: 'sem_previsao',
    status: 'sem_previsao',
    label: 'Sem Previsão',
    icon: '❓',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
    order: 4,
    estimatedDuration: 180
  },
  {
    id: 'transbordo_troca_cavalo',
    status: 'transbordo_troca_cavalo',
    label: 'Preparando Transbordo',
    icon: '🚛',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    order: 5,
    estimatedDuration: 45
  },
  {
    id: 'transbordo_em_andamento',
    status: 'transbordo_em_andamento',
    label: 'Transbordo em Andamento',
    icon: '📦',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100',
    order: 6,
    estimatedDuration: 120
  },
  {
    id: 'transbordo_finalizado',
    status: 'transbordo_finalizado',
    label: 'Transbordo Concluído',
    icon: '✅',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
    order: 7,
    estimatedDuration: 20
  },
  {
    id: 'reinicio_viagem',
    status: 'reinicio_viagem',
    label: 'Reiniciando Viagem',
    icon: '🚀',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    order: 8,
    estimatedDuration: 10
  },
  {
    id: 'finalizado',
    status: 'finalizado',
    label: 'Processo Finalizado',
    icon: '🏁',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
    order: 9,
    estimatedDuration: 0
  }
];

interface LogisticsRoadmapProps {
  records: LogisticsRecord[];
  onRecordSelect?: (recordId: string) => void;
  selectedRecordId?: string | null;
}

export function LogisticsRoadmap({ records, onRecordSelect, selectedRecordId }: LogisticsRoadmapProps) {
  const [timelines, setTimelines] = useState<ProcessTimeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<ProcessTimeline | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const [currentTimes, setCurrentTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    generateTimelines();
  }, [records]);

  useEffect(() => {
    if (selectedRecordId) {
      const timeline = timelines.find(t => t.recordId === selectedRecordId);
      setSelectedTimeline(timeline || null);
    } else if (timelines.length > 0) {
      setSelectedTimeline(timelines[0]);
    }
  }, [selectedRecordId, timelines]);

  useEffect(() => {
    if (isAutoPlay && timelines.length > 0) {
      const interval = setInterval(() => {
        setAutoPlayIndex(prev => {
          const nextIndex = (prev + 1) % timelines.length;
          setSelectedTimeline(timelines[nextIndex]);
          return nextIndex;
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlay, timelines]);

  // Atualizar tempos em tempo real
  useEffect(() => {
    const updateTimes = () => {
      const times: Record<string, number> = {};
      timelines.forEach(timeline => {
        if (timeline.isActive) {
          const elapsed = Math.floor((new Date().getTime() - timeline.lastUpdate.getTime()) / 1000);
          times[timeline.recordId] = elapsed;
        }
      });
      setCurrentTimes(times);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [timelines]);

  const generateTimelines = () => {
    const activeRecords = records.filter(record => 
      record.status !== 'resolvido' && 
      record.status !== 'finalizado' &&
      record.status !== 'reinicio_viagem' // Considerar reinicio_viagem como ativo mas próximo do fim
    );

    const newTimelines: ProcessTimeline[] = activeRecords.map(record => {
      const currentStepIndex = PROCESS_STEPS.findIndex(step => step.status === record.status);
      const totalElapsed = Math.floor((new Date().getTime() - new Date(record.created_at).getTime()) / 1000);

      return {
        recordId: record.id,
        vehicleCode: record.vehicle_code,
        driverName: record.driver_name,
        operatorName: record.operator_name,
        currentStep: Math.max(0, currentStepIndex),
        steps: PROCESS_STEPS,
        totalDuration: totalElapsed,
        startTime: new Date(record.created_at),
        lastUpdate: new Date(record.updated_at || record.created_at),
        isActive: record.status !== 'finalizado' && 
                 record.status !== 'resolvido' && 
                 record.status !== 'reinicio_viagem'
      };
    });

    setTimelines(newTimelines);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStepProgress = (timeline: ProcessTimeline, stepIndex: number): 'completed' | 'current' | 'pending' => {
    if (stepIndex < timeline.currentStep) return 'completed';
    if (stepIndex === timeline.currentStep) return 'current';
    return 'pending';
  };

  const calculateETA = (timeline: ProcessTimeline): string => {
    const remainingSteps = PROCESS_STEPS.slice(timeline.currentStep + 1);
    const estimatedMinutes = remainingSteps.reduce((total, step) => total + step.estimatedDuration, 0);
    const etaTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    return etaTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getProgressPercentage = (timeline: ProcessTimeline): number => {
    return Math.round(((timeline.currentStep + 1) / PROCESS_STEPS.length) * 100);
  };

  if (timelines.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Processo Ativo</h3>
          <p className="text-gray-500">
            Não há processos logísticos em andamento no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hidden lg:block">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Roadmap de Processos Logísticos
            </h3>
            <p className="text-sm text-gray-600">
              Acompanhe o progresso de cada processo através da linha do tempo
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Processos Ativos</div>
              <div className="text-2xl font-bold text-blue-600">{timelines.length}</div>
            </div>
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isAutoPlay 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isAutoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isAutoPlay ? 'Pausar' : 'Auto Play'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Process Selector */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            Selecione um processo para visualizar detalhes:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timelines.map((timeline, index) => (
              <button
                key={timeline.recordId}
                onClick={() => {
                  setSelectedTimeline(timeline);
                  setIsAutoPlay(false);
                  if (onRecordSelect) {
                    onRecordSelect(timeline.recordId);
                  }
                }}
                className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                  selectedTimeline?.recordId === timeline.recordId
                    ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                    : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-25'
                } ${isAutoPlay && index === autoPlayIndex ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900">{timeline.vehicleCode}</div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(timeline.totalDuration + (currentTimes[timeline.recordId] || 0))}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{timeline.driverName}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-lg">
                      {PROCESS_STEPS[timeline.currentStep]?.icon || '⚡'}
                    </div>
                    <div className="text-xs font-medium text-gray-700">
                      {PROCESS_STEPS[timeline.currentStep]?.label || 'Status Desconhecido'}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {getProgressPercentage(timeline)}%
                  </div>
                </div>
                
                {/* Mini Progress Bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage(timeline)}%` }}
                  ></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Timeline Details */}
        {selectedTimeline && (
          <div className="space-y-6">
            {/* Timeline Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {selectedTimeline.vehicleCode} - {selectedTimeline.driverName}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Operador: <span className="font-medium">{selectedTimeline.operatorName}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Tempo Total</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatDuration(selectedTimeline.totalDuration + (currentTimes[selectedTimeline.recordId] || 0))}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-900">Início</span>
                  </div>
                  <div className="text-sm font-bold text-blue-700">
                    {selectedTimeline.startTime.toLocaleString('pt-BR')}
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-900">Progresso</span>
                  </div>
                  <div className="text-sm font-bold text-green-700">
                    {getProgressPercentage(selectedTimeline)}% Concluído
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-900">ETA</span>
                  </div>
                  <div className="text-sm font-bold text-purple-700">
                    {calculateETA(selectedTimeline)}
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-900">Etapa Atual</span>
                  </div>
                  <div className="text-sm font-bold text-orange-700">
                    {selectedTimeline.currentStep + 1} / {PROCESS_STEPS.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Visualization */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h5 className="text-lg font-semibold text-gray-900 mb-6">Linha do Tempo do Processo</h5>
              
              <div className="relative">
                {/* Timeline Steps */}
                <div className="flex items-center justify-between">
                  {PROCESS_STEPS.map((step, index) => {
                    const progress = getStepProgress(selectedTimeline, index);
                    const isLast = index === PROCESS_STEPS.length - 1;

                    return (
                      <React.Fragment key={step.id}>
                        {/* Step Circle */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-500 ${
                              progress === 'completed'
                                ? 'bg-green-500 border-green-500 text-white shadow-lg transform scale-110'
                                : progress === 'current'
                                ? `${step.bgColor} border-4 border-blue-500 shadow-xl transform scale-125 animate-pulse`
                                : 'bg-gray-100 border-gray-300 text-gray-400'
                            }`}
                          >
                            {progress === 'completed' ? (
                              <CheckCircle className="h-8 w-8" />
                            ) : (
                              <span className={progress === 'current' ? 'animate-bounce' : ''}>{step.icon}</span>
                            )}
                          </div>
                          
                          {/* Step Label */}
                          <div className="mt-3 text-center max-w-24">
                            <div
                              className={`text-xs font-medium ${
                                progress === 'current' ? 'text-blue-600' : 
                                progress === 'completed' ? 'text-green-600' : 'text-gray-500'
                              }`}
                            >
                              {step.label}
                            </div>
                            {progress === 'current' && (
                              <div className="text-xs text-blue-500 mt-1 animate-pulse">
                                EM ANDAMENTO
                              </div>
                            )}
                            {progress === 'completed' && (
                              <div className="text-xs text-green-500 mt-1">
                                CONCLUÍDO
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              ~{step.estimatedDuration}min
                            </div>
                          </div>
                        </div>

                        {/* Connector Line */}
                        {!isLast && (
                          <div className="flex-1 h-1 mx-4 relative">
                            <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                            <div
                              className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                                index < selectedTimeline.currentStep
                                  ? 'bg-green-500 w-full'
                                  : index === selectedTimeline.currentStep
                                  ? 'bg-blue-500 w-1/2 animate-pulse'
                                  : 'bg-gray-200 w-0'
                              }`}
                            ></div>
                            {index < selectedTimeline.currentStep && (
                              <ArrowRight className="absolute top-1/2 right-2 transform -translate-y-1/2 h-4 w-4 text-green-600 animate-bounce" />
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Overall Progress Bar */}
                <div className="mt-8 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: `${getProgressPercentage(selectedTimeline)}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white bg-opacity-20 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Início do Processo</span>
                  <span className="font-medium text-blue-600">
                    {getProgressPercentage(selectedTimeline)}% Concluído
                  </span>
                  <span>Processo Finalizado</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}