import React, { useState } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { OccurrenceHistoryEntry } from '../types/user';
import { StatusBadge } from './StatusBadge';
import { StatusChangeModal } from './StatusChangeModal';
import { LogisticsCardView } from './LogisticsCardView';
import { ViewModeToggle } from './ViewModeToggle';
import { useViewMode } from '../hooks/useViewMode';
import { STATUS_CONFIGS } from '../types/tracking';
import { OccurrenceService } from '../lib/occurrenceService';
import { useAuth } from '../hooks/useAuth';
import { ExternalLink, Edit, Trash2, Save, X, Activity, Check, Square, Siren, AlertTriangle, History } from 'lucide-react';

interface LogisticsTableProps {
  records: LogisticsRecord[];
  onUpdateStatus: (recordId: string, newStatus: string) => void;
  onUpdateRecord?: (recordId: string, updates: Partial<LogisticsRecord>) => void;
  onDeleteRecord?: (recordId: string) => void;
  onDeleteMultipleRecords?: (recordIds: string[]) => void;
  highlightedRecordId?: string | null;
  onOpenTracking?: (recordId: string) => void;
  onOpenOccurrenceManager?: (recordId: string) => void;
}

export function LogisticsTable({ 
  records, 
  onUpdateStatus, 
  onUpdateRecord, 
  onDeleteRecord, 
  onDeleteMultipleRecords,
  highlightedRecordId, 
  onOpenTracking,
  onOpenOccurrenceManager
}: LogisticsTableProps) {
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LogisticsRecord>>({});
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [occurrenceData, setOccurrenceData] = useState<Record<string, OccurrenceHistoryEntry[]>>({});
  const [selectedRecordForStatusChange, setSelectedRecordForStatusChange] = useState<{
    id: string;
    currentStatus: string;
    vehicleCode: string;
  } | null>(null);
  
  const { hasPermission } = useAuth();
  const { viewMode, isPinned, setViewMode, togglePin } = useViewMode('arrow');

  // Carregar dados de ocorrências
  React.useEffect(() => {
    loadOccurrenceData();
  }, [records]);

  const loadOccurrenceData = async () => {
    try {
      const occurrenceMap: Record<string, OccurrenceHistoryEntry[]> = {};
      
      for (const record of records) {
        const occurrences = await OccurrenceService.getOccurrencesByRecord(record.id);
        occurrenceMap[record.id] = occurrences;
      }
      
      setOccurrenceData(occurrenceMap);
    } catch (error) {
      console.error('Erro ao carregar dados de ocorrências:', error);
    }
  };
  // Sort records by creation date (oldest first) and apply status filter
  const filteredAndSortedRecords = React.useMemo(() => {
    let filtered = records;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = records.filter(record => record.status === statusFilter);
    }
    
    // Sort by creation date (oldest first)
    return filtered.sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [records, statusFilter]);

  // Get the 3 oldest records for siren animation
  const oldestRecords = React.useMemo(() => {
    const activeRecords = filteredAndSortedRecords.filter(record => 
      record.status !== 'finalizado' && record.status !== 'resolvido'
    );
    return new Set(activeRecords.slice(0, 3).map(record => record.id));
  }, [filteredAndSortedRecords]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const calculateStoppedTime = (createdAt: string, status: string) => {
    if (status === 'resolvido') return 'Finalizado';
    if (status === 'em_transito') return 'Em movimento';
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const handleStatusChange = (recordId: string, newStatus: string) => {
    // Esta função agora será chamada apenas pelo modal
    onUpdateStatus(recordId, newStatus);
  };

  const handleStatusChangeWithOccurrence = async (newStatus: string, occurrenceText: string, operatorName: string) => {
    if (!selectedRecordForStatusChange) return;

    try {
      // Alterar o status primeiro
      await handleStatusChange(selectedRecordForStatusChange.id, newStatus);
      
      // Depois, adicionar a ocorrência em background
      try {
        await OccurrenceService.addOccurrence(
          selectedRecordForStatusChange.id,
          `Mudança de status: ${STATUS_CONFIGS[selectedRecordForStatusChange.currentStatus as keyof typeof STATUS_CONFIGS]?.label} → ${STATUS_CONFIGS[newStatus as keyof typeof STATUS_CONFIGS]?.label}`,
          occurrenceText,
          'geral',
          'media',
          operatorName
        );
        
        // Recarregar dados de ocorrências
        await loadOccurrenceData();
      } catch (occurrenceError) {
        console.warn('Erro ao adicionar ocorrência:', occurrenceError);
        // Não falhar a operação principal se a ocorrência falhar
      }
    } catch (error) {
      console.error('Erro ao alterar status com ocorrência:', error);
      throw error;
    }
  };

  const handleEdit = (record: LogisticsRecord) => {
    if (!hasPermission('canEdit')) {
      alert('Você não tem permissão para editar registros');
      return;
    }
    setEditingRecord(record.id);
    setEditData(record);
  };

  const handleSave = async () => {
    if (editingRecord && onUpdateRecord) {
      try {
        await onUpdateRecord(editingRecord, editData);
        setEditingRecord(null);
        setEditData({});
      } catch (error) {
        console.error('Error updating record:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditingRecord(null);
    setEditData({});
  };

  const handleDelete = async (recordId: string) => {
    if (!hasPermission('canDelete')) {
      alert('Você não tem permissão para deletar registros');
      return;
    }
    
    if (onDeleteRecord && window.confirm('Tem certeza que deseja deletar este registro?')) {
      try {
        await onDeleteRecord(recordId);
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };

  const handleFieldChange = (field: keyof LogisticsRecord, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  const handleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.size === 0) return;
    
    if (!hasPermission('canDelete')) {
      alert('Você não tem permissão para deletar registros');
      return;
    }
    
    if (onDeleteMultipleRecords) {
      try {
        await onDeleteMultipleRecords(Array.from(selectedRecords));
        setSelectedRecords(new Set());
        setShowDeleteConfirmation(false);
      } catch (error) {
        console.error('Error deleting multiple records:', error);
      }
    }
  };

  const getOccurrenceInfo = (recordId: string) => {
    const occurrences = occurrenceData[recordId] || [];
    const totalOccurrences = occurrences.length;
    const openOccurrences = occurrences.filter(occ => occ.status === 'aberta' || occ.status === 'em_andamento').length;
    const totalHours = occurrences.reduce((sum, occ) => sum + (occ.duration_hours || 0), 0);
    
    return {
      total: totalOccurrences,
      open: openOccurrences,
      totalHours,
      hasOccurrences: totalOccurrences > 0
    };
  };

  const renderEditableCell = (record: LogisticsRecord, field: keyof LogisticsRecord, value: string) => {
    if (editingRecord === record.id) {
      return (
        <input
          type="text"
          value={editData[field] as string || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    }
    return <span className="text-sm text-gray-900">{value}</span>;
  };

  const getStatusGradientClass = (status: string) => {
    switch (status) {
      case 'parado': return 'status-gradient-parado';
      case 'em_transito': return 'status-gradient-em-transito';
      case 'resolvido': return 'status-gradient-resolvido';
      case 'aguardando_tecnico': return 'status-gradient-aguardando-tecnico';
      case 'em_manutencao': return 'status-gradient-em-manutencao';
      case 'sem_previsao': return 'status-gradient-sem-previsao';
      default: return '';
    }
  };

  const isRecordInactive = (record: LogisticsRecord): boolean => {
    if (record.status === 'resolvido' || record.status === 'finalizado') {
      return false;
    }
    
    const createdTime = new Date(record.created_at);
    const now = new Date();
    const timeSinceCreation = now.getTime() - createdTime.getTime();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutos em ms
    
    return timeSinceCreation >= thirtyMinutes;
  };
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum registro encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hidden lg:block">
      {/* Status Filter */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filtrar por Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos os Status</option>
            {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
              <option key={status} value={status}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-600">
            Mostrando {filteredAndSortedRecords.length} registro{filteredAndSortedRecords.length !== 1 ? 's' : ''} 
            (ordenados do mais antigo para o mais recente)
          </div>
          </div>
          
          {/* View Mode Toggle */}
          <ViewModeToggle 
            currentMode={viewMode} 
            onModeChange={setViewMode}
            isPinned={isPinned}
            onPinToggle={togglePin}
            className="ml-4"
          />
        </div>
      </div>

      {/* Selection Controls */}
      {selectedRecords.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedRecords.size} registro{selectedRecords.size !== 1 ? 's' : ''} selecionado{selectedRecords.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedRecords(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Limpar seleção
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Deletar Selecionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja deletar {selectedRecords.size} registro{selectedRecords.size !== 1 ? 's' : ''}? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sim, Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {selectedRecordForStatusChange && (
        <StatusChangeModal
          isOpen={true}
          onClose={() => setSelectedRecordForStatusChange(null)}
          currentStatus={selectedRecordForStatusChange.currentStatus}
          vehicleCode={selectedRecordForStatusChange.vehicleCode}
          onConfirm={handleStatusChangeWithOccurrence}
        />
      )}

      {/* Render based on view mode */}
      {viewMode === 'card' ? (
        <LogisticsCardView
          records={records}
          onUpdateStatus={onUpdateStatus}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onDeleteMultipleRecords={onDeleteMultipleRecords}
          highlightedRecordId={highlightedRecordId}
          onOpenTracking={onOpenTracking}
          onOpenOccurrenceManager={onOpenOccurrenceManager}
          selectedRecords={selectedRecords}
          onSelectRecord={handleSelectRecord}
          onSelectAll={handleSelectAll}
          statusFilter={statusFilter}
          occurrenceData={occurrenceData}
        />
      ) : (
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 logistics-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center justify-center w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors"
                  title={selectedRecords.size === records.length ? "Desmarcar todos" : "Selecionar todos"}
                >
                  {selectedRecords.size === records.length ? (
                    <Check className="h-3 w-3 text-blue-600" />
                  ) : selectedRecords.size > 0 ? (
                    <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
                  ) : null}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora Registro</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LH TRIP</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRT Interno</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motorista</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa Cavalo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa Carreta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Atual</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo Parado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tecnologia</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço Quebra</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link Maps</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ocorrência</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA Origem Prazo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA Origem Endereço</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPT Prazo Liberação</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA Destino Prazo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA Destino Endereço</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distância Restante</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previsão Chegada</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nova Previsão Chegada</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo de Finalização</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedRecords.map((record, index) => (
              <tr 
                key={record.id} 
                className={`transition-all duration-500 ${
                  highlightedRecordId === record.id 
                    ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-500 shadow-lg animate-pulse' 
                    : isRecordInactive(record)
                    ? 'hover:bg-gray-50 ring-2 ring-red-500 ring-opacity-50 bg-red-50 animate-pulse'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectRecord(record.id)}
                    className="flex items-center justify-center w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors"
                  >
                    {selectedRecords.has(record.id) ? (
                      <Check className="h-3 w-3 text-blue-600" />
                    ) : null}
                  </button>
                    {oldestRecords.has(record.id) && (
                      <div className="animate-bounce" title="Registro crítico - necessita atenção urgente">
                        <Siren className="h-4 w-4 text-red-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    #{record.id.slice(-6)}
                    {oldestRecords.has(record.id) && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-bold animate-pulse">
                        CRÍTICO
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <div className="max-w-xs break-words whitespace-pre-wrap overflow-hidden">
                    {renderEditableCell(record, 'operator_name', record.operator_name)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(record.created_at)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {renderEditableCell(record, 'vehicle_code', record.vehicle_code)}
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'vehicle_profile', record.vehicle_profile)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {renderEditableCell(record, 'internal_prt', record.internal_prt)}
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-pre-wrap overflow-hidden">
                    {renderEditableCell(record, 'driver_name', record.driver_name)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {renderEditableCell(record, 'truck_plate', record.truck_plate)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {renderEditableCell(record, 'trailer_plate', record.trailer_plate)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {editingRecord === record.id ? (
                    <select
                      value={editData.status || record.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                        <option key={status} value={status}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className={`p-2 rounded-lg ${getStatusGradientClass(record.status)} transition-all duration-300 hover:shadow-md`}>
                        <StatusBadge status={record.status} size="sm" />
                      </div>
                      <select
                        value={record.status}
                        onChange={(e) => {
                          e.preventDefault();
                          setSelectedRecordForStatusChange({
                            id: record.id,
                            currentStatus: record.status,
                            vehicleCode: record.vehicle_code
                          });
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-blue-400"
                      >
                        {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                          <option key={status} value={status}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      record.status === 'resolvido' ? 'bg-green-400' :
                      record.status === 'em_transito' ? 'bg-blue-400 animate-pulse' :
                      'bg-red-400 animate-pulse'
                    }`}></div>
                    {calculateStoppedTime(record.created_at, record.status)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'technology', record.technology)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'current_address', record.current_address)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {editingRecord === record.id ? (
                    <input
                      type="url"
                      value={editData.maps_link || ''}
                      onChange={(e) => handleFieldChange('maps_link', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  ) : (
                    record.maps_link && (
                      <a 
                        href={record.maps_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200 hover:scale-110 inline-block"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )
                  )}
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs">
                    {(() => {
                      const occInfo = getOccurrenceInfo(record.id);
                      return (
                        <div className="space-y-1">
                          <div className="overflow-hidden whitespace-nowrap text-ellipsis" title={record.occurrence_description}>
                            {renderEditableCell(record, 'occurrence_description', record.occurrence_description)}
                          </div>
                          {occInfo.hasOccurrences && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-yellow-700">
                                  📋 {occInfo.total} ocorrências
                                </span>
                                <span className="font-bold text-yellow-800">
                                  ⏱️ {OccurrenceService.formatDuration(occInfo.totalHours)}
                                </span>
                              </div>
                              <div className="text-xs text-yellow-600 mt-1">
                                {occInfo.open} abertas • {occInfo.total - occInfo.open} resolvidas
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenOccurrenceManager) {
                                    onOpenOccurrenceManager(record.id);
                                  }
                                }}
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Gerenciar →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal">
                    {renderEditableCell(record, 'eta_origin_deadline', formatDate(record.eta_origin_deadline))}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal">
                    {renderEditableCell(record, 'eta_origin_address', record.eta_origin_address)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'cpt_release_deadline', formatDate(record.cpt_release_deadline))}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'eta_destination_deadline', formatDate(record.eta_destination_deadline))}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'eta_destination_address', record.eta_destination_address)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-1 overflow-hidden">
                    {renderEditableCell(record, 'remaining_distance', record.remaining_distance)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'arrival_prediction', formatDate(record.arrival_prediction))}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {renderEditableCell(record, 'new_arrival_prediction', record.new_arrival_prediction || 'N/A')}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.completion_time || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <div className="max-w-xs break-words whitespace-normal line-clamp-2 overflow-hidden">
                    {editingRecord === record.id ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="p-1 text-green-600 hover:text-green-800 transition-all duration-200 hover:scale-110"
                          title="Salvar"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-110"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {hasPermission('canManageOccurrences') && onOpenOccurrenceManager && (
                          <button
                            onClick={() => onOpenOccurrenceManager(record.id)}
                            className="p-1 text-orange-600 hover:text-orange-800 transition-all duration-200 hover:scale-110 relative"
                            title="Gerenciar Ocorrências"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            {(() => {
                              const occInfo = getOccurrenceInfo(record.id);
                              return occInfo.total > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                  {occInfo.total}
                                </span>
                              );
                            })()}
                          </button>
                        )}
                        {onOpenTracking && (
                          <button
                            onClick={() => onOpenTracking(record.id)}
                            className="p-1 text-purple-600 hover:text-purple-800 transition-all duration-200 hover:scale-110"
                            title="Abrir Rastreamento Temporal"
                          >
                            <Activity className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('canEdit') && (
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-all duration-200 hover:scale-110"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('canDelete') && onDeleteRecord && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-all duration-200 hover:scale-110"
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

    </div>
  );
}