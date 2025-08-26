import React, { useState } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { OccurrenceHistoryEntry } from '../types/user';
import { StatusBadge } from './StatusBadge';
import { STATUS_CONFIGS } from '../types/tracking';
import { OccurrenceService } from '../lib/occurrenceService';
import { AlertTriangle, CheckCircle, Clock, Truck, TrendingUp, Settings, ChevronDown, ChevronUp, Minimize2, Maximize2, RotateCcw, Edit3, User, Calendar, MapPin, Wrench, Activity, ExternalLink } from 'lucide-react';

interface DashboardProps {
  records: LogisticsRecord[];
  onUpdateStatus?: (recordId: string, newStatus: string) => void;
  onHighlightRecord?: (recordId: string) => void;
  onOpenTracking?: (recordId: string) => void;
  onOpenOccurrenceManager?: (recordId: string) => void;
  isAdminView?: boolean;
}

export function Dashboard({ records, onUpdateStatus, onHighlightRecord, onOpenTracking, onOpenOccurrenceManager, isAdminView = false }: DashboardProps) {
  const [isMainDashboardCollapsed, setIsMainDashboardCollapsed] = useState(false);
  const [isDistributionCollapsed, setIsDistributionCollapsed] = useState(false);
  const [isRecentActivityCollapsed, setIsRecentActivityCollapsed] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [selectedOverviewFilter, setSelectedOverviewFilter] = useState<string | null>(null);
  const [selectedRecordForUpdate, setSelectedRecordForUpdate] = useState<string | null>(null);
  const [newStatusForRecord, setNewStatusForRecord] = useState<string>('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    includeOngoing: true
  });
  const [occurrenceData, setOccurrenceData] = useState<Record<string, OccurrenceHistoryEntry[]>>({});

  // Carregar dados de ocorrências
  React.useEffect(() => {
    loadOccurrenceData();
  }, [records]);

  const loadOccurrenceData = async () => {
    try {
      const occurrenceMap: Record<string, OccurrenceHistoryEntry[]> = {};
      
      for (const record of records) {
        try {
          const occurrences = await OccurrenceService.getOccurrencesByRecord(record.id);
          occurrenceMap[record.id] = occurrences;
        } catch (error) {
          // If occurrence table doesn't exist yet, just set empty array
          console.warn(`Could not load occurrences for record ${record.id}:`, error);
          occurrenceMap[record.id] = [];
        }
      }
      
      setOccurrenceData(occurrenceMap);
    } catch (error) {
      console.warn('Erro ao carregar dados de ocorrências:', error);
      // Set empty occurrence data if there's an error
      const emptyOccurrenceMap: Record<string, OccurrenceHistoryEntry[]> = {};
      records.forEach(record => {
        emptyOccurrenceMap[record.id] = [];
      });
      setOccurrenceData(emptyOccurrenceMap);
    }
  };

  // Filtrar registros por data
  const filteredRecordsByDate = React.useMemo(() => {
    let filtered = records;

    if (dateFilter.startDate || dateFilter.endDate) {
      filtered = records.filter(record => {
        const recordDate = new Date(record.created_at);
        const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
        const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

        // Se incluir registros em andamento, manter registros ativos mesmo fora do período
        if (dateFilter.includeOngoing && 
            record.status !== 'finalizado' && 
            record.status !== 'resolvido') {
          return true;
        }

        let withinRange = true;
        if (startDate) {
          withinRange = withinRange && recordDate >= startDate;
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          withinRange = withinRange && recordDate <= endOfDay;
        }

        return withinRange;
      });
    }

    return filtered;
  }, [records, dateFilter]);

  const stats = React.useMemo(() => {
    const filteredRecords = filteredRecordsByDate;
    const total = filteredRecords.length;
    const aguardandoTecnico = filteredRecords.filter(r => r.status === 'aguardando_tecnico').length;
    const reinicioViagem = filteredRecords.filter(r => r.status === 'reinicio_viagem').length;
    const aguardandoMecanico = filteredRecords.filter(r => r.status === 'aguardando_mecanico').length;
    const manutencaoSemPrevisao = filteredRecords.filter(r => r.status === 'manutencao_sem_previsao').length;
    const semPrevisao = filteredRecords.filter(r => r.status === 'sem_previsao').length;
    const finalizado = filteredRecords.filter(r => r.status === 'finalizado').length;
    const transbordo = filteredRecords.filter(r => 
      r.status === 'transbordo_troca_cavalo' || 
      r.status === 'transbordo_em_andamento' || 
      r.status === 'transbordo_finalizado'
    ).length;

    return {
      total,
      aguardandoTecnico,
      reinicioViagem,
      aguardandoMecanico,
      manutencaoSemPrevisao,
      semPrevisao,
      finalizado,
      transbordo
    };
  }, [filteredRecordsByDate]);

  // Filter records based on selected overview filter
  const filteredRecordsByOverview = React.useMemo(() => {
    if (!selectedOverviewFilter) return [];
    const baseRecords = filteredRecordsByDate;
    
    switch (selectedOverviewFilter) {
      case 'total':
        return baseRecords;
      case 'aguardando_tecnico':
        return baseRecords.filter(record => record.status === 'aguardando_tecnico');
      case 'reinicio_viagem':
        return baseRecords.filter(record => record.status === 'reinicio_viagem');
      case 'aguardando_mecanico':
        return baseRecords.filter(record => record.status === 'aguardando_mecanico');
      case 'manutencao_sem_previsao':
        return baseRecords.filter(record => record.status === 'manutencao_sem_previsao');
      case 'sem_previsao':
        return baseRecords.filter(record => record.status === 'sem_previsao');
      case 'finalizado':
        return baseRecords.filter(record => record.status === 'finalizado');
      case 'transbordo':
        return baseRecords.filter(record => 
          record.status === 'transbordo_troca_cavalo' || 
          record.status === 'transbordo_em_andamento' || 
          record.status === 'transbordo_finalizado'
        );
      default:
        return [];
    }
  }, [filteredRecordsByDate, selectedOverviewFilter]);

  // Filter records based on selected status
  const filteredRecordsByStatus = React.useMemo(() => {
    if (!selectedStatusFilter) return [];
    return filteredRecordsByDate.filter(record => record.status === selectedStatusFilter);
  }, [filteredRecordsByDate, selectedStatusFilter]);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const handleRecoverRecord = (record: LogisticsRecord) => {
    setSelectedRecordForUpdate(record.id);
    setNewStatusForRecord(record.status);
    if (onHighlightRecord) {
      onHighlightRecord(record.id);
    }
  };

  const handleApplyNewStatus = async () => {
    if (selectedRecordForUpdate && newStatusForRecord && onUpdateStatus) {
      try {
        await onUpdateStatus(selectedRecordForUpdate, newStatusForRecord);
        setSelectedRecordForUpdate(null);
        setNewStatusForRecord('');
        // Scroll to top to show the updated record in the main table
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
      }
    }
  };

  const handleCancelUpdate = () => {
    setSelectedRecordForUpdate(null);
    setNewStatusForRecord('');
  };

  const handleStatusClick = (status: string) => {
    setSelectedStatusFilter(selectedStatusFilter === status ? null : status);
  };

  const handleOverviewClick = (filter: string) => {
    setSelectedOverviewFilter(selectedOverviewFilter === filter ? null : filter);
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }) => (
    <div className={`${bgColor} rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const CollapsibleSection = ({ 
    title, 
    isCollapsed, 
    onToggle, 
    children, 
    className = "" 
  }: {
    title: string;
    isCollapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:scale-110 group"
            title={isCollapsed ? "Maximizar seção" : "Minimizar seção"}
          >
            {isCollapsed ? (
              <Maximize2 className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
            ) : (
              <Minimize2 className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:scale-110 group"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
            )}
          </button>
        </div>
      </div>
      <div className={`transition-all duration-500 ease-in-out ${
        isCollapsed 
          ? 'max-h-0 opacity-0 overflow-hidden' 
          : 'max-h-[2000px] opacity-100 overflow-visible'
      }`}>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas Principais - Apenas para Admin */}
      {isAdminView && (
        <CollapsibleSection
          title="Dashboard - Visão Geral"
          isCollapsed={isMainDashboardCollapsed}
          onToggle={() => setIsMainDashboardCollapsed(!isMainDashboardCollapsed)}
        >
          {/* Filtros de Data */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Filtros por Data e Hora</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Data Inicial
                </label>
                <input
                  type="datetime-local"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Data Final
                </label>
                <input
                  type="datetime-local"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dateFilter.includeOngoing}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, includeOngoing: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Incluir registros em andamento
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => setDateFilter({ startDate: '', endDate: '', includeOngoing: true })}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Limpar Filtros
              </button>
              <span className="text-sm text-gray-600">
                Mostrando {filteredRecordsByDate.length} de {records.length} registros
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
            <button
              onClick={() => handleOverviewClick('total')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'total'
                  ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('aguardando_tecnico')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'aguardando_tecnico'
                  ? 'border-red-500 bg-red-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aguardando Técnico</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.aguardandoTecnico}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('reinicio_viagem')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'reinicio_viagem'
                  ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reinício Viagem</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.reinicioViagem}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('aguardando_mecanico')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'aguardando_mecanico'
                  ? 'border-yellow-500 bg-yellow-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aguardando Mecânico</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.aguardandoMecanico}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('manutencao_sem_previsao')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'manutencao_sem_previsao'
                  ? 'border-orange-500 bg-orange-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Manutenção</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.manutencaoSemPrevisao}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('sem_previsao')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'sem_previsao'
                  ? 'border-gray-500 bg-gray-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sem Previsão</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.semPrevisao}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('transbordo')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'transbordo'
                  ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transbordo</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.transbordo}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOverviewClick('finalizado')}
              className={`text-center group p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedOverviewFilter === 'finalizado'
                  ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Finalizados</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.finalizado}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
          </div>

          {/* Filtered Records Cards for Overview */}
          {selectedOverviewFilter && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Registros filtrados: {
                    selectedOverviewFilter === 'total' ? 'Todos os registros' :
                    selectedOverviewFilter === 'aguardando_tecnico' ? 'Aguardando Técnico' :
                    selectedOverviewFilter === 'reinicio_viagem' ? 'Reinício de Viagem' :
                    selectedOverviewFilter === 'aguardando_mecanico' ? 'Aguardando Mecânico' :
                    selectedOverviewFilter === 'manutencao_sem_previsao' ? 'Manutenção' :
                    selectedOverviewFilter === 'sem_previsao' ? 'Sem Previsão' :
                    selectedOverviewFilter === 'finalizado' ? 'Finalizados' :
                    selectedOverviewFilter === 'transbordo' ? 'Transbordo' :
                    'Filtro desconhecido'
                  }
                </h4>
                <button
                  onClick={() => setSelectedOverviewFilter(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Limpar filtro
                </button>
              </div>
              
              {filteredRecordsByOverview.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum registro encontrado com este filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredRecordsByOverview.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-1.5 rounded-lg">
                            <Truck className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-900">{record.vehicle_code}</h5>
                            <p className="text-xs text-gray-500">#{record.id.slice(-6)}</p>
                          </div>
                        </div>
                        <StatusBadge status={record.status} size="sm" />
                      </div>

                      {/* Content */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Operador:
                          </span>
                          <span className="font-medium text-gray-900">{record.operator_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Motorista:
                          </span>
                          <span className="font-medium text-gray-900">{record.driver_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Registro:
                          </span>
                          <span className="font-medium text-gray-900 text-xs">{formatDate(record.created_at)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Cavalo:</span>
                          <span className="font-medium text-gray-900">{record.truck_plate}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Carreta:</span>
                          <span className="font-medium text-gray-900">{record.trailer_plate}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Perfil:</span>
                          <span className="font-medium text-gray-900 text-xs">{record.vehicle_profile}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            Tecnologia:
                          </span>
                          <span className="font-medium text-gray-900 text-xs">{record.technology}</span>
                        </div>
                      </div>

                      {/* Occurrence - Highlighted */}
                      {record.occurrence_description && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h6 className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            OCORRÊNCIAS:
                          </h6>
                          {(() => {
                            const occInfo = getOccurrenceInfo(record.id);
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-yellow-700">
                                    Total: {occInfo.total} | Abertas: {occInfo.open}
                                  </span>
                                  <span className="text-xs font-bold text-yellow-800">
                                    {OccurrenceService.formatDuration(occInfo.totalHours)}
                                  </span>
                                </div>
                                <p className="text-xs text-yellow-700 leading-relaxed">
                                  {record.occurrence_description}
                                </p>
                                {occInfo.hasOccurrences && (
                                  <div className="text-xs text-yellow-600 font-medium">
                                    ⏱️ Tempo total de ocorrências: {OccurrenceService.formatDuration(occInfo.totalHours)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Action Buttons - Apenas para Admin */}
                      {isAdminView && (
                        <div className="mt-3 flex gap-2">
                          {onOpenOccurrenceManager && (
                            <button
                              onClick={() => onOpenOccurrenceManager(record.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-xs font-medium relative"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span className="hidden sm:inline">Ocorrências</span>
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
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"
                            >
                              <Activity className="h-3 w-3" />
                              <span className="hidden sm:inline">Tracking</span>
                            </button>
                          )}
                          
                          {record.maps_link && (
                            <a
                              href={record.maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs font-medium"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="hidden sm:inline">Maps</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Distribuição por Status */}
      <CollapsibleSection
        title="Distribuição por Status"
        isCollapsed={isDistributionCollapsed}
        onToggle={() => setIsDistributionCollapsed(!isDistributionCollapsed)}
      >
        <div className="space-y-6">
          {/* Status Filter Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => handleStatusClick('aguardando_tecnico')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'aguardando_tecnico'
                  ? 'border-yellow-500 bg-yellow-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="aguardando_tecnico" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.aguardandoTecnico}</p>
              <p className="text-sm text-gray-500 font-medium">Aguardando Técnico</p>
            </button>
            
            <button
              onClick={() => handleStatusClick('reinicio_viagem')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'reinicio_viagem'
                  ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="reinicio_viagem" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.reinicioViagem}</p>
              <p className="text-sm text-gray-500 font-medium">Reinício Viagem</p>
            </button>
            
            <button
              onClick={() => handleStatusClick('aguardando_mecanico')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'aguardando_mecanico'
                  ? 'border-orange-500 bg-orange-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="aguardando_mecanico" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.aguardandoMecanico}</p>
              <p className="text-sm text-gray-500 font-medium">Aguardando Mecânico</p>
            </button>
            
            <button
              onClick={() => handleStatusClick('manutencao_sem_previsao')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'manutencao_sem_previsao'
                  ? 'border-red-500 bg-red-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="manutencao_sem_previsao" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.manutencaoSemPrevisao}</p>
              <p className="text-sm text-gray-500 font-medium">Manutenção</p>
            </button>
            
            <button
              onClick={() => handleStatusClick('sem_previsao')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'sem_previsao'
                  ? 'border-gray-500 bg-gray-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="sem_previsao" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.semPrevisao}</p>
              <p className="text-sm text-gray-500 font-medium">Sem Previsão</p>
            </button>
            
            <button
              onClick={() => handleStatusClick('transbordo_troca_cavalo')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'transbordo_troca_cavalo'
                  ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="transbordo_troca_cavalo" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.transbordo}</p>
              <p className="text-sm text-gray-500 font-medium">Transbordo</p>
            </button>
            
            <button
              onClick={() => handleStatusClick('finalizado')}
              className={`text-center group p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedStatusFilter === 'finalizado'
                  ? 'border-gray-500 bg-gray-50 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-25'
              }`}
            >
              <div className="mb-3 flex justify-center">
                <div className="transform transition-transform duration-300 group-hover:scale-110">
                  <StatusBadge status="finalizado" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.finalizado}</p>
              <p className="text-sm text-gray-500 font-medium">Finalizados</p>
            </button>
          </div>

          {/* Filtered Records Cards */}
          {selectedStatusFilter && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Registros com status: {STATUS_CONFIGS[selectedStatusFilter as keyof typeof STATUS_CONFIGS]?.label}
                </h4>
                <button
                  onClick={() => setSelectedStatusFilter(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Limpar filtro
                </button>
              </div>
              
              {filteredRecordsByStatus.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum registro encontrado com este status</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredRecordsByStatus.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-1.5 rounded-lg">
                            <Truck className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-900">{record.vehicle_code}</h5>
                            <p className="text-xs text-gray-500">#{record.id.slice(-6)}</p>
                          </div>
                        </div>
                        <StatusBadge status={record.status} size="sm" />
                      </div>

                      {/* Content */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Operador:
                          </span>
                          <span className="font-medium text-gray-900">{record.operator_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Motorista:
                          </span>
                          <span className="font-medium text-gray-900">{record.driver_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Registro:
                          </span>
                          <span className="font-medium text-gray-900 text-xs">{formatDate(record.created_at)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Cavalo:</span>
                          <span className="font-medium text-gray-900">{record.truck_plate}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Carreta:</span>
                          <span className="font-medium text-gray-900">{record.trailer_plate}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Perfil:</span>
                          <span className="font-medium text-gray-900 text-xs">{record.vehicle_profile}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            Tecnologia:
                          </span>
                          <span className="font-medium text-gray-900 text-xs">{record.technology}</span>
                        </div>
                      </div>

                      {/* Occurrence - Highlighted */}
                      {record.occurrence_description && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h6 className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            OCORRÊNCIAS:
                          </h6>
                          {(() => {
                            const occInfo = getOccurrenceInfo(record.id);
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-yellow-700">
                                    Total: {occInfo.total} | Abertas: {occInfo.open}
                                  </span>
                                  <span className="text-xs font-bold text-yellow-800">
                                    {OccurrenceService.formatDuration(occInfo.totalHours)}
                                  </span>
                                </div>
                                <p className="text-xs text-yellow-700 leading-relaxed">
                                  {record.occurrence_description}
                                </p>
                                {occInfo.hasOccurrences && (
                                  <div className="text-xs text-yellow-600 font-medium">
                                    ⏱️ Tempo total: {OccurrenceService.formatDuration(occInfo.totalHours)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Action Buttons - Apenas para Admin */}
                      {isAdminView && (
                        <div className="mt-3 flex gap-2">
                          {onOpenOccurrenceManager && (
                            <button
                              onClick={() => onOpenOccurrenceManager(record.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-xs font-medium relative"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span className="hidden sm:inline">Ocorrências</span>
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
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"
                            >
                              <Activity className="h-3 w-3" />
                              <span className="hidden sm:inline">Tracking</span>
                            </button>
                          )}
                          
                          {record.maps_link && (
                            <a
                              href={record.maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs font-medium"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="hidden sm:inline">Maps</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Resumo de Atividade Recente */}
      {records.length > 0 && isAdminView && (
        <CollapsibleSection
          title="Controle Rápido - Últimos Registros"
          isCollapsed={isRecentActivityCollapsed}
          onToggle={() => setIsRecentActivityCollapsed(!isRecentActivityCollapsed)}
        >
          <div className="space-y-6">
            {/* Status Update Panel */}
            {selectedRecordForUpdate && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Atualizar Status do Registro
                  </h4>
                  <button
                    onClick={handleCancelUpdate}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registro Selecionado
                    </label>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900">
                        {records.find(r => r.id === selectedRecordForUpdate)?.vehicle_code}
                      </p>
                      <p className="text-sm text-gray-600">
                        {records.find(r => r.id === selectedRecordForUpdate)?.driver_name}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Novo Status
                    </label>
                    <select
                      value={newStatusForRecord}
                      onChange={(e) => setNewStatusForRecord(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                        <option key={status} value={status}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyNewStatus}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Aplicar Status
                    </button>
                    <button
                      onClick={handleCancelUpdate}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Records List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-700">
                  Últimos 5 registros filtrados (clique para atualizar status)
                </h4>
                <p className="text-sm text-gray-500">
                  Controle rápido de status - o roadmap completo está abaixo
                </p>
              </div>
              {filteredRecordsByDate.filter(r => r.status !== 'resolvido' && r.status !== 'finalizado').slice(0, 5).map((record, index) => {
                const occInfo = getOccurrenceInfo(record.id);
                return (
              <div 
                key={record.id} 
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] cursor-pointer ${
                  selectedRecordForUpdate === record.id 
                    ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300 shadow-lg' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 hover:shadow-md hover:from-gray-100 hover:to-gray-200'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleRecoverRecord(record)}
              >
                <div className="flex items-center gap-4">
                  <div className="transform transition-transform duration-300 hover:scale-110">
                    <StatusBadge status={record.status} size="sm" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{record.vehicle_code}</p>
                    <p className="text-sm text-gray-600">{record.driver_name}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      <p className="line-clamp-1">{record.occurrence_description}</p>
                      {occInfo.hasOccurrences && (
                        <p className="text-yellow-600 font-medium mt-1">
                          📋 {occInfo.total} ocorrências • ⏱️ {OccurrenceService.formatDuration(occInfo.totalHours)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecoverRecord(record);
                    }}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all duration-200 hover:scale-110 group"
                    title="Atualizar status deste registro"
                  >
                    <RotateCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                  <div>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(record.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(record.created_at).toLocaleTimeString('pt-BR')}
                  </p>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    {record.operator_name}
                  </p>
                  </div>
                </div>
              </div>
                );
              })}
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}