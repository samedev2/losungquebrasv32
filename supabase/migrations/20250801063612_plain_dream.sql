/*
  # Fix Panel Permissions System - Syntax Correction

  This migration fixes the syntax error in the panel permissions system by correcting
  the trigger function that was using unsupported row expansion syntax.

  ## Changes Made
  1. Fixed log_panel_permission_change() function syntax
  2. Corrected JSON field access for audit logging
  3. Ensured proper type casting and null handling

  ## Error Fixed
  - ERROR: 0A000: row expansion via "*" is not supported here
  - Issue was in the trigger function trying to use (NEW).* -> 'field'
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS log_panel_permission_change() CASCADE;

-- Create corrected audit logging function
CREATE OR REPLACE FUNCTION log_panel_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    v_action_type text;
    v_target_type text;
    v_target_id text;
    v_panel_key text;
    v_old_value jsonb;
    v_new_value jsonb;
    v_changed_by uuid;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'grant';
    ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'revoke';
    END IF;

    -- Handle group_panel_permissions table
    IF TG_TABLE_NAME = 'group_panel_permissions' THEN
        v_target_type := 'group';
        v_target_id := COALESCE(NEW.user_type, OLD.user_type);
        v_panel_key := COALESCE(NEW.panel_key, OLD.panel_key);
        v_changed_by := COALESCE(NEW.created_by, OLD.created_by);
        
        IF TG_OP = 'UPDATE' THEN
            v_old_value := jsonb_build_object(
                'user_type', OLD.user_type,
                'panel_key', OLD.panel_key,
                'is_allowed', OLD.is_allowed,
                'is_default', OLD.is_default
            );
            v_new_value := jsonb_build_object(
                'user_type', NEW.user_type,
                'panel_key', NEW.panel_key,
                'is_allowed', NEW.is_allowed,
                'is_default', NEW.is_default
            );
        ELSIF TG_OP = 'INSERT' THEN
            v_new_value := jsonb_build_object(
                'user_type', NEW.user_type,
                'panel_key', NEW.panel_key,
                'is_allowed', NEW.is_allowed,
                'is_default', NEW.is_default
            );
        ELSIF TG_OP = 'DELETE' THEN
            v_old_value := jsonb_build_object(
                'user_type', OLD.user_type,
                'panel_key', OLD.panel_key,
                'is_allowed', OLD.is_allowed,
                'is_default', OLD.is_default
            );
        END IF;
    END IF;

    -- Handle user_panel_permissions table
    IF TG_TABLE_NAME = 'user_panel_permissions' THEN
        v_target_type := 'user';
        v_target_id := COALESCE(NEW.user_id, OLD.user_id)::text;
        v_panel_key := COALESCE(NEW.panel_key, OLD.panel_key);
        v_changed_by := COALESCE(NEW.created_by, OLD.created_by);
        
        IF TG_OP = 'UPDATE' THEN
            v_old_value := jsonb_build_object(
                'user_id', OLD.user_id,
                'panel_key', OLD.panel_key,
                'is_allowed', OLD.is_allowed,
                'override_group', OLD.override_group
            );
            v_new_value := jsonb_build_object(
                'user_id', NEW.user_id,
                'panel_key', NEW.panel_key,
                'is_allowed', NEW.is_allowed,
                'override_group', NEW.override_group
            );
        ELSIF TG_OP = 'INSERT' THEN
            v_new_value := jsonb_build_object(
                'user_id', NEW.user_id,
                'panel_key', NEW.panel_key,
                'is_allowed', NEW.is_allowed,
                'override_group', NEW.override_group
            );
        ELSIF TG_OP = 'DELETE' THEN
            v_old_value := jsonb_build_object(
                'user_id', OLD.user_id,
                'panel_key', OLD.panel_key,
                'is_allowed', OLD.is_allowed,
                'override_group', OLD.override_group
            );
        END IF;
    END IF;

    -- Insert audit record
    INSERT INTO panel_permission_audit (
        action_type,
        target_type,
        target_id,
        panel_key,
        old_value,
        new_value,
        changed_by,
        changed_at
    ) VALUES (
        v_action_type,
        v_target_type,
        v_target_id,
        v_panel_key,
        v_old_value,
        v_new_value,
        v_changed_by,
        now()
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers with the corrected function
DROP TRIGGER IF EXISTS audit_group_panel_permissions ON group_panel_permissions;
DROP TRIGGER IF EXISTS audit_user_panel_permissions ON user_panel_permissions;

CREATE TRIGGER audit_group_panel_permissions
    AFTER INSERT OR UPDATE OR DELETE ON group_panel_permissions
    FOR EACH ROW EXECUTE FUNCTION log_panel_permission_change();

CREATE TRIGGER audit_user_panel_permissions
    AFTER INSERT OR UPDATE OR DELETE ON user_panel_permissions
    FOR EACH ROW EXECUTE FUNCTION log_panel_permission_change();

-- Create diagnostic function to help troubleshoot permission issues
CREATE OR REPLACE FUNCTION diagnose_panel_permissions()
RETURNS TABLE(
    issue_type text,
    description text,
    affected_count bigint,
    severity text,
    recommendation text
) AS $$
BEGIN
    -- Check for users without any panel permissions
    RETURN QUERY
    SELECT 
        'missing_permissions'::text,
        'Users without any panel permissions'::text,
        COUNT(*)::bigint,
        'HIGH'::text,
        'Run apply_default_permissions_to_all_users() to fix'::text
    FROM user_profiles up
    LEFT JOIN user_panel_permissions upp ON up.id = upp.user_id
    WHERE up.is_active = true 
    AND upp.user_id IS NULL
    HAVING COUNT(*) > 0;

    -- Check for panels without any group permissions
    RETURN QUERY
    SELECT 
        'orphaned_panels'::text,
        'Panels without group permissions defined'::text,
        COUNT(*)::bigint,
        'MEDIUM'::text,
        'Define default group permissions for these panels'::text
    FROM panel_definitions pd
    LEFT JOIN group_panel_permissions gpp ON pd.panel_key = gpp.panel_key
    WHERE pd.is_active = true 
    AND gpp.panel_key IS NULL
    HAVING COUNT(*) > 0;

    -- Check for inactive users with permissions
    RETURN QUERY
    SELECT 
        'inactive_user_permissions'::text,
        'Inactive users with panel permissions'::text,
        COUNT(DISTINCT upp.user_id)::bigint,
        'LOW'::text,
        'Clean up permissions for inactive users'::text
    FROM user_panel_permissions upp
    JOIN user_profiles up ON upp.user_id = up.id
    WHERE up.is_active = false
    HAVING COUNT(DISTINCT upp.user_id) > 0;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system status report
CREATE OR REPLACE FUNCTION panel_permissions_status_report()
RETURNS TABLE(
    metric text,
    value text,
    status text,
    details text
) AS $$
BEGIN
    -- Total active users
    RETURN QUERY
    SELECT 
        'active_users'::text,
        COUNT(*)::text,
        'INFO'::text,
        'Total active users in the system'::text
    FROM user_profiles 
    WHERE is_active = true;

    -- Total panels
    RETURN QUERY
    SELECT 
        'active_panels'::text,
        COUNT(*)::text,
        'INFO'::text,
        'Total active panels available'::text
    FROM panel_definitions 
    WHERE is_active = true;

    -- Users with permissions
    RETURN QUERY
    SELECT 
        'users_with_permissions'::text,
        COUNT(DISTINCT user_id)::text,
        CASE 
            WHEN COUNT(DISTINCT user_id) = (SELECT COUNT(*) FROM user_profiles WHERE is_active = true) 
            THEN 'OK'::text
            ELSE 'WARNING'::text
        END,
        'Users who have at least one panel permission'::text
    FROM user_panel_permissions upp
    JOIN user_profiles up ON upp.user_id = up.id
    WHERE up.is_active = true;

    -- Group permissions coverage
    RETURN QUERY
    SELECT 
        'group_permissions_coverage'::text,
        ROUND(
            (COUNT(DISTINCT gpp.panel_key)::numeric / 
             NULLIF((SELECT COUNT(*) FROM panel_definitions WHERE is_active = true), 0)) * 100, 1
        )::text || '%',
        CASE 
            WHEN COUNT(DISTINCT gpp.panel_key) = (SELECT COUNT(*) FROM panel_definitions WHERE is_active = true)
            THEN 'OK'::text
            ELSE 'WARNING'::text
        END,
        'Percentage of panels with group permissions defined'::text
    FROM group_panel_permissions gpp;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to apply default permissions to all users
CREATE OR REPLACE FUNCTION apply_default_permissions_to_all_users()
RETURNS TABLE(
    user_id uuid,
    user_name text,
    user_type text,
    permissions_applied integer
) AS $$
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
        
        -- Apply default permissions based on user type
        FOR panel_record IN 
            SELECT pd.panel_key, 
                   COALESCE(gpp.is_allowed, false) as should_allow
            FROM panel_definitions pd
            LEFT JOIN group_panel_permissions gpp 
                ON pd.panel_key = gpp.panel_key 
                AND gpp.user_type = user_record.profile_type
            WHERE pd.is_active = true
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
                panel_record.should_allow,
                false,
                user_record.id
            )
            ON CONFLICT (user_id, panel_key) 
            DO UPDATE SET
                is_allowed = panel_record.should_allow,
                override_group = false,
                updated_at = now();
                
            permissions_count := permissions_count + 1;
        END LOOP;
        
        -- Return result for this user
        user_id := user_record.id;
        user_name := user_record.full_name;
        user_type := user_record.profile_type;
        permissions_applied := permissions_count;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to fix specific user permissions
CREATE OR REPLACE FUNCTION fix_user_permissions(target_user_email text)
RETURNS TABLE(
    action text,
    panel_key text,
    panel_name text,
    permission_granted boolean,
    source text
) AS $$
DECLARE
    target_user_id uuid;
    target_user_type text;
    panel_record RECORD;
BEGIN
    -- Find user by email
    SELECT id, profile_type INTO target_user_id, target_user_type
    FROM user_profiles 
    WHERE email = target_user_email AND is_active = true;
    
    IF target_user_id IS NULL THEN
        action := 'ERROR';
        panel_key := '';
        panel_name := 'User not found or inactive: ' || target_user_email;
        permission_granted := false;
        source := 'error';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Apply permissions for each panel
    FOR panel_record IN 
        SELECT pd.panel_key, pd.panel_name,
               COALESCE(gpp.is_allowed, false) as default_permission
        FROM panel_definitions pd
        LEFT JOIN group_panel_permissions gpp 
            ON pd.panel_key = gpp.panel_key 
            AND gpp.user_type = target_user_type
        WHERE pd.is_active = true
        ORDER BY pd.display_order
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
            panel_record.default_permission,
            false,
            target_user_id
        )
        ON CONFLICT (user_id, panel_key) 
        DO UPDATE SET
            is_allowed = panel_record.default_permission,
            override_group = false,
            updated_at = now();
        
        -- Return result
        action := 'APPLIED';
        panel_key := panel_record.panel_key;
        panel_name := panel_record.panel_name;
        permission_granted := panel_record.default_permission;
        source := CASE 
            WHEN panel_record.default_permission THEN 'group_default' 
            ELSE 'denied_by_default' 
        END;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION diagnose_panel_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION panel_permissions_status_report() TO authenticated;
GRANT EXECUTE ON FUNCTION apply_default_permissions_to_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_permissions(text) TO authenticated;

-- Ensure RLS policies are properly set
ALTER TABLE panel_permission_audit ENABLE ROW LEVEL SECURITY;

-- Update RLS policy for audit table to allow admins to read
DROP POLICY IF EXISTS "Admin read access to audit" ON panel_permission_audit;
CREATE POLICY "Admin read access to audit" ON panel_permission_audit
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND profile_type = 'admin' 
            AND is_active = true
        )
    );

-- Create policy for inserting audit records (system use)
DROP POLICY IF EXISTS "System insert audit records" ON panel_permission_audit;
CREATE POLICY "System insert audit records" ON panel_permission_audit
    FOR INSERT TO authenticated
    WITH CHECK (true);