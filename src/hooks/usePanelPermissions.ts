import { useState, useEffect, useCallback } from 'react';
import { PanelPermissionService } from '../lib/panelPermissionService';
import { EffectivePanelPermission } from '../types/panelPermissions';
import { useAuth } from './useAuth';

export function usePanelPermissions(userId?: string) {
  const { authState } = useAuth();
  const [permissions, setPermissions] = useState<EffectivePanelPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || authState.user?.id;

  const loadPermissions = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Carregando permissões para usuário: ${targetUserId}`);
      const userPermissions = await PanelPermissionService.getUserPanelPermissions(targetUserId);
      console.log(`Permissões carregadas: ${userPermissions.length} painéis`);
      
      setPermissions(userPermissions);
      
      // Se não há permissões, tentar aplicar permissões padrão
      if (userPermissions.length === 0) {
        console.log('Nenhuma permissão encontrada, tentando aplicar permissões padrão...');
        try {
          // Buscar tipo do usuário
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('profile_type')
            .eq('id', targetUserId)
            .single();
            
          if (!userError && userData) {
            await PanelPermissionService.applyDefaultPermissions(targetUserId, userData.profile_type);
            // Recarregar permissões
            const updatedPermissions = await PanelPermissionService.getUserPanelPermissions(targetUserId, false);
            setPermissions(updatedPermissions);
            console.log(`Permissões padrão aplicadas: ${updatedPermissions.length} painéis`);
          }
        } catch (defaultError) {
          console.warn('Erro ao aplicar permissões padrão:', defaultError);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((panelKey: string): boolean => {
    const permission = permissions.find(p => p.panel_key === panelKey);
    return permission?.is_allowed || false;
  }, [permissions]);

  const getAllowedPanels = useCallback((): EffectivePanelPermission[] => {
    return permissions.filter(p => p.is_allowed);
  }, [permissions]);

  const getPanelsByCategory = useCallback((category: string): EffectivePanelPermission[] => {
    return permissions.filter(p => p.panel_category === category && p.is_allowed);
  }, [permissions]);

  const refreshPermissions = useCallback(async () => {
    if (targetUserId) {
      PanelPermissionService.clearUserCache(targetUserId);
      await loadPermissions();
    }
  }, [targetUserId, loadPermissions]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    getAllowedPanels,
    getPanelsByCategory,
    refreshPermissions,
    clearError: () => setError(null)
  };
}

// Hook específico para verificação rápida de permissão
export function useHasPanelPermission(panelKey: string): boolean {
  const { hasPermission } = usePanelPermissions();
  return hasPermission(panelKey);
}

// Hook para administradores gerenciarem permissões
export function usePanelPermissionManagement() {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateGroupPermission = useCallback(async (
    userType: string,
    panelKey: string,
    isAllowed: boolean
  ) => {
    if (!authState.user?.id) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);
      await PanelPermissionService.updateGroupPermission(
        userType,
        panelKey,
        isAllowed,
        authState.user.id
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar permissão';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authState.user?.id]);

  const updateUserPermission = useCallback(async (
    userId: string,
    panelKey: string,
    isAllowed: boolean,
    overrideGroup: boolean = true
  ) => {
    if (!authState.user?.id) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);
      await PanelPermissionService.updateUserPermission(
        userId,
        panelKey,
        isAllowed,
        overrideGroup,
        authState.user.id
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar permissão';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authState.user?.id]);

  const removeUserPermission = useCallback(async (
    userId: string,
    panelKey: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      await PanelPermissionService.removeUserPermission(userId, panelKey);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover permissão';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const copyUserPermissions = useCallback(async (
    sourceUserId: string,
    targetUserId: string
  ) => {
    if (!authState.user?.id) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);
      await PanelPermissionService.copyUserPermissions(
        sourceUserId,
        targetUserId,
        authState.user.id
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao copiar permissões';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authState.user?.id]);

  return {
    loading,
    error,
    updateGroupPermission,
    updateUserPermission,
    removeUserPermission,
    copyUserPermissions,
    clearError: () => setError(null)
  };
}