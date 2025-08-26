/*
  # Sistema de Controle de Visibilidade de Painéis

  1. Novas Tabelas
    - `panel_definitions` - Define os painéis disponíveis no sistema
    - `user_panel_permissions` - Permissões específicas por usuário
    - `group_panel_permissions` - Permissões por grupo/tipo de usuário
    - `panel_permission_audit` - Log de auditoria das alterações

  2. Segurança
    - Enable RLS em todas as tabelas
    - Políticas para acesso apenas por administradores
    - Auditoria automática de mudanças

  3. Funcionalidades
    - Sistema de herança de permissões (grupo → usuário)
    - Cache de permissões para performance
    - Permissões padrão para novos usuários
    - Log completo de alterações
*/

-- Tabela de definições de painéis
CREATE TABLE IF NOT EXISTS panel_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_key text UNIQUE NOT NULL,
  panel_name text NOT NULL,
  panel_description text DEFAULT '',
  panel_category text DEFAULT 'dashboard',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  required_permissions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de permissões por grupo/tipo de usuário
CREATE TABLE IF NOT EXISTS group_panel_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text NOT NULL,
  panel_key text NOT NULL REFERENCES panel_definitions(panel_key) ON DELETE CASCADE,
  is_allowed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_type, panel_key)
);

-- Tabela de permissões específicas por usuário
CREATE TABLE IF NOT EXISTS user_panel_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  panel_key text NOT NULL REFERENCES panel_definitions(panel_key) ON DELETE CASCADE,
  is_allowed boolean DEFAULT false,
  override_group boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, panel_key)
);

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS panel_permission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL, -- 'grant', 'revoke', 'create_panel', 'update_panel'
  target_type text NOT NULL, -- 'user', 'group', 'panel'
  target_id text NOT NULL,
  panel_key text,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid REFERENCES user_profiles(id),
  changed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Inserir definições dos painéis existentes
INSERT INTO panel_definitions (panel_key, panel_name, panel_description, panel_category, display_order) VALUES
('status_filter_dashboard', 'Dashboard de Status', 'Dashboard interativo com filtros por status', 'dashboard', 1),
('status_distribution_dashboard', 'Dashboard - Distribuição por Status', 'Visualização da distribuição de registros por status', 'dashboard', 2),
('breakdown_type_distribution', 'Distribuição por Tipo de Quebra', 'Análise dos tipos de quebra mais frequentes', 'analytics', 3),
('recent_activity', 'Atividade Recente', 'Últimas atividades e atualizações do sistema', 'monitoring', 4),
('logistics_roadmap', 'Roadmap de Processos Logísticos', 'Visualização do progresso dos processos logísticos', 'process', 5),
('process_timeline', 'Linha do Tempo do Processo', 'Timeline detalhada de cada processo', 'process', 6)
ON CONFLICT (panel_key) DO UPDATE SET
  panel_name = EXCLUDED.panel_name,
  panel_description = EXCLUDED.panel_description,
  updated_at = now();

-- Inserir permissões padrão por grupo
INSERT INTO group_panel_permissions (user_type, panel_key, is_allowed, is_default) VALUES
-- Admin: acesso total
('admin', 'status_filter_dashboard', true, true),
('admin', 'status_distribution_dashboard', true, true),
('admin', 'breakdown_type_distribution', true, true),
('admin', 'recent_activity', true, true),
('admin', 'logistics_roadmap', true, true),
('admin', 'process_timeline', true, true),

-- Torre: acesso completo aos dashboards
('torre', 'status_filter_dashboard', true, true),
('torre', 'status_distribution_dashboard', true, true),
('torre', 'breakdown_type_distribution', true, true),
('torre', 'recent_activity', true, true),
('torre', 'logistics_roadmap', true, true),
('torre', 'process_timeline', true, true),

-- Compras: acesso limitado
('compras', 'status_filter_dashboard', true, true),
('compras', 'recent_activity', true, true),
('compras', 'breakdown_type_distribution', false, true),
('compras', 'status_distribution_dashboard', false, true),
('compras', 'logistics_roadmap', false, true),
('compras', 'process_timeline', false, true),

-- Operação: acesso operacional
('operacao', 'status_filter_dashboard', true, true),
('operacao', 'recent_activity', true, true),
('operacao', 'logistics_roadmap', true, true),
('operacao', 'breakdown_type_distribution', false, true),
('operacao', 'status_distribution_dashboard', false, true),
('operacao', 'process_timeline', false, true),

