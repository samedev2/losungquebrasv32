/*
  # Fix Authentication Functions and RLS Policies

  This migration ensures that Supabase authentication functions are available
  and creates proper RLS policies for the user_panel_permissions table.

  ## Changes Made
  1. Enable auth schema and functions
  2. Create auth.uid() function if it doesn't exist
  3. Update RLS policies for user_panel_permissions table
  4. Ensure proper security while allowing system operations

  ## Security
  - Maintains strict access control
  - Allows system operations for permission management
  - Preserves audit trail functionality
*/

-- Enable the auth schema and extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create a simple uid() function that returns the current user's ID
-- This is a fallback if Supabase's built-in auth.uid() is not available
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.sub', true),
    current_setting('app.current_user_id', true)
  )::uuid;
$$;

-- Alternative: Create uid() function in public schema as fallback
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.uid(),
    current_setting('app.current_user_id', true)::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admin full access to user_panel_permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can insert their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can read their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "System can manage user permissions" ON user_panel_permissions;

-- Create new RLS policies that work with the available functions
CREATE POLICY "Admin full access to user_panel_permissions"
  ON user_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Allow users to read their own panel permissions
CREATE POLICY "Users can read their own panel permissions"
  ON user_panel_permissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = COALESCE(auth.uid(), public.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Allow system operations for permission management
CREATE POLICY "System can manage user permissions"
  ON user_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    -- Allow if current user is admin
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
    -- Or if it's the user's own permissions
    OR user_id = COALESCE(auth.uid(), public.uid())
    -- Or if created_by is null (system operation)
    OR created_by IS NULL
  )
  WITH CHECK (
    -- Allow if current user is admin
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
    -- Or if it's the user's own permissions
    OR user_id = COALESCE(auth.uid(), public.uid())
    -- Or if created_by is null (system operation)
    OR created_by IS NULL
  );

-- Also update group_panel_permissions policies to use the same pattern
DROP POLICY IF EXISTS "Admin full access to group_panel_permissions" ON group_panel_permissions;
DROP POLICY IF EXISTS "Users can read group panel permissions" ON group_panel_permissions;

CREATE POLICY "Admin full access to group_panel_permissions"
  ON group_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Users can read group panel permissions"
  ON group_panel_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Update panel_definitions policies
DROP POLICY IF EXISTS "Admin full access to panel_definitions" ON panel_definitions;
DROP POLICY IF EXISTS "Users can read panel definitions" ON panel_definitions;

CREATE POLICY "Admin full access to panel_definitions"
  ON panel_definitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Users can read panel definitions"
  ON panel_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Update panel_permission_audit policies
DROP POLICY IF EXISTS "Admin read access to audit" ON panel_permission_audit;
DROP POLICY IF EXISTS "System insert audit records" ON panel_permission_audit;

CREATE POLICY "Admin read access to audit"
  ON panel_permission_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = COALESCE(auth.uid(), public.uid())
      AND user_profiles.profile_type = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "System insert audit records"
  ON panel_permission_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a helper function to get current user ID safely
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.uid(),
    public.uid(),
    current_setting('app.current_user_id', true)::uuid
  );
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- Ensure RLS is enabled on all tables
ALTER TABLE user_panel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_panel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_permission_audit ENABLE ROW LEVEL SECURITY;