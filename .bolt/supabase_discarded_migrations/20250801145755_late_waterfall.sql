/*
  # Rollback Failed Migration - Emergency Recovery

  This migration provides a safe rollback for the failed user_panel_permissions
  RLS migration and restores the system to a working state.

  Use this ONLY if the main fix migration fails and you need to restore service.
*/

-- Drop any problematic policies that might have been partially created
DROP POLICY IF EXISTS "Users can read their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can insert their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can update their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Admin full access to user_panel_permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "System can manage panel permissions" ON user_panel_permissions;

-- Drop any problematic functions
DROP FUNCTION IF EXISTS get_user_panel_permissions(uuid);
DROP FUNCTION IF EXISTS apply_default_permissions_to_all_users();
DROP FUNCTION IF EXISTS fix_user_permissions(text);
DROP FUNCTION IF EXISTS diagnose_panel_permissions();
DROP FUNCTION IF EXISTS panel_permissions_status_report();

-- Temporarily disable RLS to restore access
ALTER TABLE user_panel_permissions DISABLE ROW LEVEL SECURITY;

-- Create minimal working policies
CREATE POLICY "Allow all operations for authenticated users" 
  ON user_panel_permissions 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE user_panel_permissions ENABLE ROW LEVEL SECURITY;

-- Create basic function to get user permissions (simplified)
CREATE OR REPLACE FUNCTION get_user_panel_permissions_basic(target_user_id uuid)
RETURNS TABLE (
  panel_key text,
  panel_name text,
  is_allowed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.panel_key,
    pd.panel_name,
    true as is_allowed  -- Grant access to all panels temporarily
  FROM panel_definitions pd
  WHERE pd.is_active = true
  ORDER BY pd.display_order;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_panel_permissions_basic(uuid) TO authenticated;

-- Log the rollback
INSERT INTO panel_permission_audit (
  action_type,
  target_type,
  target_id,
  new_value,
  changed_at
) VALUES (
  'emergency_rollback',
  'system',
  'migration_rollback',
  jsonb_build_object(
    'reason', 'Failed RLS migration rollback',
    'timestamp', now(),
    'action', 'Temporary open access granted'
  ),
  now()
);

-- Add comment for tracking
COMMENT ON POLICY "Allow all operations for authenticated users" ON user_panel_permissions 
IS 'TEMPORARY POLICY - Emergency rollback from failed RLS migration. Replace with proper policies ASAP.';