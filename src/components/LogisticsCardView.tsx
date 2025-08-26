import React, { useState } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { OccurrenceHistoryEntry } from '../types/user';
import { StatusBadge } from './StatusBadge';
import { StatusChangeModal } from './StatusChangeModal';
import { STATUS_CONFIGS } from '../types/tracking';
import { OccurrenceService } from '../lib/occurrenceService';
import { useAuth } from '../hooks/useAuth';
import { useViewMode } from '../hooks/useViewMode';
import { 
  ExternalLink, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Activity, 
  Check, 
  Square, 
  Siren, 
  AlertTriangle, 
  History,
  MapPin,
  User,
  Truck,
  Clock,
  Calendar,
  Phone,
  Wrench,
  Package,
  Navigation,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LogisticsCardViewProps {
  records: LogisticsRecord[];
  onUpdateStatus: (recordId: string, newStatus: string) => void;
  onUpdateRecord?: (recordId: string, updates: Partial<LogisticsRecord>) => void;
  onDeleteRecord?: (recordId: string) => void;
  onDeleteMultipleRecords?: (recordIds: string[]) => void;
  highlightedRecordId?: string | null;
  onOpenTracking?: (recordId: string) => void;
  onOpenOccurrenceManager?: (recordId: string) => void;
  selectedRecords: Set<string>;
  onSelectRecord: (recordId: string) => void;
  onSelectAll: () => void;
  statusFilter: string;
  occurrenceData: Record<string, OccurrenceHistoryEntry[]>;
}

export function LogisticsCardView({
  records,
  onUpdateStatus,
  onUpdateRecord,
  onDeleteRecord,
  onDeleteMultipleRecords,
  highlightedRecordId,
  onOpenTracking,
  onOpenOccurrenceManager,
  selectedRecords,
  onSelectRecord,
  onSelectAll,
  statusFilter,
  occurrenceData
}: LogisticsCardViewProps) {
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LogisticsRecord>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedRecordForStatusChange, setSelectedRecordForStatusChange] = useState<{
    id: string;
    currentStatus: string;
    vehicleCode: string;
  } | null>(null);
  
  const { hasPermission } = useAuth();
  const { isPinned } = useViewMode();

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
    if (status === 'resolvido' || status === 'finalizado') return 'Finalizado';
    if (status === 'reinicio_viagem') return 'Em movimento';
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const handleStatusChange = (recordId: string, newStatus: string) => {
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

  const toggleCardExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedCards(newExpanded);
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

  const renderEditableField = (record: LogisticsRecord, field: keyof LogisticsRecord, value: string, placeholder?: string) => {
    if (editingRecord === record.id) {
      return (
        <input
          type="text"
          value={editData[field] as string || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
        />
      );
    }
    return <span className="text-sm text-gray-900">{value || 'N/A'}</span>;
  };

  if (filteredAndSortedRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Truck className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
        <p className="text-gray-500">
          {statusFilter !== 'all' 
            ? 'Nenhum registro encontrado com o filtro aplicado'
            : 'Não há registros para exibir'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header with selection controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {isPinned && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">Modo Cards Fixado</span>
            </div>
          )}
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            title={selectedRecords.size === filteredAndSortedRecords.length ? "Desmarcar todos" : "Selecionar todos"}
          >
            {selectedRecords.size === filteredAndSortedRecords.length ? (
              <Check className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedRecords.size === filteredAndSortedRecords.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          
          {selectedRecords.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedRecords.size} registro{selectedRecords.size !== 1 ? 's' : ''} selecionado{selectedRecords.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          {filteredAndSortedRecords.length} registro{filteredAndSortedRecords.length !== 1 ? 's' : ''} 
          (ordenados do mais antigo para o mais recente)
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {filteredAndSortedRecords.map((record) => {
          const occInfo = getOccurrenceInfo(record.id);
          const isCritical = oldestRecords.has(record.id);
          const isInactive = isRecordInactive(record);
          const isExpanded = expandedCards.has(record.id);
          
          return (
            <div
              key={record.id}
              className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${
                highlightedRecordId === record.id
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300 shadow-lg'
                  : isCritical
                  ? 'ring-2 ring-red-500 bg-red-50 border-red-300 critical-record'
                  : isInactive
                  ? 'ring-2 ring-red-500 ring-opacity-50 bg-red-50 animate-pulse'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectRecord(record.id)}
                      className="flex items-center justify-center w-4 h-4 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors"
                    >
                      {selectedRecords.has(record.id) ? (
                        <Check className="h-2.5 w-2.5 text-blue-600" />
                      ) : null}
                    </button>
                    
                    {isCritical && (
                      <div className="animate-bounce" title="Registro crítico - necessita atenção urgente">
                        <Siren className="h-3 w-3 text-red-500 siren-animation" />
                      </div>
                    )}
                    
                    <div className="bg-blue-100 p-1.5 rounded">
                      <Truck className="h-3 w-3 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500">#{record.id.slice(-4)}</div>
                    {isCritical && (
                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-bold animate-pulse mt-1">
                        CRÍTICO
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-base">{record.vehicle_code}</h3>
                  <StatusBadge status={record.status} size="sm" />
                </div>
              </div>

              {/* Card Content */}
              <div className="p-3 space-y-2">
                {/* Basic Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      Motorista:
                    </span>
                    <span className="font-medium text-gray-900 text-right max-w-24 whitespace-pre-wrap break-words" title={record.driver_name}>
                      {renderEditableField(record, 'driver_name', record.driver_name, 'Nome do motorista')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      Operador:
                    </span>
                    <span className="font-medium text-gray-900 text-right max-w-24 whitespace-pre-wrap break-words" title={record.operator_name}>
                      {renderEditableField(record, 'operator_name', record.operator_name, 'Nome do operador')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">PRT Interno:</span>
                    <span className="font-medium text-gray-900">
                      {renderEditableField(record, 'internal_prt', record.internal_prt, 'PRT')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Cavalo:</span>
                    <span className="font-medium text-gray-900">
                      {renderEditableField(record, 'truck_plate', record.truck_plate, 'Placa cavalo')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Tempo Parado:
                    </span>
                    <span className="font-medium text-red-600 text-xs">
                      {calculateStoppedTime(record.created_at, record.status)}
                    </span>
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleCardExpansion(record.id)}
                  className="w-full flex items-center justify-center gap-1 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Menos detalhes
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Mais detalhes
                    </>
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="space-y-2 border-t border-gray-200 pt-2 max-h-64 overflow-y-auto">
                    {/* Vehicle Details */}
                    <div className="bg-gray-50 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Carreta:</span>
                        <span className="font-medium text-gray-900">
                          {renderEditableField(record, 'trailer_plate', record.trailer_plate, 'Placa carreta')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Wrench className="h-2.5 w-2.5" />
                          Tecnologia:
                        </span>
                        <span className="font-medium text-gray-900 text-xs text-right max-w-20 truncate" title={record.technology}>
                          {renderEditableField(record, 'technology', record.technology, 'Tecnologia')}
                        </span>
                      </div>
                    </div>

                    {/* Time and Location */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          Criado em:
                        </span>
                        <span className="font-medium text-gray-900 text-xs text-right">
                          {formatDate(record.created_at)}
                        </span>
                      </div>
                      
                      {record.current_address && (
                        <div className="text-xs">
                          <span className="text-gray-600 flex items-center gap-1 mb-1">
                            <MapPin className="h-2.5 w-2.5" />
                            Local:
                          </span>
                          <span className="text-gray-900 text-xs leading-relaxed">
                            {editingRecord === record.id ? (
                              <textarea
                                value={editData.current_address || ''}
                                onChange={(e) => handleFieldChange('current_address', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                rows={2}
                                placeholder="Endereço atual"
                              />
                            ) : (
                              record.current_address
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Occurrence */}
                    {record.occurrence_description && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                        <h4 className="text-xs font-medium text-yellow-800 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          OCORRÊNCIAS:
                        </h4>
                        <div className="space-y-1">
                          {occInfo.hasOccurrences && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-yellow-700">
                                Total: {occInfo.total} | Abertas: {occInfo.open}
                              </span>
                              <span className="font-bold text-yellow-800">
                                {OccurrenceService.formatDuration(occInfo.totalHours)}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-yellow-700 leading-relaxed">
                            {editingRecord === record.id ? (
                              <textarea
                                value={editData.occurrence_description || ''}
                                onChange={(e) => handleFieldChange('occurrence_description', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                rows={2}
                                placeholder="Descrição da ocorrência"
                              />
                            ) : (
                              record.occurrence_description
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Control */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Status Atual
                      </label>
                      {editingRecord === record.id ? (
                        <select
                          value={editData.status || record.status}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                            <option key={status} value={status}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      ) : (
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
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                            <option key={status} value={status}>
                              {config.icon} {config.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer - Actions */}
              <div className="bg-gray-50 border-t border-gray-200 p-2">
                {editingRecord === record.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                    >
                      <Save className="h-3 w-3" />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-xs font-medium"
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {/* First Row */}
                    <div className="col-span-2 grid grid-cols-3 gap-1">
                      {hasPermission('canManageOccurrences') && onOpenOccurrenceManager && (
                        <button
                          onClick={() => onOpenOccurrenceManager(record.id)}
                          className="flex items-center justify-center gap-1 px-1 py-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors text-xs font-medium relative"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          <span className="hidden sm:inline">Ocorrências</span>
                          {occInfo.total > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {occInfo.total}
                            </span>
                          )}
                        </button>
                      )}
                      
                      {onOpenTracking && (
                        <button
                          onClick={() => onOpenTracking(record.id)}
                          className="flex items-center justify-center gap-1 px-1 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-xs font-medium"
                        >
                          <Activity className="h-2.5 w-2.5" />
                          <span className="hidden sm:inline">Tracking</span>
                        </button>
                      )}
                      
                      {record.maps_link && (
                        <a
                          href={record.maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 px-1 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs font-medium"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span className="hidden sm:inline">Maps</span>
                        </a>
                      )}
                    </div>
                    
                    {/* Second Row */}
                    <div className="col-span-2 grid grid-cols-2 gap-1">
                      {hasPermission('canEdit') && (
                        <button
                          onClick={() => handleEdit(record)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium"
                        >
                          <Edit className="h-2.5 w-2.5" />
                          Editar
                        </button>
                      )}
                      
                      {hasPermission('canDelete') && onDeleteRecord && (
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs font-medium"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          Deletar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}