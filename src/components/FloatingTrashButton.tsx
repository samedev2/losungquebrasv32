import React, { useState, useEffect, useRef } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { Trash2, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface FloatingTrashButtonProps {
  records: LogisticsRecord[];
  onDeleteRecords: (recordIds: string[]) => Promise<void>;
}

interface ConfirmationState {
  isOpen: boolean;
  selectedRecords: LogisticsRecord[];
  step: 'selection' | 'confirmation' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export function FloatingTrashButton({ records, onDeleteRecords }: FloatingTrashButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    selectedRecords: [],
    step: 'selection'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter records for deletion (exclude active critical processes)
  const deletableRecords = records.filter(record => 
    record.status === 'finalizado' || 
    record.status === 'resolvido' ||
    // Allow deletion of old records (older than 24 hours) regardless of status
    (new Date().getTime() - new Date(record.created_at).getTime()) > 24 * 60 * 60 * 1000
  );

  // Filter records based on search term
  const filteredRecords = deletableRecords.filter(record =>
    record.vehicle_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.occurrence_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isModalOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseModal();
      }
    };

    if (isModalOpen || confirmation.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isModalOpen, confirmation.isOpen]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedRecordIds(new Set());
    setSearchTerm('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConfirmation({ isOpen: false, selectedRecords: [], step: 'selection' });
    setSelectedRecordIds(new Set());
    setSearchTerm('');
  };

  const handleRecordToggle = (recordId: string) => {
    const newSelected = new Set(selectedRecordIds);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecordIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecordIds.size === filteredRecords.length) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const handleProceedToConfirmation = () => {
    const selectedRecords = records.filter(r => selectedRecordIds.has(r.id));
    setConfirmation({
      isOpen: true,
      selectedRecords,
      step: 'confirmation'
    });
  };

  const handleConfirmDeletion = async () => {
    setConfirmation(prev => ({ ...prev, step: 'processing' }));
    
    try {
      const recordIdsArray = Array.from(selectedRecordIds);
      console.log('Iniciando exclusão de registros:', recordIdsArray);
      
      await onDeleteRecords(recordIdsArray);
      
      console.log('Exclusão concluída com sucesso');
      setConfirmation(prev => ({ ...prev, step: 'success' }));
      
      // Auto-close after success
      setTimeout(() => {
        handleCloseModal();
      }, 3000);
    } catch (error) {
      console.error('Erro durante exclusão:', error);
      setConfirmation(prev => ({ 
        ...prev, 
        step: 'error',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getRecordAge = (createdAt: string) => {
    const ageMs = new Date().getTime() - new Date(createdAt).getTime();
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const ageHours = Math.floor((ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (ageDays > 0) {
      return `${ageDays}d ${ageHours}h`;
    }
    return `${ageHours}h`;
  };

  // Don't render if no deletable records
  if (deletableRecords.length === 0) {
    // Renderizar apenas para administradores, mesmo sem registros deletáveis
    return (
      <div className="fixed bottom-6 right-4 z-40">
        <div className="bg-gray-100 text-gray-500 p-3 rounded-full shadow-lg cursor-not-allowed" title="Nenhum registro disponível para exclusão">
          <Trash2 className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleOpenModal}
        className="floating-trash-button"
        aria-label="Gerenciar exclusão de registros"
        title="Excluir registros antigos"
      >
        <Trash2 className="h-5 w-5" />
        {deletableRecords.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {deletableRecords.length}
          </span>
        )}
      </button>

      {/* Main Modal */}
      {isModalOpen && (
        <div className="trash-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="trash-modal-title">
          <div ref={modalRef} className="trash-modal">
            {/* Header */}
            <div className="trash-modal-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="trash-modal-title" className="text-lg font-semibold text-red-800 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Gerenciar Exclusões
                  </h2>
                  <p className="text-sm text-red-600 mt-1">
                    {deletableRecords.length} registro{deletableRecords.length !== 1 ? 's' : ''} disponível{deletableRecords.length !== 1 ? 'eis' : ''} para exclusão
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="trash-modal-content">
              {/* Search and Controls */}
              <div className="mb-4 space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Buscar por veículo, motorista, operador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    {selectedRecordIds.size === filteredRecords.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedRecordIds.size} de {filteredRecords.length} selecionados
                  </span>
                </div>
              </div>

              {/* Records List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum registro encontrado</p>
                  </div>
                ) : (
                  filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`record-item ${selectedRecordIds.has(record.id) ? 'selected' : ''}`}
                      onClick={() => handleRecordToggle(record.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecordIds.has(record.id)}
                        onChange={() => handleRecordToggle(record.id)}
                        className="record-checkbox"
                        aria-label={`Selecionar registro ${record.vehicle_code}`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900">{record.vehicle_code}</span>
                          <span className="text-xs text-gray-500">
                            {getRecordAge(record.created_at)} atrás
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {record.driver_name} • {record.operator_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Status: {record.status} • {formatDate(record.created_at)}
                        </div>
                        {record.occurrence_description && (
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            {record.occurrence_description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Warning */}
              {selectedRecordIds.size > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Atenção!</p>
                      <p className="text-yellow-700">
                        Esta ação não pode ser desfeita. Os {selectedRecordIds.size} registro{selectedRecordIds.size !== 1 ? 's' : ''} selecionado{selectedRecordIds.size !== 1 ? 's' : ''} e todo seu histórico serão permanentemente removidos do banco de dados.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="trash-modal-footer">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProceedToConfirmation}
                disabled={selectedRecordIds.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Excluir {selectedRecordIds.size} Registro{selectedRecordIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmation.isOpen && (
        <div className="trash-modal-overlay">
          <div className="confirmation-modal">
            {confirmation.step === 'confirmation' && (
              <>
                <div className="danger-icon">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirmar Exclusão
                </h3>
                <p className="text-gray-600 mb-4">
                  Tem certeza que deseja excluir <strong>{confirmation.selectedRecords.length}</strong> registro{confirmation.selectedRecords.length !== 1 ? 's' : ''}?
                </p>
                <p className="text-sm text-red-600 mb-6">
                  Esta ação é irreversível e todos os dados serão perdidos permanentemente.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Não, Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDeletion}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </>
            )}

            {confirmation.step === 'processing' && (
              <>
                <div className="danger-icon">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Excluindo Registros...
                </h3>
                <p className="text-gray-600">
                  Por favor, aguarde enquanto os registros são removidos.
                </p>
              </>
            )}

            {confirmation.step === 'success' && (
              <>
                <div className="danger-icon bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Exclusão Concluída!
                </h3>
                <p className="text-gray-600">
                  {confirmation.selectedRecords.length} registro{confirmation.selectedRecords.length !== 1 ? 's foram' : ' foi'} excluído{confirmation.selectedRecords.length !== 1 ? 's' : ''} com sucesso.
                </p>
                <button
                  onClick={handleCloseModal}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Fechar
                </button>
              </>
            )}

            {confirmation.step === 'error' && (
              <>
                <div className="danger-icon">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Erro na Exclusão
                </h3>
                <p className="text-gray-600 mb-4">
                  Ocorreu um erro ao excluir os registros:
                </p>
                <p className="text-sm text-red-600 mb-6">
                  {confirmation.errorMessage}
                </p>
                <button
                  onClick={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}