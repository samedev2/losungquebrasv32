import React, { useState } from 'react';
import { STATUS_CONFIGS, TrackingStatus } from '../types/tracking';
import { AlertTriangle, Save, X, FileText, User, RotateCcw } from 'lucide-react';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  vehicleCode: string;
  onConfirm: (newStatus: string, occurrenceText: string, operatorName: string) => Promise<void>;
}

export function StatusChangeModal({ 
  isOpen, 
  onClose, 
  currentStatus, 
  vehicleCode, 
  onConfirm 
}: StatusChangeModalProps) {
  const [newStatus, setNewStatus] = useState<string>('');
  const [occurrenceText, setOccurrenceText] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStatus || !occurrenceText.trim() || !operatorName.trim()) {
      alert('Todos os campos são obrigatórios');
      return;
    }

    if (newStatus === currentStatus) {
      alert('O novo status deve ser diferente do status atual');
      return;
    }

    setIsSubmitting(true);
    try {
      // Primeiro, alterar o status
      await onConfirm(newStatus, occurrenceText.trim(), operatorName.trim());
      
      // Aguardar um pouco para garantir que a operação foi concluída
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      handleClose();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao alterar status: ${errorMessage}. Tente novamente.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewStatus('');
    setOccurrenceText('');
    setOperatorName('');
    onClose();
  };

  const isFormValid = newStatus && occurrenceText.trim() && operatorName.trim() && newStatus !== currentStatus;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <RotateCcw className="h-6 w-6" />
                Alterar Status - {vehicleCode}
              </h2>
              <p className="text-blue-100 mt-1">
                Status atual: <span className="font-medium">{STATUS_CONFIGS[currentStatus as keyof typeof STATUS_CONFIGS]?.label || currentStatus}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Atenção!</p>
                <p className="text-yellow-700 mt-1">
                  Para alterar o status é obrigatório registrar uma ocorrência explicando o motivo da mudança.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Novo Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <RotateCcw className="inline h-4 w-4 mr-1" />
                Novo Status *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione o novo status</option>
                {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                  <option 
                    key={status} 
                    value={status}
                    disabled={status === currentStatus}
                  >
                    {config.icon} {config.label}
                    {status === currentStatus ? ' (Status Atual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Operador Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Operador Responsável *
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite o nome do operador responsável"
                required
              />
            </div>

            {/* Ocorrência Obrigatória */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Descrição da Ocorrência *
              </label>
              <textarea
                value={occurrenceText}
                onChange={(e) => setOccurrenceText(e.target.value)}
                rows={4}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva detalhadamente o motivo da mudança de status..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 10 caracteres. Esta informação será registrada no histórico de ocorrências.
              </p>
            </div>

            {/* Preview da mudança */}
            {newStatus && newStatus !== currentStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Preview da Mudança</h4>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_CONFIGS[currentStatus as keyof typeof STATUS_CONFIGS]?.bgColor || 'bg-gray-100'} ${STATUS_CONFIGS[currentStatus as keyof typeof STATUS_CONFIGS]?.color || 'text-gray-800'}`}>
                    {STATUS_CONFIGS[currentStatus as keyof typeof STATUS_CONFIGS]?.icon} {STATUS_CONFIGS[currentStatus as keyof typeof STATUS_CONFIGS]?.label || currentStatus}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_CONFIGS[newStatus as keyof typeof STATUS_CONFIGS]?.bgColor || 'bg-gray-100'} ${STATUS_CONFIGS[newStatus as keyof typeof STATUS_CONFIGS]?.color || 'text-gray-800'}`}>
                    {STATUS_CONFIGS[newStatus as keyof typeof STATUS_CONFIGS]?.icon} {STATUS_CONFIGS[newStatus as keyof typeof STATUS_CONFIGS]?.label || newStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Alterando Status...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Confirmar Alteração
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}