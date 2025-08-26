import React, { useState, useEffect } from 'react';
import { Occurrence, OccurrenceTimeline as TimelineEntry, OCCURRENCE_CATEGORIES, PRIORITY_CONFIGS, STATUS_CONFIGS } from '../types/occurrences';
import { Clock, User, MessageSquare, Edit, CheckCircle, X, AlertTriangle, Plus } from 'lucide-react';

interface OccurrenceTimelineProps {
  occurrences: Occurrence[];
  onOccurrenceUpdate?: (occurrence: Occurrence) => void;
  onTimelineAdd?: (occurrenceId: string, entry: Omit<TimelineEntry, 'id' | 'created_at'>) => void;
}

export function OccurrenceTimeline({ occurrences, onOccurrenceUpdate, onTimelineAdd }: OccurrenceTimelineProps) {
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [timelineEntries, setTimelineEntries] = useState<Record<string, TimelineEntry[]>>({});
  const [showCommentForm, setShowCommentForm] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');

  // Simulate timeline entries (in real app, this would come from database)
  useEffect(() => {
    const generateInitialTimeline = (occurrence: Occurrence): TimelineEntry[] => {
      return [
        {
          id: `timeline_${occurrence.id}_1`,
          occurrence_id: occurrence.id,
          action_type: 'criada',
          description: `Ocorrência "${occurrence.title}" foi criada`,
          created_by: occurrence.created_by,
          created_at: occurrence.created_at,
          metadata: { category: occurrence.category, priority: occurrence.priority }
        }
      ];
    };

    const entries: Record<string, TimelineEntry[]> = {};
    occurrences.forEach(occurrence => {
      entries[occurrence.id] = generateInitialTimeline(occurrence);
    });
    setTimelineEntries(entries);
  }, [occurrences]);

  const handleAddComment = async (occurrenceId: string) => {
    if (!commentText.trim() || !commentAuthor.trim()) {
      alert('Comentário e autor são obrigatórios');
      return;
    }

    const newEntry: TimelineEntry = {
      id: `timeline_${occurrenceId}_${Date.now()}`,
      occurrence_id: occurrenceId,
      action_type: 'comentario',
      description: commentText.trim(),
      created_by: commentAuthor.trim(),
      created_at: new Date().toISOString()
    };

    setTimelineEntries(prev => ({
      ...prev,
      [occurrenceId]: [...(prev[occurrenceId] || []), newEntry]
    }));

    if (onTimelineAdd) {
      onTimelineAdd(occurrenceId, {
        occurrence_id: occurrenceId,
        action_type: 'comentario',
        description: commentText.trim(),
        created_by: commentAuthor.trim()
      });
    }

    setCommentText('');
    setCommentAuthor('');
    setShowCommentForm(null);
  };

  const handleStatusChange = (occurrence: Occurrence, newStatus: string) => {
    const updatedOccurrence = {
      ...occurrence,
      status: newStatus as any,
      updated_at: new Date().toISOString(),
      ...(newStatus === 'resolvida' ? { resolved_at: new Date().toISOString() } : {})
    };

    const newEntry: TimelineEntry = {
      id: `timeline_${occurrence.id}_${Date.now()}`,
      occurrence_id: occurrence.id,
      action_type: 'status_alterado',
      description: `Status alterado para "${STATUS_CONFIGS[newStatus as keyof typeof STATUS_CONFIGS].label}"`,
      created_by: 'Sistema',
      created_at: new Date().toISOString(),
      metadata: { old_status: occurrence.status, new_status: newStatus }
    };

    setTimelineEntries(prev => ({
      ...prev,
      [occurrence.id]: [...(prev[occurrence.id] || []), newEntry]
    }));

    if (onOccurrenceUpdate) {
      onOccurrenceUpdate(updatedOccurrence);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'criada': return <Plus className="h-4 w-4" />;
      case 'comentario': return <MessageSquare className="h-4 w-4" />;
      case 'status_alterado': return <Edit className="h-4 w-4" />;
      case 'resolvida': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'criada': return 'text-blue-600 bg-blue-100';
      case 'comentario': return 'text-purple-600 bg-purple-100';
      case 'status_alterado': return 'text-orange-600 bg-orange-100';
      case 'resolvida': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (occurrences.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Nenhuma ocorrência para exibir timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Timeline de Ocorrências</h3>
        <p className="text-sm text-gray-600 mt-1">
          Histórico detalhado de {occurrences.length} ocorrência{occurrences.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-6">
        {/* Occurrence Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecione uma ocorrência para ver a timeline:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {occurrences.map((occurrence) => {
              const categoryConfig = OCCURRENCE_CATEGORIES[occurrence.category];
              const priorityConfig = PRIORITY_CONFIGS[occurrence.priority];
              const statusConfig = STATUS_CONFIGS[occurrence.status];
              
              return (
                <button
                  key={occurrence.id}
                  onClick={() => setSelectedOccurrence(occurrence)}
                  className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                    selectedOccurrence?.id === occurrence.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryConfig.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{occurrence.title}</h4>
                        <p className="text-xs text-gray-600">{categoryConfig.label}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                        {priorityConfig.icon}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.icon}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {timelineEntries[occurrence.id]?.length || 0} entrada{(timelineEntries[occurrence.id]?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Display */}
        {selectedOccurrence && (
          <div className="space-y-6">
            {/* Occurrence Header */}
            <div className={`p-4 rounded-lg border-2 ${OCCURRENCE_CATEGORIES[selectedOccurrence.category].bgColor}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{OCCURRENCE_CATEGORIES[selectedOccurrence.category].icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedOccurrence.title}</h4>
                    <p className="text-sm text-gray-600">{selectedOccurrence.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedOccurrence.status}
                    onChange={(e) => handleStatusChange(selectedOccurrence, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                      <option key={status} value={status}>
                        {config.icon} {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Criado por: {selectedOccurrence.created_by}</span>
                <span>{formatDateTime(selectedOccurrence.created_at)}</span>
              </div>
            </div>

            {/* Timeline Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-gray-900">Histórico da Ocorrência</h5>
                <button
                  onClick={() => setShowCommentForm(selectedOccurrence.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Comentário
                </button>
              </div>

              {/* Comment Form */}
              {showCommentForm === selectedOccurrence.id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h6 className="font-medium text-blue-900 mb-3">Novo Comentário</h6>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comentário
                      </label>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite seu comentário..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Autor
                      </label>
                      <input
                        type="text"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddComment(selectedOccurrence.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => {
                          setShowCommentForm(null);
                          setCommentText('');
                          setCommentAuthor('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Items */}
              <div className="space-y-3">
                {(timelineEntries[selectedOccurrence.id] || [])
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((entry, index) => (
                    <div key={entry.id} className="relative">
                      {/* Timeline connector */}
                      {index < (timelineEntries[selectedOccurrence.id] || []).length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Action Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getActionColor(entry.action_type)}`}>
                          {getActionIcon(entry.action_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{entry.description}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.created_by}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(entry.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Metadata */}
                          {entry.metadata && (
                            <div className="mt-2 p-2 bg-white rounded border text-xs">
                              <strong>Detalhes:</strong>
                              <pre className="mt-1 text-gray-600">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}