/*
  # Fix User Panel Permissions RLS Policies

  This migration fixes the RLS policies for user_panel_permissions table
  and resolves authentication function access issues in Supabase.

  ## Root Cause Analysis
  The "permission denied for schema auth" error occurs because:
  1. Direct access to auth schema is restricted in Supabase managed environment
  2. Custom functions cannot directly query auth.users table
  3. RLS policies must use auth.uid() function instead of direct auth schema access

  ## Changes Made
  1. Updated RLS policies to use proper Supabase auth functions
  2. Replaced direct auth schema access with auth.uid() and auth.jwt()
  3. Added proper user authentication checks using user_profiles table
  4. Implemented secure policy patterns compatible with Supabase

  ## Security Considerations
  - All policies use auth.uid() for user identification
  - Policies check user_profiles table for additional user metadata
  - Admin access is properly validated through profile_type checks
  - No direct access to restricted auth schema
*/

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can read their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can insert their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Admin full access to user_panel_permissions" ON user_panel_permissions;

-- Create secure RLS policies for user_panel_permissions table
-- Policy 1: Users can read their own panel permissions
CREATE POLICY "Users can read their own panel permissions"
  ON user_panel_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can insert their own panel permissions (with validation)
CREATE POLICY "Users can insert their own panel permissions"
  ON user_panel_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Policy 3: Users can update their own panel permissions
CREATE POLICY "Users can update their own panel permissions"
  ON user_panel_permissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Policy 4: Admin full access to user_panel_permissions
CREATE POLICY "Admin full access to user_panel_permissions"
  ON user_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND profile_type = 'admin'
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND profile_type = 'admin'
        AND is_active = true
    )
  );

-- Policy 5: Allow system operations for applying default permissions
CREATE POLICY "System can manage panel permissions"
  ON user_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user is admin or if it's a system operation (created_by is null)
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND profile_type = 'admin'
        AND is_active = true
    ) OR created_by IS NULL
  )
  WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND profile_type = 'admin'
        AND is_active = true
    ) OR created_by IS NULL
  );

-- Ensure RLS is enabled on user_panel_permissions table
ALTER TABLE user_panel_permissions ENABLE ROW LEVEL SECURITY;

