import { useEffect, useRef } from 'react';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';

// Hook para monitorar renderização e detectar problemas
export function useRenderMonitor(componentName: string, userType: string, dependencies: any[] = []) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const mountTime = useRef(Date.now());

  useEffect(() => {
    const startTime = performance.now();
    renderCount.current++;

    // Detectar re-renderizações excessivas
    const timeSinceLastRender = Date.now() - lastRenderTime.current;
    if (timeSinceLastRender < 100 && renderCount.current > 5) {
      console.warn(`Possível loop de renderização detectado em ${componentName}:`, {
        renderCount: renderCount.current,
        timeSinceLastRender,
        userType
      });
      
      ErrorAnalyzer.logError(
        `Loop de renderização detectado - ${renderCount.current} renders em ${Date.now() - mountTime.current}ms`,
        userType,
        componentName
      );
    }

    lastRenderTime.current = Date.now();

    // Medir tempo de renderização
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    ErrorAnalyzer.logPerformance(userType, componentName, renderTime);

    // Log de renderização lenta
    if (renderTime > 1000) {
      console.warn(`Renderização lenta em ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    return () => {
      const unmountTime = performance.now();
      ErrorAnalyzer.logPerformance(userType, `${componentName}_unmount`, unmountTime - startTime);
    };
  }, dependencies);

  // Detectar vazamentos de memória
  useEffect(() => {
    const checkMemory = () => {
      if ((performance as any).memory) {
        const memoryUsage = (performance as any).memory.usedJSHeapSize;
        const memoryLimit = (performance as any).memory.jsHeapSizeLimit;
        
        if (memoryUsage > memoryLimit * 0.8) {
          console.warn(`Alto uso de memória detectado em ${componentName}:`, {
            used: Math.round(memoryUsage / 1024 / 1024),
            limit: Math.round(memoryLimit / 1024 / 1024),
            percentage: Math.round((memoryUsage / memoryLimit) * 100)
          });
          
          ErrorAnalyzer.logError(
            `Alto uso de memória: ${Math.round(memoryUsage / 1024 / 1024)}MB`,
            userType,
            componentName
          );
        }
      }
    };

    const interval = setInterval(checkMemory, 10000); // Verificar a cada 10 segundos
    return () => clearInterval(interval);
  }, [componentName, userType]);

  return {
    renderCount: renderCount.current,
    componentName,
    userType
  };
}