/*
  # Correção do Sistema de Permissões de Painéis

  1. Verificação e Criação de Painéis
    - Garante que todos os painéis estejam definidos
    - Cria painéis faltantes se necessário

  2. Permissões Padrão por Grupo
    - Define permissões padrão para cada tipo de usuário
    - Aplica configurações recomendadas

  3. Aplicação Automática de Permissões
    - Aplica permissões para usuários existentes
    - Corrige usuários sem permissões

  4. Verificação de Integridade
    - Valida configurações
    - Gera relatório de status
*/

-- Garantir que todos os painéis estão definidos
INSERT INTO panel_definitions (panel_key, panel_name, panel_description, panel_category, display_order, is_active) VALUES
('status_filter_dashboard', 'Dashboard de Status', 'Dashboard interativo com filtros por status', 'dashboard', 1, true),
('status_distribution_dashboard', 'Dashboard - Distribuição por Status', 'Visualização da distribuição de registros por status', 'dashboard', 2, true),
('breakdown_type_distribution', 'Distribuição por Tipo de Quebra', 'Análise dos tipos de quebra mais frequentes', 'analytics', 3, true),
('recent_activity', 'Atividade Recente', 'Últimas atividades e atualizações do sistema', 'monitoring', 4, true),
('logistics_roadmap', 'Roadmap de Processos Logísticos', 'Visualização do progresso dos processos', 'process', 5, true),
('process_timeline', 'Linha do Tempo do Processo', 'Timeline detalhada de cada processo', 'process', 6, true)
ON CONFLICT (panel_key) DO UPDATE SET
  panel_name = EXCLUDED.panel_name,
  panel_description = EXCLUDED.panel_description,
  panel_category = EXCLUDED.panel_category,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Definir permissões padrão por grupo (configuração recomendada)
INSERT INTO group_panel_permissions (user_type, panel_key, is_allowed, is_default) VALUES
-- Admin: Acesso total
('admin', 'status_filter_dashboard', true, true),
('admin', 'status_distribution_dashboard', true, true),
('admin', 'breakdown_type_distribution', true, true),
('admin', 'recent_activity', true, true),
('admin', 'logistics_roadmap', true, true),
('admin', 'process_timeline', true, true),

-- Torre: Acesso completo (dashboard e análises)
('torre', 'status_filter_dashboard', true, true),
('torre', 'status_distribution_dashboard', true, true),
('torre', 'breakdown_type_distribution', true, true),
('torre', 'recent_activity', true, true),
('torre', 'logistics_roadmap', true, true),
('torre', 'process_timeline', true, true),

-- Compras: Acesso básico (dashboards principais)
('compras', 'status_filter_dashboard', true, true),
('compras', 'status_distribution_dashboard', false, true),
('compras', 'breakdown_type_distribution', false, true),
('compras', 'recent_activity', true, true),
('compras', 'logistics_roadmap', false, true),
('compras', 'process_timeline', false, true),

-- Operação: Acesso operacional
('operacao', 'status_filter_dashboard', true, true),
('operacao', 'status_distribution_dashboard', false, true),
('operacao', 'breakdown_type_distribution', false, true),
('operacao', 'recent_activity', true, true),
('operacao', 'logistics_roadmap', true, true),
('operacao', 'process_timeline', false, true),

-- Monitoramento: Acesso de monitoramento
('monitoramento', 'status_filter_dashboard', true, true),
('monitoramento', 'status_distribution_dashboard', true, true),
('monitoramento', 'breakdown_type_distribution', false, true),
('monitoramento', 'recent_activity', true, true),
('monitoramento', 'logistics_roadmap', false, true),
('monitoramento', 'process_timeline', false, true)

ON CONFLICT (user_type, panel_key) DO UPDATE SET
  is_allowed = EXCLUDED.is_allowed,
  is_default = EXCLUDED.is_default,
  updated_at = now();

-- Função para aplicar permissões padrão para todos os usuários existentes
CREATE OR REPLACE FUNCTION apply_default_permissions_to_all_users()
RETURNS TABLE(user_id uuid, user_name text, user_type text, permissions_applied integer) AS $$
DECLARE
    user_record RECORD;
    permission_record RECORD;
    applied_count integer;