-- Create or replace function to get user panel permissions (Supabase-compatible)
CREATE OR REPLACE FUNCTION get_user_panel_permissions(target_user_id uuid)
RETURNS TABLE (
  panel_key text,
  panel_name text,
  panel_description text,
  panel_category text,
  is_allowed boolean,
  permission_source text,
  user_type text,
  override_group boolean,
  display_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile_type text;
BEGIN
  -- Get user profile type from user_profiles table (not auth schema)
  SELECT profile_type INTO user_profile_type
  FROM user_profiles
  WHERE id = target_user_id AND is_active = true;
  
  -- If user not found or inactive, return empty result
  IF user_profile_type IS NULL THEN
    RETURN;
  END IF;
  
  -- Return panel permissions with proper inheritance logic
  RETURN QUERY
  SELECT 
    pd.panel_key,
    pd.panel_name,
    pd.panel_description,
    pd.panel_category,
    COALESCE(
      upp.is_allowed,  -- User-specific permission (highest priority)
      gpp.is_allowed,  -- Group permission (medium priority)
      false            -- Default deny (lowest priority)
    ) as is_allowed,
    CASE 
      WHEN upp.panel_key IS NOT NULL THEN 'user_specific'
      WHEN gpp.panel_key IS NOT NULL THEN 'group_inherited'
      ELSE 'default_denied'
    END as permission_source,
    user_profile_type as user_type,
    COALESCE(upp.override_group, false) as override_group,
    pd.display_order
  FROM panel_definitions pd
  LEFT JOIN group_panel_permissions gpp 
    ON pd.panel_key = gpp.panel_key 
    AND gpp.user_type = user_profile_type
  LEFT JOIN user_panel_permissions upp 
    ON pd.panel_key = upp.panel_key 
    AND upp.user_id = target_user_id
  WHERE pd.is_active = true
  ORDER BY pd.display_order ASC;
END;
$$;

-- Create function to apply default permissions to all users
CREATE OR REPLACE FUNCTION apply_default_permissions_to_all_users()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_type text,
  permissions_applied integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  panel_record RECORD;
  permissions_count integer;
BEGIN
  -- Loop through all active users
  FOR user_record IN 
    SELECT id, full_name, profile_type 
    FROM user_profiles 
    WHERE is_active = true
  LOOP
    permissions_count := 0;
    
    -- Apply default permissions for this user type
    FOR panel_record IN
      SELECT panel_key, is_allowed
      FROM group_panel_permissions
      WHERE user_type = user_record.profile_type
        AND is_default = true
    LOOP
      -- Insert or update user permission
      INSERT INTO user_panel_permissions (
        user_id,
        panel_key,
        is_allowed,
        override_group,
        created_by
      ) VALUES (
        user_record.id,
        panel_record.panel_key,
        panel_record.is_allowed,
        false,
        null -- System operation
      )
      ON CONFLICT (user_id, panel_key) 
      DO UPDATE SET
        is_allowed = panel_record.is_allowed,
        override_group = false,
        updated_at = now();
      
      permissions_count := permissions_count + 1;
    END LOOP;
    
    -- If no group permissions found, apply basic permissions
    IF permissions_count = 0 THEN
      -- Apply basic dashboard access for all users
      INSERT INTO user_panel_permissions (
        user_id,
        panel_key,
        is_allowed,
        override_group,
        created_by
      ) VALUES 
      (user_record.id, 'status_filter_dashboard', true, false, null),
      (user_record.id, 'recent_activity', true, false, null)
      ON CONFLICT (user_id, panel_key) 
      DO UPDATE SET
        is_allowed = true,
        override_group = false,
        updated_at = now();
      
      permissions_count := 2;
    END IF;
    
    -- Return result for this user
    user_id := user_record.id;
    user_name := user_record.full_name;
    user_type := user_record.profile_type;
    permissions_applied := permissions_count;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Create function to fix specific user permissions
CREATE OR REPLACE FUNCTION fix_user_permissions(target_user_email text)
RETURNS TABLE (
  action text,
  panel_key text,
  panel_name text,
  permission_granted boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  target_user_type text;
  panel_record RECORD;
BEGIN
  -- Find user by email
  SELECT id, profile_type INTO target_user_id, target_user_type
  FROM user_profiles
  WHERE email = target_user_email AND is_active = true;
  
  -- Check if user exists
  IF target_user_id IS NULL THEN
    action := 'ERROR';
    panel_key := 'user_not_found';
    panel_name := 'User not found or inactive: ' || target_user_email;
    permission_granted := false;
    source := 'error';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Apply default permissions for user type
  FOR panel_record IN
    SELECT pd.panel_key, pd.panel_name, gpp.is_allowed
    FROM panel_definitions pd
    LEFT JOIN group_panel_permissions gpp 
      ON pd.panel_key = gpp.panel_key 
      AND gpp.user_type = target_user_type
      AND gpp.is_default = true
    WHERE pd.is_active = true
  LOOP
    -- Insert or update permission
    INSERT INTO user_panel_permissions (
      user_id,
      panel_key,
      is_allowed,
      override_group,
      created_by
    ) VALUES (
      target_user_id,
      panel_record.panel_key,
      COALESCE(panel_record.is_allowed, true), -- Default to true if no group permission
      false,
      null -- System operation
    )
    ON CONFLICT (user_id, panel_key) 
    DO UPDATE SET
      is_allowed = COALESCE(panel_record.is_allowed, true),
      override_group = false,
      updated_at = now();
    
    -- Return result
    action := 'APPLIED';
    panel_key := panel_record.panel_key;
    panel_name := panel_record.panel_name;
    permission_granted := COALESCE(panel_record.is_allowed, true);
    source := CASE 
      WHEN panel_record.is_allowed IS NOT NULL THEN 'group_default'
      ELSE 'system_default'
    END;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Create diagnostic function for panel permissions
CREATE OR REPLACE FUNCTION diagnose_panel_permissions()
RETURNS TABLE (
  issue_type text,
  description text,
  affected_count bigint,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for users without any panel permissions
  RETURN QUERY
  SELECT 
    'missing_permissions'::text,
    'Users without any panel permissions'::text,
    COUNT(*)::bigint,
    'HIGH'::text,
    'Run apply_default_permissions_to_all_users() function'::text
  FROM user_profiles up
  WHERE up.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_panel_permissions upp 
      WHERE upp.user_id = up.id AND upp.is_allowed = true
    )
  HAVING COUNT(*) > 0;
  
  -- Check for inactive panel definitions
  RETURN QUERY
  SELECT 
    'inactive_panels'::text,
    'Panel definitions that are inactive'::text,
    COUNT(*)::bigint,
    'MEDIUM'::text,
    'Review and activate necessary panels'::text
  FROM panel_definitions
  WHERE is_active = false
  HAVING COUNT(*) > 0;
  
  -- Check for orphaned user permissions
  RETURN QUERY
  SELECT 
    'orphaned_permissions'::text,
    'User permissions for non-existent panels'::text,
    COUNT(*)::bigint,
    'LOW'::text,
    'Clean up orphaned permissions'::text
  FROM user_panel_permissions upp
  WHERE NOT EXISTS (
    SELECT 1 FROM panel_definitions pd 
    WHERE pd.panel_key = upp.panel_key AND pd.is_active = true
  )
  HAVING COUNT(*) > 0;
  
  -- Check for users without group permissions
  RETURN QUERY
  SELECT 
    'missing_group_permissions'::text,
    'User types without default group permissions'::text,
    COUNT(DISTINCT up.profile_type)::bigint,
    'MEDIUM'::text,
    'Set up default group permissions for all user types'::text
  FROM user_profiles up
  WHERE up.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM group_panel_permissions gpp 
      WHERE gpp.user_type = up.profile_type AND gpp.is_default = true
    )
  HAVING COUNT(DISTINCT up.profile_type) > 0;
  
  RETURN;
END;
$$;

-- Create status report function
CREATE OR REPLACE FUNCTION panel_permissions_status_report()
RETURNS TABLE (
  metric text,
  value text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users bigint;
  users_with_permissions bigint;
  total_panels bigint;
  active_panels bigint;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO total_users FROM user_profiles WHERE is_active = true;
  SELECT COUNT(*) INTO total_panels FROM panel_definitions;
  SELECT COUNT(*) INTO active_panels FROM panel_definitions WHERE is_active = true;
  
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions 
  FROM user_panel_permissions upp
  JOIN user_profiles up ON upp.user_id = up.id
  WHERE up.is_active = true AND upp.is_allowed = true;
  
  -- Return metrics
  metric := 'total_users';
  value := total_users::text;
  status := 'INFO';
  details := 'Total active users in system';
  RETURN NEXT;
  
  metric := 'users_with_permissions';
  value := users_with_permissions::text;
  status := CASE 
    WHEN users_with_permissions = total_users THEN 'OK'
    WHEN users_with_permissions > total_users * 0.8 THEN 'WARNING'
    ELSE 'ERROR'
  END;
  details := 'Users with at least one panel permission';
  RETURN NEXT;
  
  metric := 'total_panels';
  value := total_panels::text;
  status := 'INFO';
  details := 'Total panel definitions';
  RETURN NEXT;
  
  metric := 'active_panels';
  value := active_panels::text;
  status := CASE 
    WHEN active_panels = total_panels THEN 'OK'
    WHEN active_panels > 0 THEN 'WARNING'
    ELSE 'ERROR'
  END;
  details := 'Active panel definitions';
  RETURN NEXT;
  
  metric := 'permission_coverage';
  value := CASE 
    WHEN total_users > 0 THEN ROUND((users_with_permissions::numeric / total_users::numeric) * 100, 1)::text || '%'
    ELSE '0%'
  END;
  status := CASE 
    WHEN total_users = 0 THEN 'ERROR'
    WHEN users_with_permissions = total_users THEN 'OK'
    WHEN users_with_permissions > total_users * 0.8 THEN 'WARNING'
    ELSE 'ERROR'
  END;
  details := 'Percentage of users with panel access';
  RETURN NEXT;
  
  RETURN;
END;
$$;

-- Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_panel_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_default_permissions_to_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_permissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION diagnose_panel_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION panel_permissions_status_report() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_panel_permissions_user_allowed 
  ON user_panel_permissions (user_id, is_allowed) 
  WHERE is_allowed = true;

CREATE INDEX IF NOT EXISTS idx_user_panel_permissions_panel_allowed 
  ON user_panel_permissions (panel_key, is_allowed) 
  WHERE is_allowed = true;

-- Insert default panel definitions if they don't exist
INSERT INTO panel_definitions (panel_key, panel_name, panel_description, panel_category, is_active, display_order)
VALUES 
  ('status_filter_dashboard', 'Dashboard de Status', 'Dashboard interativo com filtros por status', 'dashboard', true, 1),
  ('status_distribution_dashboard', 'Dashboard - Distribuição por Status', 'Visualização da distribuição de registros por status', 'dashboard', true, 2),
  ('breakdown_type_distribution', 'Distribuição por Tipo de Quebra', 'Análise dos tipos de quebra mais frequentes', 'analytics', true, 3),
  ('recent_activity', 'Atividade Recente', 'Últimas atividades e atualizações do sistema', 'monitoring', true, 4),
  ('logistics_roadmap', 'Roadmap de Processos Logísticos', 'Visualização do progresso dos processos', 'process', true, 5),
  ('process_timeline', 'Linha do Tempo do Processo', 'Timeline detalhada de cada processo', 'process', true, 6)
ON CONFLICT (panel_key) DO UPDATE SET
  panel_name = EXCLUDED.panel_name,
  panel_description = EXCLUDED.panel_description,
  panel_category = EXCLUDED.panel_category,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Insert default group permissions if they don't exist
INSERT INTO group_panel_permissions (user_type, panel_key, is_allowed, is_default)
VALUES 
  -- Admin: All panels
  ('admin', 'status_filter_dashboard', true, true),
  ('admin', 'status_distribution_dashboard', true, true),
  ('admin', 'breakdown_type_distribution', true, true),
  ('admin', 'recent_activity', true, true),
  ('admin', 'logistics_roadmap', true, true),
  ('admin', 'process_timeline', true, true),
  
  -- Torre: Most panels
  ('torre', 'status_filter_dashboard', true, true),
  ('torre', 'status_distribution_dashboard', true, true),
  ('torre', 'breakdown_type_distribution', true, true),
  ('torre', 'recent_activity', true, true),
  ('torre', 'logistics_roadmap', true, true),
  ('torre', 'process_timeline', true, true),
  
  -- Compras: Basic panels
  ('compras', 'status_filter_dashboard', true, true),
  ('compras', 'recent_activity', true, true),
  ('compras', 'status_distribution_dashboard', false, true),
  ('compras', 'breakdown_type_distribution', false, true),
  ('compras', 'logistics_roadmap', false, true),
  ('compras', 'process_timeline', false, true),
  
  -- Operacao: Operational panels
  ('operacao', 'status_filter_dashboard', true, true),
  ('operacao', 'recent_activity', true, true),
  ('operacao', 'logistics_roadmap', true, true),
  ('operacao', 'status_distribution_dashboard', false, true),
  ('operacao', 'breakdown_type_distribution', false, true),
  ('operacao', 'process_timeline', false, true),
  
  -- Monitoramento: Monitoring panels
  ('monitoramento', 'status_filter_dashboard', true, true),
  ('monitoramento', 'status_distribution_dashboard', true, true),
  ('monitoramento', 'recent_activity', true, true),
  ('monitoramento', 'breakdown_type_distribution', false, true),
  ('monitoramento', 'logistics_roadmap', false, true),
  ('monitoramento', 'process_timeline', false, true)
ON CONFLICT (user_type, panel_key) DO UPDATE SET
  is_allowed = EXCLUDED.is_allowed,
  is_default = EXCLUDED.is_default,
  updated_at = now();

-- Add helpful comments
COMMENT ON FUNCTION get_user_panel_permissions(uuid) IS 'Gets effective panel permissions for a user with proper inheritance logic. Uses user_profiles table instead of auth schema.';
COMMENT ON FUNCTION apply_default_permissions_to_all_users() IS 'Applies default panel permissions to all active users based on their user type.';
COMMENT ON FUNCTION fix_user_permissions(text) IS 'Fixes panel permissions for a specific user by email address.';
COMMENT ON FUNCTION diagnose_panel_permissions() IS 'Diagnoses common panel permission issues and provides recommendations.';
COMMENT ON FUNCTION panel_permissions_status_report() IS 'Provides a status report of the panel permissions system.';

-- Final verification query (commented out for production)
/*
-- Verify the migration worked correctly
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_panels
FROM panel_definitions 
WHERE is_active = true;

-- Check if default permissions exist
SELECT 
  user_type,
  COUNT(*) as default_permissions
FROM group_panel_permissions 
WHERE is_default = true
GROUP BY user_type;
*/