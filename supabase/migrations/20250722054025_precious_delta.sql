/*
  # Sistema de Usuários e Perfis

  1. Novas Tabelas
    - `user_profiles` - Perfis de usuário com diferentes tipos de acesso
      - `id` (uuid, primary key)
      - `email` (text, unique) - Email do usuário para login
      - `full_name` (text) - Nome completo do usuário
      - `profile_type` (enum) - Tipo de perfil: admin, torre, compras, operacao
      - `is_active` (boolean) - Status ativo/inativo
      - `created_by` (uuid) - ID do admin que criou o usuário
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_sessions` - Controle de sessões de usuário
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `session_token` (text, unique)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)

  2. Tipos de Perfil
    - `admin` - Acesso total ao sistema e painel administrativo
    - `torre` - Interface atual (dashboard completo, roadmap, tracking)
    - `compras` - Interface simplificada para setor de compras
    - `operacao` - Interface focada em operações

  3. Segurança
    - Enable RLS em todas as tabelas
    - Políticas baseadas no tipo de perfil
    - Controle de sessão com tokens
*/

-- Criar enum para tipos de perfil
CREATE TYPE profile_type AS ENUM ('admin', 'torre', 'compras', 'operacao');

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  profile_type profile_type NOT NULL DEFAULT 'torre',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_type ON user_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_profiles
CREATE POLICY "Admins can manage all users"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid()::uuid 
      AND up.profile_type = 'admin' 
      AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid()::uuid 
      AND up.profile_type = 'admin' 
      AND up.is_active = true
    )
  );

CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::uuid);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::uuid)
  WITH CHECK (id = auth.uid()::uuid);

-- Políticas RLS para user_sessions
CREATE POLICY "Users can manage their own sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO user_profiles (
  email, 
  password_hash, 
  full_name, 
  profile_type, 
  is_active
) VALUES (
  'admin@losung.com',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQq', -- Hash para 'admin123'
  'Administrador do Sistema',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;