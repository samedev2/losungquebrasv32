/*
  # Fix RLS policies for user_panel_permissions table

  1. Security Updates
    - Update RLS policies to allow system operations during user creation
    - Allow authenticated users to manage their own panel permissions
    - Maintain admin oversight while enabling proper functionality

  2. Changes Made
    - Modified INSERT policy to allow system operations
    - Updated policies to handle permission application during login
    - Ensured proper access control while fixing the RLS violation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to user_panel_permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can insert their own panel permissions" ON user_panel_permissions;
DROP POLICY IF EXISTS "Users can read their own panel permissions" ON user_panel_permissions;

-- Create updated policies that allow proper permission management
CREATE POLICY "Admin full access to user_panel_permissions"
  ON user_panel_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = uid()
      AND user_profiles.profile_type = 'admin'::profile_type
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = uid()
      AND user_profiles.profile_type = 'admin'::profile_type
      AND user_profiles.is_active = true
    )
  );

-- Allow users to read their own panel permissions
CREATE POLICY "Users can read their own panel permissions"
  ON user_panel_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = uid());

-- Allow users to insert/update their own panel permissions OR allow system operations
CREATE POLICY "Users can manage their own panel permissions"
  ON user_panel_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = uid()
      AND user_profiles.profile_type = 'admin'::profile_type
      AND user_profiles.is_active = true
    )
  );

-- Allow users to update their own panel permissions
CREATE POLICY "Users can update their own panel permissions"
  ON user_panel_permissions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = uid()
      AND user_profiles.profile_type = 'admin'::profile_type
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    user_id = uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = uid()
      AND user_profiles.profile_type = 'admin'::profile_type
      AND user_profiles.is_active = true
    )
  );

-- Allow users to delete their own panel permissions (for cleanup)
CREATE POLICY "Users can delete their own panel permissions"
  ON user_panel_permissions
  FOR DELETE
  TO authenticated
  USING (
    user_id = uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = uid()
      AND user_profiles.profile_type = 'admin'::profile_type
      AND user_profiles.is_active = true
    )
  );