import React from 'react';
import { List, Grid, LayoutGrid, Pin, PinOff } from 'lucide-react';

export type ViewMode = 'arrow' | 'card';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export function ViewModeToggle({ 
  currentMode, 
  onModeChange, 
  className = '', 
  isPinned = false,
  onPinToggle 
}: ViewModeToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onModeChange('arrow')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentMode === 'arrow'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
        title="Visualização em Lista"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Lista</span>
      </button>
      
      <button
        onClick={() => onModeChange('card')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentMode === 'card'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
        title="Visualização em Cards"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
      </div>
      
      {onPinToggle && (
        <button
          onClick={onPinToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isPinned
              ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
          }`}
          title={isPinned ? "Desafixar modo de visualização" : "Fixar modo de visualização"}
        >
          {isPinned ? (
            <>
              <Pin className="h-4 w-4" />
              <span className="hidden sm:inline">Fixado</span>
            </>
          ) : (
            <>
              <PinOff className="h-4 w-4" />
              <span className="hidden sm:inline">Fixar</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}