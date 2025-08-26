import { supabase } from './supabase';
import { User, LoginCredentials, UserSession, UserType, USER_TYPE_CONFIGS } from '../types/user';
import bcrypt from 'bcryptjs';

class AuthService {
  private currentUser: User | null = null;
  private sessionToken: string | null = null;

  // Login do usuário
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      console.log('Tentando fazer login:', credentials.email);

      // Buscar usuário no banco
      const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .limit(1);

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        throw new Error('Erro interno do servidor');
      }

      if (!users || users.length === 0) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      const user = users[0];

      // Verificar senha
      const isPasswordValid = await this.verifyPassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Senha incorreta');
      }

      // Criar sessão
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 horas de duração

      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) {
        console.error('Erro ao criar sessão:', sessionError);
        throw new Error('Erro ao criar sessão');
      }

      // Armazenar no localStorage
      localStorage.setItem('auth_token', sessionToken);
      localStorage.setItem('user_profile', JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.profile_type,
        is_active: user.is_active
      }));

      this.currentUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.profile_type,
        is_active: user.is_active,
        created_by: user.created_by,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
      this.sessionToken = sessionToken;

      console.log('Login realizado com sucesso:', user.email);
      return { user: this.currentUser, token: sessionToken };
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  // Logout do usuário
  async logout(): Promise<void> {
    try {
      if (this.sessionToken) {
        // Remover sessão do banco
        await supabase
          .from('user_sessions')
          .delete()
          .eq('session_token', this.sessionToken);
      }

      // Limpar localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');

      this.currentUser = null;
      this.sessionToken = null;

      console.log('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar dados locais
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
      this.currentUser = null;
      this.sessionToken = null;
    }
  }

  // Verificar se usuário está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      // Verificar se a sessão ainda é válida
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('session_token', token)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (error || !sessions || sessions.length === 0) {
        this.logout();
        return false;
      }

      const session = sessions[0];
      const userProfile = session.user_profiles;

      if (!userProfile || !userProfile.is_active) {
        this.logout();
        return false;
      }

      this.currentUser = {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        user_type: userProfile.profile_type,
        is_active: userProfile.is_active,
        created_by: userProfile.created_by,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at
      };
      this.sessionToken = token;
      return true;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  }

  // Obter usuário atual
  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('user_profile');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch (error) {
          console.error('Erro ao parsear usuário armazenado:', error);
          localStorage.removeItem('user_profile');
        }
      }
    }
    return this.currentUser;
  }

  // Verificar permissões específicas
  hasPermission(permission: keyof typeof USER_TYPE_CONFIGS.admin.permissions): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const userConfig = USER_TYPE_CONFIGS[user.user_type];
    return userConfig ? userConfig.permissions[permission] : false;
  }

  // Verificar se é admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'admin' || false;
  }

  // Gerar token de sessão
  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Verificar senha
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Se o hash começar com $2a$, $2b$, ou $2y$, é um hash bcrypt válido
      if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(password, hash);
      }
      
      // Para compatibilidade com dados existentes (senhas em texto plano ou com prefixo)
      if (hash.startsWith('hashed_')) {
        return password === hash.replace('hashed_', '');
      }
      
      // Comparação direta para dados legados
      return password === hash;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }

  // Hash da senha
  private async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Erro ao fazer hash da senha:', error);
      throw new Error('Erro ao processar senha');
    }
  }

  // Métodos para administração de usuários (apenas admin)
  async createUser(userData: Partial<User> & { password: string }): Promise<User> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.user_type !== 'admin') {
        throw new Error('Apenas administradores podem criar usuários');
      }

      // Validar dados obrigatórios
      if (!userData.email || !userData.password || !userData.full_name || !userData.user_type) {
        throw new Error('Email, senha, nome completo e tipo de usuário são obrigatórios');
      }

      // Verificar se email já existe
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', userData.email)
        .limit(1);

      if (checkError) {
        throw new Error('Erro ao verificar email existente');
      }

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const hashedPassword = await this.hashPassword(userData.password);

      const { data: newUser, error } = await supabase
        .from('user_profiles')
        .insert({
          email: userData.email,
          password_hash: hashedPassword,
          full_name: userData.full_name,
          profile_type: userData.user_type,
          is_active: userData.is_active ?? true,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar usuário:', error);
        throw new Error('Erro ao criar usuário: ' + error.message);
      }

      return {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        user_type: newUser.profile_type,
        is_active: newUser.is_active,
        created_by: newUser.created_by,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.user_type !== 'admin') {
        throw new Error('Apenas administradores podem atualizar usuários');
      }

      // Não permitir alterar email
      const { email, ...allowedUpdates } = updates;
      
      const updateData: any = {
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      };

      // Se estiver alterando o tipo de usuário, mapear corretamente
      if (updates.user_type) {
        updateData.profile_type = updates.user_type;
        delete updateData.user_type;
      }

      const { data: updatedUser, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw new Error('Erro ao atualizar usuário: ' + error.message);
      }

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        user_type: updatedUser.profile_type,
        is_active: updatedUser.is_active,
        created_by: updatedUser.created_by,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.user_type !== 'admin') {
        throw new Error('Apenas administradores podem alterar senhas');
      }

      if (!newPassword || newPassword.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      const hashedPassword = await this.hashPassword(newPassword);

      const { error } = await supabase
        .from('user_profiles')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        throw new Error('Erro ao atualizar senha: ' + error.message);
      }

      console.log('Senha atualizada com sucesso para usuário:', userId);
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.user_type !== 'admin') {
        throw new Error('Apenas administradores podem deletar usuários');
      }

      // Não permitir deletar a si mesmo
      if (userId === currentUser.id) {
        throw new Error('Não é possível deletar seu próprio usuário');
      }

      // Primeiro, deletar todas as sessões do usuário
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      // Depois, deletar o usuário
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Erro ao deletar usuário:', error);
        throw new Error('Erro ao deletar usuário: ' + error.message);
      }

      console.log('Usuário deletado com sucesso:', userId);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.user_type !== 'admin') {
        throw new Error('Apenas administradores podem listar usuários');
      }

      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw new Error('Erro ao buscar usuários: ' + error.message);
      }

      return (users || []).map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.profile_type,
        is_active: user.is_active,
        created_by: user.created_by,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  // Garantir que usuários demo existam
  async ensureDemoUsersExist(): Promise<void> {
    try {
      const demoUsers = [
        {
          email: 'admin@losung.com',
          password: 'admin123',
          full_name: 'Administrador Sistema',
          profile_type: 'admin'
        },
        {
          email: 'torre@losung.com',
          password: 'torre123',
          full_name: 'Torre de Controle',
          profile_type: 'torre'
        },
        {
          email: 'compras@losung.com',
          password: 'compras123',
          full_name: 'Setor de Compras',
          profile_type: 'compras'
        },
        {
          email: 'operacao@losung.com',
          password: 'operacao123',
          full_name: 'Setor de Operação',
          profile_type: 'operacao'
        },
        {
          email: 'monitoramento@losung.com',
          password: 'monitor123',
          full_name: 'Setor de Monitoramento',
          profile_type: 'monitoramento'
        }
      ];

      for (const demoUser of demoUsers) {
        // Verificar se usuário já existe
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', demoUser.email)
          .limit(1);

        if (!existingUser || existingUser.length === 0) {
          // Criar usuário demo
          const hashedPassword = await this.hashPassword(demoUser.password);
          
          const { error } = await supabase
            .from('user_profiles')
            .insert({
              email: demoUser.email,
              password_hash: hashedPassword,
              full_name: demoUser.full_name,
              profile_type: demoUser.profile_type,
              is_active: true
            });

          if (error) {
            console.warn(`Erro ao criar usuário demo ${demoUser.email}:`, error);
          } else {
            console.log(`Usuário demo criado: ${demoUser.email}`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao garantir usuários demo:', error);
    }
  }

  // Método para alterar própria senha
  async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados completos do usuário
      const { data: userData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (fetchError || !userData) {
        throw new Error('Erro ao buscar dados do usuário');
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, userData.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Senha atual incorreta');
      }

      // Validar nova senha
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Nova senha deve ter pelo menos 6 caracteres');
      }

      // Hash da nova senha
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Atualizar senha
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          password_hash: hashedNewPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Erro ao atualizar senha: ' + updateError.message);
      }

      console.log('Senha alterada com sucesso');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  // Método para resetar senha (apenas admin)
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.user_type !== 'admin') {
        throw new Error('Apenas administradores podem resetar senhas');
      }

      await this.updateUserPassword(userId, newPassword);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();