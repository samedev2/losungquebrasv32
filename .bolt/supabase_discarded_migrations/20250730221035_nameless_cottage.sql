/*
  # Sistema de Controle de Visibilidade de Painéis

  1. Tabelas Principais
    - `panel_definitions`: Define os painéis disponíveis no sistema
    - `group_panel_permissions`: Permissões padrão por tipo de usuário
    - `user_panel_permissions`: Permissões específicas por usuário
    - `panel_permission_audit`: Log de auditoria de alterações

  2. Funcionalidades
    - Herança de permissões: Usuário → Grupo → Sistema
    - Cache inteligente para performance
    - Auditoria completa de alterações
    - Interface administrativa para gerenciamento

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Apenas admins podem modificar permissões
    - Log completo de alterações
*/

-- Criar tabela de definições de painéis
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

-- Criar tabela de permissões de grupo
CREATE TABLE IF NOT EXISTS group_panel_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text NOT NULL,
  panel_key text NOT NULL,
  is_allowed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_type, panel_key)
);

-- Criar tabela de permissões de usuário
CREATE TABLE IF NOT EXISTS user_panel_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  panel_key text NOT NULL,
  is_allowed boolean DEFAULT false,
  override_group boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, panel_key)
);

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS panel_permission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  panel_key text,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid REFERENCES user_profiles(id),
  changed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Habilitar RLS
ALTER TABLE panel_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_panel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_panel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_permission_audit ENABLE ROW LEVEL SECURITY;

-- Políticas para panel_definitions
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

CREATE POLICY "Users can read panel definitions"
  ON panel_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Políticas para group_panel_permissions
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

CREATE POLICY "Users can read group panel permissions"
  ON group_panel_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para user_panel_permissions
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

