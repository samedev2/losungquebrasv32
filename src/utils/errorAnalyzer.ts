// Script de análise de erros e problemas de renderização
export class ErrorAnalyzer {
  private static errorLog: Array<{
    timestamp: Date;
    error: Error | string;
    userType: string;
    component: string;
    stackTrace?: string;
    userAgent: string;
    url: string;
  }> = [];

  private static performanceLog: Array<{
    timestamp: Date;
    userType: string;
    component: string;
    renderTime: number;
    memoryUsage?: number;
  }> = [];

  /**
   * Registra erros de renderização
   */
  static logError(error: Error | string, userType: string, component: string) {
    const errorEntry = {
      timestamp: new Date(),
      error,
      userType,
      component,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorLog.push(errorEntry);
    console.error('ErrorAnalyzer - Erro registrado:', errorEntry);

    // Manter apenas os últimos 100 erros
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Salvar no localStorage para análise posterior
    try {
      localStorage.setItem('error_log', JSON.stringify(this.errorLog.slice(-20)));
    } catch (e) {
      console.warn('Não foi possível salvar log de erros:', e);
    }
  }

  /**
   * Registra performance de renderização
   */
  static logPerformance(userType: string, component: string, renderTime: number) {
    const perfEntry = {
      timestamp: new Date(),
      userType,
      component,
      renderTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize
    };

    this.performanceLog.push(perfEntry);

    // Manter apenas os últimos 50 registros
    if (this.performanceLog.length > 50) {
      this.performanceLog.shift();
    }

    // Alertar se renderização demorar muito
    if (renderTime > 3000) {
      console.warn(`Renderização lenta detectada: ${component} - ${renderTime}ms`);
    }
  }

  /**
   * Analisa padrões de erro
   */
  static analyzeErrors() {
    const analysis = {
      totalErrors: this.errorLog.length,
      errorsByUserType: {} as Record<string, number>,
      errorsByComponent: {} as Record<string, number>,
      commonErrors: [] as string[],
      recentErrors: this.errorLog.slice(-10),
      recommendations: [] as string[]
    };

    // Agrupar por tipo de usuário
    this.errorLog.forEach(entry => {
      analysis.errorsByUserType[entry.userType] = (analysis.errorsByUserType[entry.userType] || 0) + 1;
      analysis.errorsByComponent[entry.component] = (analysis.errorsByComponent[entry.component] || 0) + 1;
    });

    // Identificar erros comuns
    const errorMessages = this.errorLog.map(entry => 
      entry.error instanceof Error ? entry.error.message : entry.error.toString()
    );
    const errorCounts = errorMessages.reduce((acc, msg) => {
      acc[msg] = (acc[msg] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    analysis.commonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([msg]) => msg);

    // Gerar recomendações
    if (analysis.errorsByUserType['monitoramento'] > 5) {
      analysis.recommendations.push('Alto número de erros no perfil Monitoramento - verificar permissões');
    }
    if (analysis.errorsByUserType['compras'] > 5) {
      analysis.recommendations.push('Alto número de erros no perfil Compras - verificar componentes específicos');
    }
    if (analysis.errorsByUserType['operacao'] > 5) {
      analysis.recommendations.push('Alto número de erros no perfil Operação - verificar carregamento de dados');
    }

    return analysis;
  }

  /**
   * Analisa performance
   */
  static analyzePerformance() {
    const analysis = {
      averageRenderTime: 0,
      slowestComponents: [] as Array<{component: string, avgTime: number}>,
      performanceByUserType: {} as Record<string, {avgTime: number, count: number}>,
      memoryTrends: [] as Array<{timestamp: Date, usage: number}>
    };

    if (this.performanceLog.length === 0) return analysis;

    // Tempo médio de renderização
    const totalTime = this.performanceLog.reduce((sum, entry) => sum + entry.renderTime, 0);
    analysis.averageRenderTime = totalTime / this.performanceLog.length;

    // Componentes mais lentos
    const componentTimes = this.performanceLog.reduce((acc, entry) => {
      if (!acc[entry.component]) {
        acc[entry.component] = { total: 0, count: 0 };
      }
      acc[entry.component].total += entry.renderTime;
      acc[entry.component].count += 1;
      return acc;
    }, {} as Record<string, {total: number, count: number}>);

    analysis.slowestComponents = Object.entries(componentTimes)
      .map(([component, data]) => ({
        component,
        avgTime: data.total / data.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Performance por tipo de usuário
    const userTypeTimes = this.performanceLog.reduce((acc, entry) => {
      if (!acc[entry.userType]) {
        acc[entry.userType] = { total: 0, count: 0 };
      }
      acc[entry.userType].total += entry.renderTime;
      acc[entry.userType].count += 1;
      return acc;
    }, {} as Record<string, {total: number, count: number}>);

    Object.entries(userTypeTimes).forEach(([userType, data]) => {
      analysis.performanceByUserType[userType] = {
        avgTime: data.total / data.count,
        count: data.count
      };
    });

    // Tendências de memória
    analysis.memoryTrends = this.performanceLog
      .filter(entry => entry.memoryUsage)
      .map(entry => ({
        timestamp: entry.timestamp,
        usage: entry.memoryUsage!
      }));

    return analysis;
  }

  /**
   * Gera relatório completo
   */
  static generateReport() {
    const errorAnalysis = this.analyzeErrors();
    const performanceAnalysis = this.analyzePerformance();

    const report = {
      timestamp: new Date().toISOString(),
      errors: errorAnalysis,
      performance: performanceAnalysis,
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    };

    console.log('Relatório de Análise de Erros:', report);
    return report;
  }

  /**
   * Limpa logs antigos
   */
  static clearLogs() {
    this.errorLog.length = 0;
    this.performanceLog.length = 0;
    localStorage.removeItem('error_log');
  }

  /**
   * Verifica se há problemas críticos
   */
  static checkCriticalIssues() {
    const issues = [];

    // Muitos erros recentes
    const recentErrors = this.errorLog.filter(
      entry => new Date().getTime() - entry.timestamp.getTime() < 5 * 60 * 1000 // 5 minutos
    );
    if (recentErrors.length > 5) {
      issues.push('Muitos erros nos últimos 5 minutos');
    }

    // Renderização muito lenta
    const recentPerf = this.performanceLog.filter(
      entry => new Date().getTime() - entry.timestamp.getTime() < 5 * 60 * 1000
    );
    const avgRecentRenderTime = recentPerf.length > 0 
      ? recentPerf.reduce((sum, entry) => sum + entry.renderTime, 0) / recentPerf.length 
      : 0;
    
    if (avgRecentRenderTime > 2000) {
      issues.push('Renderização muito lenta detectada');
    }

    // Uso excessivo de memória
    if ((performance as any).memory?.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
      issues.push('Uso excessivo de memória detectado');
    }

    return issues;
  }
}

// Hook para monitoramento automático
export function useErrorMonitoring(userType: string, componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();

    // Registrar tempo de renderização
    const endTime = performance.now();
    ErrorAnalyzer.logPerformance(userType, componentName, endTime - startTime);

    // Verificar problemas críticos
    const issues = ErrorAnalyzer.checkCriticalIssues();
    if (issues.length > 0) {
      console.warn(`Problemas críticos detectados em ${componentName}:`, issues);
    }

    // Cleanup
    return () => {
      // Log de desmontagem do componente
      ErrorAnalyzer.logPerformance(userType, `${componentName}_unmount`, performance.now() - startTime);
    };
  }, [userType, componentName]);

  // Função para reportar erros manualmente
  const reportError = React.useCallback((error: Error | string) => {
    ErrorAnalyzer.logError(error, userType, componentName);
  }, [userType, componentName]);

  return { reportError };
}