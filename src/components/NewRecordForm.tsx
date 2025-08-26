import React, { useState } from 'react';
import { parseWhatsAppMessage } from '../utils/messageParser';
import { LogisticsRecord } from '../types/logistics';
import { TrackingService } from '../lib/trackingService';
import { MessageSquare, Plus, X, User } from 'lucide-react';

interface NewRecordFormProps {
  onSubmit: (record: Partial<LogisticsRecord>) => void;
  onCancel: () => void;
}

export function NewRecordForm({ onSubmit, onCancel }: NewRecordFormProps) {
  const [message, setMessage] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !operatorName.trim()) return;

    setIsLoading(true);
    try {
      const parsedData = parseWhatsAppMessage(message, operatorName);
      await onSubmit(parsedData);
      setMessage('');
      setOperatorName('');
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    if (!message.trim() || !operatorName.trim()) return;
    const parsedData = parseWhatsAppMessage(message, operatorName);
    console.log('Dados extraídos:', parsedData);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <MessageSquare className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Nova Quebra de Veículo</h2>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Operador Responsável
          </label>
          <input
            id="operator"
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o nome do operador responsável"
            required
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem do WhatsApp
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Cole aqui a mensagem completa do WhatsApp..."
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!message.trim() || !operatorName.trim()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Visualizar Dados
          </button>
          <button
            type="submit"
            disabled={isLoading || !message.trim() || !operatorName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Registrar Quebra
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}