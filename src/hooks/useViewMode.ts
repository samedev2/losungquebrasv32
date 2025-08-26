import { useState, useEffect } from 'react';

export type ViewMode = 'arrow' | 'card';

const VIEW_MODE_STORAGE_KEY = 'logistics_view_mode';
const VIEW_MODE_PINNED_KEY = 'logistics_view_mode_pinned';

export function useViewMode(defaultMode: ViewMode = 'arrow') {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [isPinned, setIsPinned] = useState(false);

  // Carregar preferências do localStorage na inicialização
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode;
      const savedPinned = localStorage.getItem(VIEW_MODE_PINNED_KEY) === 'true';
      
      if (savedMode && (savedMode === 'arrow' || savedMode === 'card')) {
        setViewMode(savedMode);
      }
      
      setIsPinned(savedPinned);
    } catch (error) {
      console.warn('Erro ao carregar preferências de visualização:', error);
    }
  }, []);

  // Salvar no localStorage quando o modo mudar (apenas se estiver fixado)
  const handleModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    
    if (isPinned) {
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode);
      } catch (error) {
        console.warn('Erro ao salvar modo de visualização:', error);
      }
    }
  };

  // Alternar fixação
  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    
    try {
      localStorage.setItem(VIEW_MODE_PINNED_KEY, newPinned.toString());
      
      if (newPinned) {
        // Se estiver fixando, salvar o modo atual
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
      } else {
        // Se estiver desfixando, remover a preferência salva
        localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Erro ao salvar estado de fixação:', error);
    }
  };

  // Resetar para o modo padrão (usado quando desfixar)
  const resetToDefault = () => {
    setViewMode(defaultMode);
    setIsPinned(false);
    
    try {
      localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
      localStorage.removeItem(VIEW_MODE_PINNED_KEY);
    } catch (error) {
      console.warn('Erro ao resetar preferências:', error);
    }
  };

  return {
    viewMode,
    isPinned,
    setViewMode: handleModeChange,
    togglePin,
    resetToDefault
  };
}