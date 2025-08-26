import React, { useState, useEffect } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { logisticsService } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  List, 
  Trash2, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Calendar,
  User,
  Truck,
  Clock,
  RefreshCw,
  Download,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminRecordsManagerProps {
  onRecordsUpdate?: () => void;
}

export function AdminRecordsManager({ onRecordsUpdate }: AdminRecordsManagerProps) {
  const [records, setRecords] = useState<LogisticsRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<LogisticsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'vehicle_code' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<LogisticsRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { hasPermission, isAdmin } = useAuth();

  // Carregar registros na inicialização
  useEffect(() => {
    if (isAdmin()) {
      loadRecords();
    }
  }, []);

  // Filtrar e ordenar registros
  useEffect(() => {
    let filtered = records;

    // Aplicar filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.vehicle_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.occurrence_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'vehicle_code':
          aValue = a.vehicle_code;
          bValue = b.vehicle_code;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredRecords(filtered);
  }, [records, searchTerm, statusFilter, sortBy, sortOrder]);

  /**
   * Carrega todos os registros do banco de dados
   */
  const loadRecords = async () => {
    try {
      setLoading(true);
      setDeleteError(null);
      const data = await logisticsService.getRecords();
      setRecords(data);
      console.log(`Carregados ${data.length} registros para administração`);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      setDeleteError('Erro ao carregar registros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre modal de confirmação para deletar registro
   */
  const handleDeleteClick = (record: LogisticsRecord) => {
    if (!hasPermission('canDelete')) {
      setDeleteError('Você não tem permissão para deletar registros');
      return;
    }
    setRecordToDelete(record);
    setShowDeleteModal(true);
    setDeleteError(null);
    setDeleteSuccess(null);
  };

  /**
   * Confirma e executa a exclusão do registro
   */
  const confirmDelete = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      console.log(`Deletando registro: ${recordToDelete.id} - ${recordToDelete.vehicle_code}`);
      
      await logisticsService.deleteRecord(recordToDelete.id);
      
      // Atualizar lista local
      setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
      
      // Feedback de sucesso
      setDeleteSuccess(`Registro ${recordToDelete.vehicle_code} deletado com sucesso!`);
      
      // Notificar componente pai para atualizar
      if (onRecordsUpdate) {
        onRecordsUpdate();
      }
      
      // Fechar modal
      setShowDeleteModal(false);
      setRecordToDelete(null);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao deletar registro:', error);
      setDeleteError(error instanceof Error ? error.message : 'Erro desconhecido ao deletar registro');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Cancela a operação de exclusão
   */
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setRecordToDelete(null);
    setDeleteError(null);
  };

  /**
   * Formata data para exibição
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  /**
   * Calcula tempo desde criação
   */
  const getRecordAge = (createdAt: string) => {
    const ageMs = new Date().getTime() - new Date(createdAt).getTime();
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const ageHours = Math.floor((ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (ageDays > 0) {
      return `${ageDays}d ${ageHours}h`;
    }
    return `${ageHours}h`;
  };

  /**
   * Obtém cor do status
   */
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'aguardando_tecnico': 'bg-yellow-100 text-yellow-800',
      'aguardando_mecanico': 'bg-orange-100 text-orange-800',
      'manutencao_sem_previsao': 'bg-red-100 text-red-800',
      'sem_previsao': 'bg-gray-100 text-gray-800',
      'transbordo_troca_cavalo': 'bg-blue-100 text-blue-800',
      'transbordo_em_andamento': 'bg-indigo-100 text-indigo-800',
      'transbordo_finalizado': 'bg-purple-100 text-purple-800',
      'reinicio_viagem': 'bg-green-100 text-green-800',
      'finalizado': 'bg-gray-100 text-gray-800',
      'resolvido': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  /**
   * Obtém lista única de status para filtro
   */
  const getUniqueStatuses = () => {
    const statuses = [...new Set(records.map(r => r.status))];
    return statuses.sort();
  };

  // Verificar permissões de administrador
  if (!isAdmin()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 font-medium">Acesso Negado</span>
        </div>
        <p className="text-red-700 text-sm mt-1">
          Esta funcionalidade está disponível apenas para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <List className="h-6 w-6 text-purple-600" />
              Gerenciamento de Registros
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Visualizar, filtrar e gerenciar todos os registros do sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isExpanded ? 'Recolher' : 'Expandir'}
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{records.length}</div>
            <div className="text-sm text-gray-600">Total de Registros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {records.filter(r => r.status === 'finalizado' || r.status === 'resolvido').length}
            </div>
            <div className="text-sm text-gray-600">Finalizados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {records.filter(r => r.status !== 'finalizado' && r.status !== 'resolvido').length}
            </div>
            <div className="text-sm text-gray-600">Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{filteredRecords.length}</div>
            <div className="text-sm text-gray-600">Filtrados</div>
          </div>
        </div>
      </div>

      {/* Mensagens de feedback */}
      {deleteSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 m-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-sm text-green-700">{deleteSuccess}</p>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{deleteError}</p>
            <button
              onClick={() => setDeleteError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo expansível */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded 
          ? 'max-h-[2000px] opacity-100 overflow-visible' 
          : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <div className="p-6">
          {/* Controles de filtro e busca */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por veículo, motorista, operador, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Filtro de status */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos os Status</option>
                  {getUniqueStatuses().map(status => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenação */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="created_at">Data de Criação</option>
                  <option value="vehicle_code">Código do Veículo</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={`Ordenar ${sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Informações de filtro */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Exibindo {filteredRecords.length} de {records.length} registros
                {searchTerm && ` • Busca: "${searchTerm}"`}
                {statusFilter !== 'all' && ` • Status: ${statusFilter.replace(/_/g, ' ')}`}
              </span>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="text-purple-600 hover:text-purple-800 underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Lista de registros */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Carregando registros...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-500">
                {records.length === 0 
                  ? 'Não há registros no sistema'
                  : 'Tente ajustar os filtros de busca'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veículo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motorista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Idade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <Truck className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              #{record.id.slice(-8)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.operator_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.vehicle_code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.vehicle_profile}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {record.driver_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          PRT: {record.internal_prt}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(record.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {getRecordAge(record.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => console.log('Ver detalhes:', record.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Deletar registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              {/* Ícone de aviso */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              {/* Título e descrição */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja deletar este registro?
              </p>

              {/* Detalhes do registro */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">#{recordToDelete.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Veículo:</span>
                    <span className="font-medium">{recordToDelete.vehicle_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Motorista:</span>
                    <span className="font-medium">{recordToDelete.driver_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(recordToDelete.status)}`}>
                      {recordToDelete.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Criado:</span>
                    <span className="font-medium">{formatDate(recordToDelete.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. 
                  Todos os dados relacionados a este registro serão permanentemente removidos.
                </p>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deletando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Sim, Deletar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}