CREATE POLICY "Users can read their own panel permissions"
  ON user_panel_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas para panel_permission_audit
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

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_panel_definitions_active ON panel_definitions (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_group_panel_permissions_lookup ON group_panel_permissions (user_type, panel_key);
CREATE INDEX IF NOT EXISTS idx_user_panel_permissions_lookup ON user_panel_permissions (user_id, panel_key);
CREATE INDEX IF NOT EXISTS idx_panel_audit_target ON panel_permission_audit (target_type, target_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_panel_audit_panel ON panel_permission_audit (panel_key, changed_at DESC);

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
) AS $$
BEGIN
  RETURN QUERY
  WITH user_info AS (
    SELECT profile_type
    FROM user_profiles
    WHERE id = target_user_id
    AND is_active = true
  ),
  panel_list AS (
    SELECT 
      pd.panel_key,
      pd.panel_name,
      pd.panel_description,
      pd.panel_category,
      pd.display_order
    FROM panel_definitions pd
    WHERE pd.is_active = true
  ),
  user_specific AS (
    SELECT 
      upp.panel_key,
      upp.is_allowed,
      'user_specific' as source
    FROM user_panel_permissions upp
    WHERE upp.user_id = target_user_id
    AND upp.override_group = true
  ),
  group_defaults AS (
    SELECT 
      gpp.panel_key,
      gpp.is_allowed,
      'group_default' as source
    FROM group_panel_permissions gpp
    CROSS JOIN user_info ui
    WHERE gpp.user_type = ui.profile_type
    AND gpp.is_default = true
  )
  SELECT 
    pl.panel_key,
    pl.panel_name,
    pl.panel_description,
    pl.panel_category,
    COALESCE(us.is_allowed, gd.is_allowed, false) as is_allowed,
    COALESCE(us.source, gd.source, 'system_default') as permission_source,
    pl.display_order
  FROM panel_list pl
  LEFT JOIN user_specific us ON pl.panel_key = us.panel_key
  LEFT JOIN group_defaults gd ON pl.panel_key = gd.panel_key
  ORDER BY pl.display_order, pl.panel_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para log de auditoria
CREATE OR REPLACE FUNCTION log_panel_permission_change()
RETURNS TRIGGER AS $$
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
      WHEN TG_TABLE_NAME = 'group_panel_permissions' THEN 'group'
      WHEN TG_TABLE_NAME = 'user_panel_permissions' THEN 'user'
      ELSE 'unknown'
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'group_panel_permissions' THEN COALESCE(NEW.user_type, OLD.user_type)
      WHEN TG_TABLE_NAME = 'user_panel_permissions' THEN COALESCE(NEW.user_id::text, OLD.user_id::text)
      ELSE 'unknown'
    END,
    COALESCE(NEW.panel_key, OLD.panel_key),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers de auditoria
DROP TRIGGER IF EXISTS audit_group_panel_permissions ON group_panel_permissions;
CREATE TRIGGER audit_group_panel_permissions
  AFTER INSERT OR UPDATE OR DELETE ON group_panel_permissions
  FOR EACH ROW EXECUTE FUNCTION log_panel_permission_change();

DROP TRIGGER IF EXISTS audit_user_panel_permissions ON user_panel_permissions;
CREATE TRIGGER audit_user_panel_permissions
  AFTER INSERT OR UPDATE OR DELETE ON user_panel_permissions
  FOR EACH ROW EXECUTE FUNCTION log_panel_permission_change();

-- Inserir definições de painéis padrão
INSERT INTO panel_definitions (panel_key, panel_name, panel_description, panel_category, display_order) VALUES
('status_filter_dashboard', 'Dashboard de Status', 'Dashboard interativo com filtros por status', 'dashboard', 1),
('status_distribution_dashboard', 'Dashboard - Distribuição por Status', 'Visualização da distribuição de registros', 'dashboard', 2),
('breakdown_type_distribution', 'Distribuição por Tipo de Quebra', 'Análise dos tipos de quebra mais frequentes', 'analytics', 3),
('recent_activity', 'Atividade Recente', 'Últimas atividades e atualizações do sistema', 'monitoring', 4),
('logistics_roadmap', 'Roadmap de Processos Logísticos', 'Visualização do progresso dos processos', 'process', 5),
('process_timeline', 'Linha do Tempo do Processo', 'Timeline detalhada de cada processo', 'process', 6)
ON CONFLICT (panel_key) DO NOTHING;

-- Inserir permissões padrão por grupo
INSERT INTO group_panel_permissions (user_type, panel_key, is_allowed, is_default) VALUES
-- Admin: acesso total
('admin', 'status_filter_dashboard', true, true),
('admin', 'status_distribution_dashboard', true, true),
('admin', 'breakdown_type_distribution', true, true),
('admin', 'recent_activity', true, true),
('admin', 'logistics_roadmap', true, true),
('admin', 'process_timeline', true, true),

-- Torre: acesso completo
('torre', 'status_filter_dashboard', true, true),
('torre', 'status_distribution_dashboard', true, true),
('torre', 'breakdown_type_distribution', true, true),
('torre', 'recent_activity', true, true),
('torre', 'logistics_roadmap', true, true),
('torre', 'process_timeline', false, true),

-- Compras: acesso limitado
('compras', 'status_filter_dashboard', true, true),
('compras', 'status_distribution_dashboard', false, true),
('compras', 'breakdown_type_distribution', false, true),
('compras', 'recent_activity', true, true),
('compras', 'logistics_roadmap', false, true),
('compras', 'process_timeline', false, true),

-- Operação: acesso operacional
('operacao', 'status_filter_dashboard', true, true),
('operacao', 'status_distribution_dashboard', false, true),
('operacao', 'breakdown_type_distribution', false, true),
('operacao', 'recent_activity', true, true),
('operacao', 'logistics_roadmap', true, true),
('operacao', 'process_timeline', false, true),

-- Monitoramento: acesso de monitoramento
('monitoramento', 'status_filter_dashboard', true, true),
('monitoramento', 'status_distribution_dashboard', true, true),
('monitoramento', 'breakdown_type_distribution', false, true),
('monitoramento', 'recent_activity', true, true),
('monitoramento', 'logistics_roadmap', false, true),
('monitoramento', 'process_timeline', false, true)
ON CONFLICT (user_type, panel_key) DO NOTHING;