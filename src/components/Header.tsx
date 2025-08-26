import React from 'react';
import { Plus, List, LogOut, Settings, User } from 'lucide-react';
import { SyncIndicator } from './SyncIndicator';
import { useViewMode } from '../hooks/useViewMode';
import { User as UserType } from '../types/user';

interface SyncState {
  isOnline: boolean;
  lastSync: Date | null;
  syncCount: number;
  hasChanges: boolean;
}

interface HeaderProps {
  currentView: 'records' | 'new' | 'tracking';
  onViewChange: (view: 'records' | 'new' | 'tracking') => void;
  user: UserType | null;
  onLogout: () => void;
  syncState?: SyncState;
}

export function Header({ currentView, onViewChange, user, onLogout, syncState }: HeaderProps) {
  const { isPinned: isViewModePinned } = useViewMode();
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 hidden lg:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Acompanhamento Quebras Losung</h1>
                {user && (
                  <p className="text-sm text-gray-600">
                    Logado como: <span className="font-medium text-blue-600">{user.full_name}</span> 
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {user.user_type.toUpperCase()}
                    </span>
                    {isViewModePinned && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs animate-pulse">
                        MODO FIXADO
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {syncState && (
              <div className="ml-6">
                <SyncIndicator 
                  syncState={syncState} 
                  onForceSync={() => {
                    // Implementar força de sincronização se disponível
                    window.location.reload();
                  }}
                />
              </div>
            )}
          </div>
          
          <nav className="hidden lg:flex space-x-4">
            {user?.user_type === 'admin' && (
              <button
                onClick={() => setCurrentView('records')} // Admin panel será mostrado na view records
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Painel Admin
              </button>
            )}
            
            <button
              onClick={() => onViewChange('records')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'records'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" />
              Dashboard & Registros
            </button>
            
            <button
              onClick={() => onViewChange('new')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'new'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Plus className="h-4 w-4" />
              Nova Quebra
            </button>
            
            {currentView === 'tracking' && (
              <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                Modo Rastreamento Ativo
              </div>
            )}
            
            {/* User Menu */}
            <div className="flex items-center gap-4 ml-6 pl-6 border-l border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-1.5 rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{user?.full_name}</div>
                  <div className="text-gray-500">{user?.user_type.toUpperCase()}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                title="Sair do sistema"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}