BEGIN
    -- Para cada usuário ativo
    FOR user_record IN 
        SELECT id, full_name, profile_type 
        FROM user_profiles 
        WHERE is_active = true
    LOOP
        applied_count := 0;
        
        -- Para cada permissão padrão do grupo do usuário
        FOR permission_record IN
            SELECT panel_key, is_allowed
            FROM group_panel_permissions
            WHERE user_type = user_record.profile_type
            AND is_default = true
        LOOP
            -- Inserir ou atualizar permissão do usuário
            INSERT INTO user_panel_permissions (user_id, panel_key, is_allowed, override_group, created_by)
            VALUES (user_record.id, permission_record.panel_key, permission_record.is_allowed, false, user_record.id)
            ON CONFLICT (user_id, panel_key) DO NOTHING; -- Não sobrescrever permissões específicas existentes
            
            applied_count := applied_count + 1;
        END LOOP;
        
        -- Retornar resultado para este usuário
        user_id := user_record.id;
        user_name := user_record.full_name;
        user_type := user_record.profile_type;
        permissions_applied := applied_count;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar aplicação de permissões padrão
SELECT * FROM apply_default_permissions_to_all_users();

-- Função para diagnosticar problemas de permissões
CREATE OR REPLACE FUNCTION diagnose_panel_permissions()
RETURNS TABLE(
    issue_type text,
    description text,
    affected_count integer,
    severity text,
    recommendation text
) AS $$
BEGIN
    -- Verificar usuários sem permissões
    SELECT 
        'users_without_permissions' as issue_type,
        'Usuários ativos sem nenhuma permissão de painel' as description,
        COUNT(*)::integer as affected_count,
        'HIGH' as severity,
        'Execute apply_default_permissions_to_all_users() ou configure manualmente' as recommendation
    FROM user_profiles up
    WHERE up.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_panel_permissions upp 
        WHERE upp.user_id = up.id
    )
    HAVING COUNT(*) > 0;
    
    IF FOUND THEN
        RETURN NEXT;
    END IF;

    -- Verificar painéis sem permissões de grupo
    SELECT 
        'panels_without_group_permissions' as issue_type,
        'Painéis ativos sem permissões de grupo definidas' as description,
        COUNT(*)::integer as affected_count,
        'MEDIUM' as severity,
        'Configure permissões de grupo no painel administrativo' as recommendation
    FROM panel_definitions pd
    WHERE pd.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM group_panel_permissions gpp 
        WHERE gpp.panel_key = pd.panel_key
    )
    HAVING COUNT(*) > 0;
    
    IF FOUND THEN
        RETURN NEXT;
    END IF;

    -- Verificar usuários com muitas permissões negadas
    SELECT 
        'users_with_mostly_denied_permissions' as issue_type,
        'Usuários com mais de 80% das permissões negadas' as description,
        COUNT(*)::integer as affected_count,
        'MEDIUM' as severity,
        'Revisar permissões de grupo ou específicas do usuário' as recommendation
    FROM (
        SELECT 
            upp.user_id,
            COUNT(*) as total_permissions,
            COUNT(*) FILTER (WHERE upp.is_allowed = false) as denied_permissions
        FROM user_panel_permissions upp
        GROUP BY upp.user_id
        HAVING COUNT(*) FILTER (WHERE upp.is_allowed = false) > (COUNT(*) * 0.8)
    ) subq
    HAVING COUNT(*) > 0;
    
    IF FOUND THEN
        RETURN NEXT;
    END IF;

    -- Se não há problemas
    IF NOT FOUND THEN
        SELECT 
            'no_issues' as issue_type,
            'Sistema de permissões funcionando corretamente' as description,
            0 as affected_count,
            'INFO' as severity,
            'Nenhuma ação necessária' as recommendation;
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Executar diagnóstico
SELECT * FROM diagnose_panel_permissions();

-- Criar view para facilitar consultas de permissões
CREATE OR REPLACE VIEW user_panel_permissions_summary AS
SELECT 
    up.id as user_id,
    up.full_name as user_name,
    up.email as user_email,
    up.profile_type as user_type,
    pd.panel_key,
    pd.panel_name,
    pd.panel_category,
    COALESCE(upp.is_allowed, gpp.is_allowed, false) as is_allowed,
    CASE 
        WHEN upp.id IS NOT NULL THEN 'user_specific'
        WHEN gpp.id IS NOT NULL THEN 'group_inherited'
        ELSE 'default_denied'
    END as permission_source,
    upp.override_group,
    pd.display_order
FROM user_profiles up
CROSS JOIN panel_definitions pd
LEFT JOIN user_panel_permissions upp ON up.id = upp.user_id AND pd.panel_key = upp.panel_key
LEFT JOIN group_panel_permissions gpp ON up.profile_type = gpp.user_type AND pd.panel_key = gpp.panel_key
WHERE up.is_active = true AND pd.is_active = true
ORDER BY up.full_name, pd.display_order;

