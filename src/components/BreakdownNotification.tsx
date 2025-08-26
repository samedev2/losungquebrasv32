import React from 'react';
import { LogisticsRecord } from '../types/logistics';
import { Truck, X, Volume2, VolumeX, AlertTriangle } from 'lucide-react';

interface BreakdownNotificationProps {
  isVisible: boolean;
  record: LogisticsRecord | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onDismiss: () => void;
}

export function BreakdownNotification({ 
  isVisible, 
  record, 
  soundEnabled, 
  onToggleSound, 
  onDismiss 
}: BreakdownNotificationProps) {
  if (!isVisible || !record) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-50 pointer-events-none">
        {/* Animação do carro quebrando */}
        <div className="breakdown-car-animation">
          <div className="car-container">
            {/* Carro */}
            <div className="car">
              <Truck className="h-12 w-12 text-red-600" />
              {/* Fumaça */}
              <div className="smoke smoke-1"></div>
              <div className="smoke smoke-2"></div>
              <div className="smoke smoke-3"></div>
              {/* Faíscas */}
              <div className="spark spark-1"></div>
              <div className="spark spark-2"></div>
              <div className="spark spark-3"></div>
            </div>
            {/* Rastro de óleo */}
            <div className="oil-trail"></div>
          </div>
        </div>

        {/* Notificação popup */}
        <div className="notification-popup">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-red-500 p-6 max-w-md w-full mx-4 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-800">🚨 NOVA QUEBRA DETECTADA!</h3>
                  <p className="text-sm text-red-600">Atenção imediata necessária</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleSound}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title={soundEnabled ? "Desativar som" : "Ativar som"}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  onClick={onDismiss}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Fechar notificação"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo da quebra */}
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-red-800">Veículo:</span>
                  <span className="font-bold text-red-900 text-lg">{record.vehicle_code}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-700">Motorista:</span>
                  <span className="font-medium text-red-800">{record.driver_name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-700">Operador:</span>
                  <span className="font-medium text-red-800">{record.operator_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-700">Horário:</span>
                  <span className="font-medium text-red-800">
                    {new Date(record.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {record.current_address && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm">
                    <span className="font-medium text-yellow-800">Local da Quebra:</span>
                    <p className="text-yellow-700 mt-1">{record.current_address}</p>
                  </div>
                </div>
              )}

              {record.occurrence_description && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="text-sm">
                    <span className="font-medium text-orange-800">Descrição:</span>
                    <p className="text-orange-700 mt-1">{record.occurrence_description}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Sistema de Notificações Losung</span>
                <span className="animate-pulse">🔔 Alerta Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .breakdown-car-animation {
          position: fixed;
          top: 50%;
          left: -100px;
          transform: translateY(-50%);
          animation: carBreakdown 5s ease-in-out;
          z-index: 51;
        }

        .car-container {
          position: relative;
          animation: carShake 0.5s infinite;
        }

        .car {
          position: relative;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .smoke {
          position: absolute;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, rgba(100, 100, 100, 0.8) 0%, transparent 70%);
          border-radius: 50%;
          animation: smokeRise 2s infinite;
        }

        .smoke-1 {
          top: -10px;
          right: -5px;
          animation-delay: 0s;
        }

        .smoke-2 {
          top: -15px;
          right: 5px;
          animation-delay: 0.3s;
        }

        .smoke-3 {
          top: -20px;
          right: -10px;
          animation-delay: 0.6s;
        }

        .spark {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ffff00;
          border-radius: 50%;
          animation: sparkFly 1s infinite;
        }

        .spark-1 {
          bottom: 0;
          left: 10px;
          animation-delay: 0s;
        }

        .spark-2 {
          bottom: 5px;
          left: 20px;
          animation-delay: 0.2s;
        }

        .spark-3 {
          bottom: -5px;
          left: 15px;
          animation-delay: 0.4s;
        }

        .oil-trail {
          position: absolute;
          bottom: -5px;
          left: -50px;
          width: 100px;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, #333 50%, transparent 100%);
          animation: oilSpill 3s ease-out;
        }

        .notification-popup {
          position: fixed;
          top: 20px;
          right: 20px;
          animation: notificationSlide 0.5s ease-out;
          z-index: 52;
        }

        @keyframes carBreakdown {
          0% {
            left: -100px;
            transform: translateY(-50%) rotate(0deg);
          }
          20% {
            left: 30%;
            transform: translateY(-50%) rotate(0deg);
          }
          25% {
            left: 30%;
            transform: translateY(-50%) rotate(-5deg);
          }
          30% {
            left: 30%;
            transform: translateY(-50%) rotate(5deg);
          }
          35% {
            left: 30%;
            transform: translateY(-50%) rotate(0deg);
          }
          80% {
            left: 30%;
            transform: translateY(-50%) rotate(0deg);
          }
          100% {
            left: calc(100% + 100px);
            transform: translateY(-50%) rotate(0deg);
          }
        }

        @keyframes carShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        @keyframes smokeRise {
          0% {
            opacity: 0.8;
            transform: translateY(0) scale(0.5);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(1.5);
          }
        }

        @keyframes sparkFly {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(20px, -20px) scale(0);
          }
        }

        @keyframes oilSpill {
          0% {
            width: 0;
            opacity: 0;
          }
          50% {
            width: 100px;
            opacity: 0.8;
          }
          100% {
            width: 150px;
            opacity: 0.3;
          }
        }

        @keyframes notificationSlide {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}