import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { Occurrence, OccurrenceCategory, OccurrencePriority, OCCURRENCE_CATEGORIES, PRIORITY_CONFIGS } from '../types/occurrences';

interface CircularOccurrenceFanProps {
  recordId: string;
  isOpen: boolean;
  onClose: () => void;
  onOccurrenceAdded: (occurrence: Occurrence) => void;
  existingOccurrences: Occurrence[];
}

export function CircularOccurrenceFan({ 
  recordId, 
  isOpen, 
  onClose, 
  onOccurrenceAdded,
  existingOccurrences 
}: CircularOccurrenceFanProps) {
  const [selectedCategory, setSelectedCategory] = useState<OccurrenceCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'outros' as OccurrenceCategory,
    priority: 'media' as OccurrencePriority,
    created_by: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        category: 'outros',
        priority: 'media',
        created_by: ''
      });
    }
  }, [isOpen]);

  const handleCategorySelect = (category: OccurrenceCategory) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category }));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.created_by.trim()) {
      alert('Todos os campos são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const newOccurrence: Occurrence = {
        id: `occ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        record_id: recordId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        status: 'aberta',
        created_by: formData.created_by.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onOccurrenceAdded(newOccurrence);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'outros',
        priority: 'media',
        created_by: ''
      });
      setShowForm(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Erro ao criar ocorrência:', error);
      alert('Erro ao criar ocorrência. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOccurrenceCountByCategory = (category: OccurrenceCategory): number => {
    return existingOccurrences.filter(occ => occ.category === category && occ.status !== 'cancelada').length;
  };

  if (!isOpen) return null;

  const categories = Object.entries(OCCURRENCE_CATEGORIES);
  const radius = 120;
  const centerX = 150;
  const centerY = 150;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciar Ocorrências</h2>
              <p className="text-blue-100 mt-1">
                {existingOccurrences.length} ocorrência{existingOccurrences.length !== 1 ? 's' : ''} registrada{existingOccurrences.length !== 1 ? 's' : ''}
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

        <div className="p-6">
          {!showForm ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Circular Fan */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative" style={{ width: '300px', height: '300px' }}>
                  {/* Center Button */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-sm font-medium text-gray-700">Nova</p>
                      <p className="text-xs text-gray-500">Ocorrência</p>
                    </div>
                  </div>

                  {/* Category Spheres */}
                  {categories.map(([category, config], index) => {
                    const angle = (index * 360) / categories.length;
                    const radian = (angle * Math.PI) / 180;
                    const x = centerX + radius * Math.cos(radian);
                    const y = centerY + radius * Math.sin(radian);
                    const count = getOccurrenceCountByCategory(category as OccurrenceCategory);

                    return (
                      <div
                        key={category}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{ left: x, top: y }}
                        onClick={() => handleCategorySelect(category as OccurrenceCategory)}
                      >
                        {/* Connection Line */}
                        <div
                          className="absolute bg-gray-300 opacity-30 group-hover:opacity-60 transition-opacity"
                          style={{
                            width: `${radius}px`,
                            height: '2px',
                            transformOrigin: '0 50%',
                            transform: `rotate(${angle + 180}deg)`,
                            left: '-60px',
                            top: '50%'
                          }}
                        />

                        {/* Sphere */}
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold shadow-lg transition-all duration-300 hover:scale-125 hover:shadow-xl ${config.bgColor} ${config.color} group-hover:animate-bounce`}>
                          {config.icon}
                          {count > 0 && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                              {count}
                            </div>
                          )}
                        </div>

                        {/* Label */}
                        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-xs font-medium text-gray-700 whitespace-nowrap bg-white px-2 py-1 rounded shadow-lg">
                            {config.label}
                          </p>
                          {count > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {count} ativa{count !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Existing Occurrences Summary */}
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ocorrências Ativas</h3>
                {existingOccurrences.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhuma ocorrência registrada</p>
                    <p className="text-sm mt-1">Clique em uma categoria para adicionar</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {existingOccurrences.map((occurrence) => {
                      const categoryConfig = OCCURRENCE_CATEGORIES[occurrence.category];
                      const priorityConfig = PRIORITY_CONFIGS[occurrence.priority];
                      
                      return (
                        <div key={occurrence.id} className={`p-3 rounded-lg border-2 ${categoryConfig.bgColor}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{categoryConfig.icon}</span>
                              <div>
                                <h4 className="font-medium text-gray-900 text-sm">{occurrence.title}</h4>
                                <p className="text-xs text-gray-600">{categoryConfig.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                                {priorityConfig.icon} {priorityConfig.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 mb-2">{occurrence.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {occurrence.created_by}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(occurrence.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Form */
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl ${OCCURRENCE_CATEGORIES[selectedCategory!].bgColor}`}>
                    {OCCURRENCE_CATEGORIES[selectedCategory!].icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Nova Ocorrência - {OCCURRENCE_CATEGORIES[selectedCategory!].label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {OCCURRENCE_CATEGORIES[selectedCategory!].description}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título da Ocorrência *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Problema no motor"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioridade *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as OccurrencePriority }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(PRIORITY_CONFIGS).map(([priority, config]) => (
                        <option key={priority} value={priority}>
                          {config.icon} {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição Detalhada *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descreva detalhadamente a ocorrência..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsável pelo Registro *
                  </label>
                  <input
                    type="text"
                    value={formData.created_by}
                    onChange={(e) => setFormData(prev => ({ ...prev, created_by: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome do operador responsável"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Salvar Ocorrência
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}