-- Função para corrigir usuário específico
CREATE OR REPLACE FUNCTION fix_user_permissions(target_user_email text)
RETURNS TABLE(
    action text,
    panel_key text,
    panel_name text,
    permission_granted boolean,
    source text
) AS $$
DECLARE
    user_record RECORD;
    permission_record RECORD;
BEGIN
    -- Buscar usuário
    SELECT id, full_name, profile_type INTO user_record
    FROM user_profiles 
    WHERE email = target_user_email AND is_active = true;
    
    IF NOT FOUND THEN
        action := 'ERROR';
        panel_key := 'user_not_found';
        panel_name := 'Usuário não encontrado ou inativo';
        permission_granted := false;
        source := target_user_email;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Aplicar permissões padrão do grupo
    FOR permission_record IN
        SELECT gpp.panel_key, gpp.is_allowed, pd.panel_name
        FROM group_panel_permissions gpp
        JOIN panel_definitions pd ON gpp.panel_key = pd.panel_key
        WHERE gpp.user_type = user_record.profile_type
        AND gpp.is_default = true
        AND pd.is_active = true
    LOOP
        -- Inserir permissão se não existir
        INSERT INTO user_panel_permissions (user_id, panel_key, is_allowed, override_group, created_by)
        VALUES (user_record.id, permission_record.panel_key, permission_record.is_allowed, false, user_record.id)
        ON CONFLICT (user_id, panel_key) DO NOTHING;
        
        action := 'APPLIED';
        panel_key := permission_record.panel_key;
        panel_name := permission_record.panel_name;
        permission_granted := permission_record.is_allowed;
        source := 'group_default';
        RETURN NEXT;
    END LOOP;
    
    -- Se nenhuma permissão foi aplicada, dar pelo menos o dashboard básico
    IF NOT EXISTS (
        SELECT 1 FROM user_panel_permissions 
        WHERE user_id = user_record.id
    ) THEN
        INSERT INTO user_panel_permissions (user_id, panel_key, is_allowed, override_group, created_by)
        VALUES (user_record.id, 'status_filter_dashboard', true, false, user_record.id);
        
        action := 'FALLBACK';
        panel_key := 'status_filter_dashboard';
        panel_name := 'Dashboard de Status (Fallback)';
        permission_granted := true;
        source := 'emergency_fallback';
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Criar função para relatório de status do sistema
CREATE OR REPLACE FUNCTION panel_permissions_status_report()
RETURNS TABLE(
    metric text,
    value text,
    status text,
    details text
) AS $$
BEGIN
    -- Total de usuários ativos
    SELECT 
        'total_active_users' as metric,
        COUNT(*)::text as value,
        'INFO' as status,
        'Usuários ativos no sistema' as details
    FROM user_profiles WHERE is_active = true;
    RETURN NEXT;
    
    -- Total de painéis ativos
    SELECT 
        'total_active_panels' as metric,
        COUNT(*)::text as value,
        'INFO' as status,
        'Painéis disponíveis no sistema' as details
    FROM panel_definitions WHERE is_active = true;
    RETURN NEXT;
    
    -- Usuários com permissões
    SELECT 
        'users_with_permissions' as metric,
        COUNT(DISTINCT user_id)::text as value,
        CASE WHEN COUNT(DISTINCT user_id) > 0 THEN 'OK' ELSE 'ERROR' END as status,
        'Usuários que possuem pelo menos uma permissão' as details
    FROM user_panel_permissions;
    RETURN NEXT;
    
    -- Usuários sem permissões
    SELECT 
        'users_without_permissions' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END as status,
        'Usuários ativos sem nenhuma permissão (precisam correção)' as details
    FROM user_profiles up
    WHERE up.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_panel_permissions upp 
        WHERE upp.user_id = up.id
    );
    RETURN NEXT;
    
    -- Permissões de grupo configuradas
    SELECT 
        'group_permissions_configured' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status,
        'Permissões de grupo configuradas' as details
    FROM group_panel_permissions;
    RETURN NEXT;
    
    -- Painéis sem permissões de grupo
    SELECT 
        'panels_without_group_permissions' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END as status,
        'Painéis ativos sem permissões de grupo' as details
    FROM panel_definitions pd
    WHERE pd.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM group_panel_permissions gpp 
        WHERE gpp.panel_key = pd.panel_key
    );
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Executar relatório de status
SELECT * FROM panel_permissions_status_report();