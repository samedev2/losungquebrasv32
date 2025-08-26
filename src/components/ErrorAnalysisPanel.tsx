import React, { useState, useEffect } from 'react';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';
import { 
  Bug, 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  RefreshCw, 
  Download,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  User,
  Monitor
} from 'lucide-react';

export function ErrorAnalysisPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (isVisible) {
      updateAnalysis();
    }
  }, [isVisible]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(updateAnalysis, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const updateAnalysis = () => {
    const report = ErrorAnalyzer.generateReport();
    setAnalysis(report);
  };

  const handleExportReport = () => {
    const report = ErrorAnalyzer.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-analysis-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os logs?')) {
      ErrorAnalyzer.clearLogs();
      setAnalysis(null);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-50"
        title="Abrir Análise de Erros"
      >
        <Bug className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Bug className="h-6 w-6" />
                Análise de Erros e Performance
              </h2>
              <p className="text-red-100 mt-1">
                Monitoramento em tempo real de problemas na aplicação
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh ? 'bg-green-500 hover:bg-green-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                }`}
                title={autoRefresh ? 'Desativar atualização automática' : 'Ativar atualização automática'}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <EyeOff className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Actions */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={updateAnalysis}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Análise
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar Relatório
            </button>
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Logs
            </button>
          </div>

          {analysis ? (
            <div className="space-y-6">
              {/* Resumo Geral */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">Total de Erros</span>
                  </div>
                  <div className="text-2xl font-bold text-red-700">{analysis.errors.totalErrors}</div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Tempo Médio</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {analysis.performance.averageRenderTime?.toFixed(0) || 0}ms
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Memória</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {analysis.systemInfo.memory ? 
                      Math.round(analysis.systemInfo.memory.used / 1024 / 1024) + 'MB' : 
                      'N/A'
                    }
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Status</span>
                  </div>
                  <div className="text-lg font-bold text-green-700">
                    {analysis.errors.totalErrors < 5 ? 'Estável' : 'Instável'}
                  </div>
                </div>
              </div>

              {/* Erros por Tipo de Usuário */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Erros por Tipo de Usuário
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analysis.errors.errorsByUserType).map(([userType, count]) => (
                    <div key={userType} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700 capitalize">{userType}</span>
                        <span className={`font-bold ${
                          count > 5 ? 'text-red-600' : count > 2 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Componentes Mais Lentos */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Componentes Mais Lentos
                </h3>
                <div className="space-y-3">
                  {analysis.performance.slowestComponents?.slice(0, 5).map((comp: any, index: number) => (
                    <div key={comp.component} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{comp.component}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              comp.avgTime > 1000 ? 'bg-red-500' : 
                              comp.avgTime > 500 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((comp.avgTime / 2000) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`font-bold text-sm ${
                          comp.avgTime > 1000 ? 'text-red-600' : 
                          comp.avgTime > 500 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {comp.avgTime.toFixed(0)}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Erros Recentes */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Erros Recentes
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analysis.errors.recentErrors?.map((error: any, index: number) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-red-800">
                          {error.error instanceof Error ? error.error.message : error.error}
                        </span>
                        <span className="text-xs text-red-600">
                          {new Date(error.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-xs text-red-700 space-y-1">
                        <div>Usuário: {error.userType} | Componente: {error.component}</div>
                        <div>URL: {error.url}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendações */}
              {analysis.errors.recommendations?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-4">Recomendações</h3>
                  <ul className="space-y-2">
                    {analysis.errors.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-yellow-800">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Informações do Sistema */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>User Agent:</strong>
                    <div className="text-gray-600 break-all">{analysis.systemInfo.userAgent}</div>
                  </div>
                  <div>
                    <strong>Viewport:</strong>
                    <div className="text-gray-600">
                      {analysis.systemInfo.viewport.width} x {analysis.systemInfo.viewport.height}
                    </div>
                  </div>
                  <div>
                    <strong>URL:</strong>
                    <div className="text-gray-600 break-all">{analysis.systemInfo.url}</div>
                  </div>
                  <div>
                    <strong>Timestamp:</strong>
                    <div className="text-gray-600">{new Date(analysis.timestamp).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bug className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Clique em "Atualizar Análise" para gerar o relatório</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}