-- Monitoramento: acesso de monitoramento
('monitoramento', 'status_filter_dashboard', true, true),
('monitoramento', 'status_distribution_dashboard', true, true),
('monitoramento', 'recent_activity', true, true),
('monitoramento', 'breakdown_type_distribution', false, true),
('monitoramento', 'logistics_roadmap', false, true),
('monitoramento', 'process_timeline', false, true)
ON CONFLICT (user_type, panel_key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE panel_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_panel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_panel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_permission_audit ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança (apenas admins podem gerenciar)
CREATE POLICY "Admin full access to panel_definitions"
  ON panel_definitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admin full access to group_panel_permissions"
  ON group_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admin full access to user_panel_permissions"
  ON user_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  );

-- Política para usuários lerem suas próprias permissões
CREATE POLICY "Users can read their own panel permissions"
  ON user_panel_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política para leitura de permissões de grupo
CREATE POLICY "Users can read group panel permissions"
  ON group_panel_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para leitura de definições de painéis
CREATE POLICY "Users can read panel definitions"
  ON panel_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin read access to audit"
  ON panel_permission_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.profile_type = 'admin' 
      AND user_profiles.is_active = true
    )
  );

-- Função para obter permissões efetivas de um usuário
CREATE OR REPLACE FUNCTION get_user_panel_permissions(target_user_id uuid)
RETURNS TABLE (
  panel_key text,
  panel_name text,
  panel_description text,
  panel_category text,
  is_allowed boolean,
  permission_source text,
  display_order integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_info AS (
    SELECT profile_type 
    FROM user_profiles 
    WHERE id = target_user_id
  ),
  effective_permissions AS (
    SELECT 
      pd.panel_key,
      pd.panel_name,
      pd.panel_description,
      pd.panel_category,
      pd.display_order,
      COALESCE(
        upp.is_allowed,  -- Permissão específica do usuário
        gpp.is_allowed,  -- Permissão do grupo
        false            -- Padrão: negado
      ) as is_allowed,
      CASE 
        WHEN upp.is_allowed IS NOT NULL THEN 'user_specific'
        WHEN gpp.is_allowed IS NOT NULL THEN 'group_default'
        ELSE 'system_default'
      END as permission_source
    FROM panel_definitions pd
    CROSS JOIN user_info ui
    LEFT JOIN group_panel_permissions gpp ON (
      gpp.panel_key = pd.panel_key 
      AND gpp.user_type = ui.profile_type
    )
    LEFT JOIN user_panel_permissions upp ON (
      upp.panel_key = pd.panel_key 
      AND upp.user_id = target_user_id
    )
    WHERE pd.is_active = true
  )
  SELECT 
    ep.panel_key,
    ep.panel_name,
    ep.panel_description,
    ep.panel_category,
    ep.is_allowed,
    ep.permission_source,
    ep.display_order
  FROM effective_permissions ep
  ORDER BY ep.display_order, ep.panel_name;
END;
$$;

-- Função para criar log de auditoria
CREATE OR REPLACE FUNCTION log_panel_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO panel_permission_audit (
    action_type,
    target_type,
    target_id,
    panel_key,
    old_value,
    new_value,
    changed_by
  ) VALUES (
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'grant'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'revoke'
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'user_panel_permissions' THEN 'user'
      WHEN TG_TABLE_NAME = 'group_panel_permissions' THEN 'group'
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'user_panel_permissions' THEN COALESCE(NEW.user_id::text, OLD.user_id::text)
      WHEN TG_TABLE_NAME = 'group_panel_permissions' THEN COALESCE(NEW.user_type, OLD.user_type)
    END,
    COALESCE(NEW.panel_key, OLD.panel_key),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para auditoria
CREATE TRIGGER audit_user_panel_permissions
  AFTER INSERT OR UPDATE OR DELETE ON user_panel_permissions
  FOR EACH ROW EXECUTE FUNCTION log_panel_permission_change();

CREATE TRIGGER audit_group_panel_permissions
  AFTER INSERT OR UPDATE OR DELETE ON group_panel_permissions
  FOR EACH ROW EXECUTE FUNCTION log_panel_permission_change();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_panel_definitions_active ON panel_definitions(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_group_panel_permissions_lookup ON group_panel_permissions(user_type, panel_key);
CREATE INDEX IF NOT EXISTS idx_user_panel_permissions_lookup ON user_panel_permissions(user_id, panel_key);
CREATE INDEX IF NOT EXISTS idx_panel_audit_target ON panel_permission_audit(target_type, target_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_panel_audit_panel ON panel_permission_audit(panel_key, changed_at DESC);