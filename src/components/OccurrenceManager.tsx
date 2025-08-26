import React, { useState, useEffect } from 'react';
import { OccurrenceHistoryEntry } from '../types/user';
import { OccurrenceService } from '../lib/occurrenceService';
import { Plus, Clock, User, CheckCircle, AlertTriangle, Edit, Trash2, X, Save, Calendar, FileText } from 'lucide-react';

interface OccurrenceManagerProps {
  recordId: string;
  onClose: () => void;
  currentUser?: string;
}

export function OccurrenceManager({ recordId, onClose, currentUser = 'Sistema' }: OccurrenceManagerProps) {
  const [occurrences, setOccurrences] = useState<OccurrenceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<string | null>(null);
  const [newOccurrence, setNewOccurrence] = useState({
    title: '',
    description: '',
    category: 'geral',
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'critica'
  });

  useEffect(() => {
    loadOccurrences();
  }, [recordId]);

  const loadOccurrences = async () => {
    try {
      setLoading(true);
      const data = await OccurrenceService.getOccurrencesByRecord(recordId);
      setOccurrences(data);
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOccurrence = async () => {
    if (!newOccurrence.title.trim() || !newOccurrence.description.trim()) {
      alert('Título e descrição são obrigatórios');
      return;
    }

    try {
      await OccurrenceService.addOccurrence(
        recordId,
        newOccurrence.title,
        newOccurrence.description,
        newOccurrence.category,
        newOccurrence.priority,
        currentUser
      );

      setNewOccurrence({
        title: '',
        description: '',
        category: 'geral',
        priority: 'media'
      });
      setShowAddForm(false);
      await loadOccurrences();
    } catch (error) {
      console.error('Erro ao adicionar ocorrência:', error);
      alert('Erro ao adicionar ocorrência');
    }
  };

  const handleResolveOccurrence = async (occurrenceId: string) => {
    try {
      await OccurrenceService.resolveOccurrence(occurrenceId, currentUser);
      await loadOccurrences();
    } catch (error) {
      console.error('Erro ao resolver ocorrência:', error);
      alert('Erro ao resolver ocorrência');
    }
  };

  const handleUpdateStatus = async (occurrenceId: string, newStatus: 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada') => {
    try {
      await OccurrenceService.updateOccurrenceStatus(occurrenceId, newStatus, currentUser);
      await loadOccurrences();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const getTotalHours = () => {
    return occurrences.reduce((sum, occ) => sum + (occ.duration_hours || 0), 0);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'aberta': 'bg-red-100 text-red-800 border-red-200',
      'em_andamento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'resolvida': 'bg-green-100 text-green-800 border-green-200',
      'cancelada': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.aberta;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'baixa': 'bg-blue-100 text-blue-800',
      'media': 'bg-yellow-100 text-yellow-800',
      'alta': 'bg-orange-100 text-orange-800',
      'critica': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || colors.media;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Gerenciar Ocorrências
              </h2>
              <p className="text-orange-100 mt-1">
                {occurrences.length} ocorrência{occurrences.length !== 1 ? 's' : ''} registrada{occurrences.length !== 1 ? 's' : ''}
              </p>
              <p className="text-orange-100 text-sm">
                ⏱️ Tempo total: {OccurrenceService.formatDuration(getTotalHours())}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Add Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Ocorrência
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nova Ocorrência
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={newOccurrence.title}
                      onChange={(e) => setNewOccurrence(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Problema no motor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={newOccurrence.category}
                      onChange={(e) => setNewOccurrence(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="geral">Geral</option>
                      <option value="mecanica">Mecânica</option>
                      <option value="eletrica">Elétrica</option>
                      <option value="pneu">Pneu</option>
                      <option value="combustivel">Combustível</option>
                      <option value="documentacao">Documentação</option>
                      <option value="carga">Carga</option>
                      <option value="rota">Rota</option>
                      <option value="clima">Clima</option>
                      <option value="acidente">Acidente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newOccurrence.priority}
                    onChange={(e) => setNewOccurrence(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="baixa">🟢 Baixa</option>
                    <option value="media">🟡 Média</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="critica">🔴 Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    value={newOccurrence.description}
                    onChange={(e) => setNewOccurrence(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descreva detalhadamente a ocorrência..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddOccurrence}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Occurrences List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Carregando ocorrências...</span>
            </div>
          ) : occurrences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhuma ocorrência registrada</p>
              <p className="text-sm mt-1">Clique em "Nova Ocorrência" para adicionar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {occurrences.map((occurrence) => (
                <div key={occurrence.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{occurrence.occurrence_title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(occurrence.priority_level)}`}>
                          {occurrence.priority_level.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(occurrence.status)}`}>
                          {occurrence.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{occurrence.occurrence_description}</p>
                      
                      {/* Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Criado por: <strong>{occurrence.created_by}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Em: {formatDate(occurrence.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>Categoria: <strong>{occurrence.occurrence_category}</strong></span>
                        </div>
                        {occurrence.duration_hours > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium text-blue-600">
                              Duração: {OccurrenceService.formatDuration(occurrence.duration_hours)}
                            </span>
                          </div>
                        )}
                        {occurrence.resolved_by && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolvido por: <strong>{occurrence.resolved_by}</strong></span>
                          </div>
                        )}
                        {occurrence.resolved_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Resolvido em: {formatDate(occurrence.resolved_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {occurrence.status !== 'resolvida' && occurrence.status !== 'cancelada' && (
                        <>
                          <select
                            value={occurrence.status}
                            onChange={(e) => handleUpdateStatus(occurrence.id, e.target.value as any)}
                            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="aberta">Aberta</option>
                            <option value="em_andamento">Em Andamento</option>
                            <option value="resolvida">Resolvida</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                          <button
                            onClick={() => handleResolveOccurrence(occurrence.id)}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Resolver ocorrência"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Resolution Info */}
                  {occurrence.resolved_at && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-800 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Resolvida por: {occurrence.resolved_by}
                        </span>
                        <span className="text-green-600">
                          {formatDate(occurrence.resolved_at)}
                        </span>
                      </div>
                      {occurrence.notes && (
                        <p className="text-sm text-green-700 mt-2">{occurrence.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}