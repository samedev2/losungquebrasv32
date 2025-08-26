import React from 'react';
import { LogisticsRecord } from '../types/logistics';
import { Occurrence } from '../types/occurrences';
import { StatusBadge } from './StatusBadge';
import { StatusChangeModal } from './StatusChangeModal';
import { STATUS_CONFIGS } from '../types/tracking';
import { OccurrenceService } from '../lib/occurrenceService';
import { CircularOccurrenceFan } from './CircularOccurrenceFan';
import { OccurrenceTimeline } from './OccurrenceTimeline';
import { useOccurrences } from '../hooks/useOccurrences';
import { MapPin, User, Truck, Clock, ExternalLink, Edit, Trash2, Activity, Calendar, Phone, Baseline as Timeline, Check, Siren, AlertTriangle, History, X, ChevronDown, ChevronUp } from 'lucide-react';

interface MobileRecordCardProps {
  record: LogisticsRecord;
  onUpdateStatus: (recordId: string, newStatus: string) => void;
  onEdit?: (record: LogisticsRecord) => void;
  onDelete?: (recordId: string) => void;
  onOpenTracking?: (recordId: string) => void;
  onOpenOccurrenceManager?: (recordId: string) => void;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  isCritical?: boolean;
  showOccurrenceModals?: boolean;
}

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

