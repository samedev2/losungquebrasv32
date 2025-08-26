import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  userType?: string;
  componentName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Registrar erro no analisador
    ErrorAnalyzer.logError(
      error, 
      this.props.userType || 'unknown', 
      this.props.componentName || 'unknown'
    );

    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Auto-retry após 5 segundos se for o primeiro erro
    if (this.state.retryCount === 0) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de erro padrão
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-2xl w-full">
            <div className="text-center">
              {/* Ícone de erro */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              {/* Título e descrição */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Oops! Algo deu errado
              </h1>
              <p className="text-gray-600 mb-6">
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada automaticamente.
              </p>

              {/* Informações do erro (apenas em desenvolvimento) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Detalhes do Erro (Desenvolvimento)
                  </h3>
                  <div className="text-sm text-red-700 space-y-2">
                    <div>
                      <strong>Erro:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Componente:</strong> {this.props.componentName || 'Desconhecido'}
                    </div>
                    <div>
                      <strong>Usuário:</strong> {this.props.userType || 'Desconhecido'}
                    </div>
                    <div>
                      <strong>Tentativas:</strong> {this.state.retryCount}
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">Stack Trace</summary>
                        <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar Página
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Home className="h-4 w-4" />
                  Ir para Início
                </button>
              </div>

              {/* Informações adicionais */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Se o problema persistir, entre em contato com o suporte técnico.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Erro ID: {Date.now().toString(36)} • Usuário: {this.props.userType}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para usar ErrorBoundary programaticamente
export function useErrorHandler(userType: string, componentName: string) {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    ErrorAnalyzer.logError(error, userType, componentName);
    console.error(`Erro em ${componentName}:`, error, errorInfo);
  }, [userType, componentName]);

  return handleError;
}