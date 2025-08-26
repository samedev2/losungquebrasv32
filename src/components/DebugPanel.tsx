import React, { useState } from 'react';
import { ErrorAnalysisPanel } from './ErrorAnalysisPanel';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';
import { useAuth } from '../hooks/useAuth';
import { Bug, Settings, Eye, RefreshCw } from 'lucide-react';

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const { authState } = useAuth();

  // Só mostrar para admins ou em desenvolvimento
  const shouldShow = process.env.NODE_ENV === 'development' || authState.user?.user_type === 'admin';

  if (!shouldShow) return null;

  const handleForceError = () => {
    throw new Error('Erro forçado para teste do sistema de análise');
  };

  const handleTestPerformance = () => {
    const start = performance.now();
    // Simular operação pesada
    for (let i = 0; i < 1000000; i++) {
      Math.random();
    }
    const end = performance.now();
    ErrorAnalyzer.logPerformance(authState.user?.user_type || 'test', 'DebugPanel_test', end - start);
  };

  const handleGenerateReport = () => {
    const report = ErrorAnalyzer.generateReport();
    console.log('Relatório de Debug:', report);
    alert('Relatório gerado no console');
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-20 left-4 z-40">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          title="Abrir Painel de Debug"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-20 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40 max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Debug Panel
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleForceError}
            className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Forçar Erro
          </button>
          
          <button
            onClick={handleTestPerformance}
            className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
          >
            Teste Performance
          </button>
          
          <button
            onClick={handleGenerateReport}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Gerar Relatório
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
          <div>Usuário: {authState.user?.user_type}</div>
          <div>Env: {process.env.NODE_ENV}</div>
          <div>Erros: {ErrorAnalyzer.analyzeErrors().totalErrors}</div>
        </div>
      </div>

      <ErrorAnalysisPanel />
    </>
  );
}