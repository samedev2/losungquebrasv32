import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorAnalyzer } from './utils/errorAnalyzer';

// Error boundary for mobile compatibility
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Erro na aplicação:', error);
    ErrorAnalyzer.logError(error instanceof Error ? error : 'Erro crítico', 'system', 'main');
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>Erro ao carregar a aplicação</h1>
        <p>Por favor, recarregue a página.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Recarregar
        </button>
      </div>
    );
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  ErrorAnalyzer.logError(event.error || event.message, 'system', 'global');
window.addEventListener('unhandledrejection', (event) => {
  ErrorAnalyzer.logError(event.reason, 'system', 'promise');
});
});
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  console.error('Elemento root não encontrado');
  ErrorAnalyzer.logError('Elemento root não encontrado', 'system', 'main');
}