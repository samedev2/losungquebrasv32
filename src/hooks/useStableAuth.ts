import { useState, useEffect, useRef, useCallback } from 'react';
import { User, AuthState, LoginCredentials } from '../types/user';
import { authService } from '../lib/authService';

// Hook melhorado para autenticação estável
export function useStableAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const isInitialized = useRef(false);
  const authCheckInProgress = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Função estável para verificar autenticação
  const checkAuthStatus = useCallback(async (isRetry = false) => {
    // Evitar múltiplas verificações simultâneas
    if (authCheckInProgress.current && !isRetry) {
      return;
    }

    authCheckInProgress.current = true;

    try {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: isRetry ? null : prev.error 
      }));
      
      const isAuth = await authService.isAuthenticated();
      const user = authService.getCurrentUser();

      setAuthState({
        user,
        isAuthenticated: isAuth,
        isLoading: false,
        error: null
      });

      retryCount.current = 0; // Reset retry count on success
      isInitialized.current = true;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      
      retryCount.current++;
      
      // Se não conseguiu autenticar e ainda tem tentativas
      if (retryCount.current < maxRetries) {
        console.log(`Tentativa ${retryCount.current} de ${maxRetries} falhou, tentando novamente...`);
        setTimeout(() => {
          checkAuthStatus(true);
        }, 1000 * retryCount.current); // Delay progressivo
        return;
      }

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro de autenticação'
      });
    } finally {
      authCheckInProgress.current = false;
    }
  }, []);

  // Inicialização única
  useEffect(() => {
    if (!isInitialized.current) {
      checkAuthStatus();
    }
  }, [checkAuthStatus]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { user } = await authService.login(credentials);
      
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      retryCount.current = 0;
    } catch (error) {
      console.error('Erro no login:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro no login'
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      retryCount.current = 0;
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar estado local
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission as any);
  }, []);

  const isAdmin = useCallback((): boolean => {
    return authService.isAdmin();
  }, []);

  const refreshAuth = useCallback(() => {
    retryCount.current = 0;
    checkAuthStatus(true);
  }, [checkAuthStatus]);

  return {
    authState,
    login,
    logout,
    hasPermission,
    isAdmin,
    checkAuthStatus: refreshAuth,
    isInitialized: isInitialized.current
  };
}