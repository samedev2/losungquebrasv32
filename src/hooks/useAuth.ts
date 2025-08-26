import { useState, useEffect, createContext, useContext } from 'react';
import { User, AuthState, LoginCredentials } from '../types/user';
import { authService } from '../lib/authService';
import { ErrorAnalyzer } from '../utils/errorAnalyzer';

const AuthContext = createContext<{
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isInitialized: boolean;
} | null>(null);

export function useAuthHook() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Garantir que usuários demo existam
      await authService.ensureDemoUsersExist();
      
      // Verificar autenticação
      await checkAuthStatus();
    } catch (error) {
      console.error('Erro na inicialização:', error);
      ErrorAnalyzer.logError(error instanceof Error ? error : 'Erro de inicialização', 'system', 'useAuth');
    } finally {
      setIsInitialized(true);
    }
  };

  const checkAuthStatus = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const isAuth = await authService.isAuthenticated();
      const user = authService.getCurrentUser();

      setAuthState({
        user,
        isAuthenticated: isAuth,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      ErrorAnalyzer.logError(error instanceof Error ? error : 'Erro de autenticação', 'system', 'useAuth');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro de autenticação'
      });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { user } = await authService.login(credentials);
      
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Erro no login:', error);
      ErrorAnalyzer.logError(error instanceof Error ? error : 'Erro de login', 'system', 'useAuth');
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro no login'
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      ErrorAnalyzer.logError(error instanceof Error ? error : 'Erro de logout', authState.user?.user_type || 'unknown', 'useAuth');
    }
  };

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission as any);
  };

  const isAdmin = (): boolean => {
    return authService.isAdmin();
  };

  return {
    authState,
    login,
    logout,
    hasPermission,
    isAdmin,
    checkAuthStatus,
    isInitialized
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export const AuthProvider = AuthContext.Provider;