export function MobileRecordCard({ 
  record, 
  onUpdateStatus, 
  onEdit, 
  onDelete, 
  onOpenTracking,
  isHighlighted,
  isSelected,
  onSelect,
  isCritical = false,
  showOccurrenceModals = true
}: MobileRecordCardProps) {
  const [showOccurrenceFan, setShowOccurrenceFan] = React.useState(false);
  const [showOccurrenceTimeline, setShowOccurrenceTimeline] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedRecordForStatusChange, setSelectedRecordForStatusChange] = React.useState<{
    id: string;
    currentStatus: string;
    vehicleCode: string;
  } | null>(null);
  const { 
    occurrences, 
    addOccurrence, 
    updateOccurrence, 
    addTimelineEntry, 
    getOccurrencesByRecord,
    loadOccurrences 
  } = useOccurrences();

  const handleOpenOccurrenceFan = () => {
    loadOccurrences(record.id);
    setShowOccurrenceFan(true);
  };

  const handleOpenOccurrenceTimeline = () => {
    loadOccurrences(record.id);
    setShowOccurrenceTimeline(true);
  };

  const handleOccurrenceAdded = (occurrence: Occurrence) => {
    addOccurrence(occurrence);
  };

  const getOccurrenceCount = (): number => {
    return getOccurrencesByRecord(record.id).filter(occ => occ.status !== 'cancelada').length;
  };
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

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Esta função agora será chamada apenas pelo modal
    onUpdateStatus(record.id, e.target.value);
  };

  const handleStatusChangeWithOccurrence = async (newStatus: string, occurrenceText: string, operatorName: string) => {
    if (!selectedRecordForStatusChange) return;

    try {

      // Alterar o status primeiro
      await handleStatusChange({ target: { value: newStatus } } as React.ChangeEvent<HTMLSelectElement>);
      
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

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-3 ${
      isHighlighted 
        ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300 shadow-lg' 
        : isCritical
        ? 'ring-2 ring-red-500 bg-red-50 border-red-300 critical-record'
        : isRecordInactive(record)
        ? 'ring-2 ring-red-500 ring-opacity-50 bg-red-50 animate-pulse'
        : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onSelect && (
              <button
                onClick={onSelect}
                className="flex items-center justify-center w-4 h-4 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors"
              >
                {isSelected ? (
                  <Check className="h-3 w-3 text-blue-600" />
                ) : null}
              </button>
            )}
            {isCritical && (
              <div className="animate-bounce" title="Registro crítico - necessita atenção urgente">
                <Siren className="h-3 w-3 text-red-500 siren-animation" />
              </div>
            )}
            <div className="bg-blue-100 p-1.5 rounded">
              <Truck className="h-3 w-3 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{record.vehicle_code}</h3>
              <p className="text-xs text-gray-500">#{record.id.slice(-4)}</p>
              {isCritical && (
                <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-bold animate-pulse mt-1">
                  CRÍTICO
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={record.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Driver and Operator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              Motorista
            </span>
            <span className="font-medium text-gray-900 text-right max-w-24 whitespace-pre-wrap break-words" title={record.driver_name}>
              {record.driver_name}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1">
              <Phone className="h-2.5 w-2.5" />
              Operador
            </span>
            <span className="font-medium text-gray-900 text-right max-w-24 whitespace-pre-wrap break-words" title={record.operator_name}>
              {record.operator_name}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Tempo Parado
            </span>
            <span className="font-medium text-red-600 text-xs">
              {calculateStoppedTime(record.created_at, record.status)}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
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
          <div className="space-y-2 border-t border-gray-200 pt-2 max-h-48 overflow-y-auto">
            {/* Vehicle Info */}
            <div className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">PRT Interno</span>
                <span className="font-medium text-gray-900">{record.internal_prt}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Cavalo</span>
                <span className="font-medium text-gray-900">{record.truck_plate}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Carreta</span>
                <span className="font-medium text-gray-900">{record.trailer_plate}</span>
              </div>
            </div>

            {/* Location and Time */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  Criado em
                </span>
                <span className="font-medium text-gray-900 text-xs">{formatDate(record.created_at)}</span>
              </div>
              
              {record.current_address && (
                <div className="text-xs">
                  <span className="text-gray-600 flex items-center gap-1 mb-1">
                    <MapPin className="h-2.5 w-2.5" />
                    Local:
                  </span>
                  <span className="text-gray-900 text-xs leading-relaxed">
                    {record.current_address}
                  </span>
                </div>
              )}
            </div>

            {/* Occurrence */}
            {record.occurrence_description && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <h4 className="text-xs font-medium text-yellow-800 mb-1">Ocorrência</h4>
                <p className="text-xs text-yellow-700">{record.occurrence_description}</p>
              </div>
            )}

            {/* Status Control */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <label className="block text-xs font-medium text-blue-800 mb-1">
                Alterar Status
              </label>
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
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1 pt-1">
          {showOccurrenceModals && (
            <button
              onClick={() => {
                if (window.location.pathname.includes('occurrence')) {
                  // Se já estamos na tela de ocorrências, usar o fan
                  handleOpenOccurrenceFan();
                } else {
                  // Caso contrário, abrir o manager diretamente
                  if (onOpenOccurrenceManager) {
                    onOpenOccurrenceManager(record.id);
                  }
                }
              }}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors text-xs font-medium relative"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Ocorrências
              {getOccurrenceCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {getOccurrenceCount()}
                </span>
              )}
            </button>
          )}
          
          {onOpenTracking && (
            <button
              onClick={() => onOpenTracking(record.id)}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-xs font-medium"
            >
              <Activity className="h-2.5 w-2.5" />
              Tracking
            </button>
          )}
        </div>
      </div>

      {/* Circular Occurrence Fan Modal */}
      {showOccurrenceFan && (
        <CircularOccurrenceFan
          recordId={record.id}
          isOpen={true}
          onClose={() => setShowOccurrenceFan(false)}
          onOccurrenceAdded={handleOccurrenceAdded}
          existingOccurrences={getOccurrencesByRecord(record.id)}
        />
      )}

      {/* Occurrence Timeline Modal */}
      {showOccurrenceTimeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Timeline - {record.vehicle_code}</h2>
                  <p className="text-indigo-100 text-sm mt-1">Histórico de ocorrências</p>
                </div>
                <button
                  onClick={() => setShowOccurrenceTimeline(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[calc(90vh-100px)] overflow-y-auto">
              <OccurrenceTimeline
                occurrences={getOccurrencesByRecord(record.id)}
                onOccurrenceUpdate={updateOccurrence}
                onTimelineAdd={addTimelineEntry}
              />
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
    </div>
  );
}