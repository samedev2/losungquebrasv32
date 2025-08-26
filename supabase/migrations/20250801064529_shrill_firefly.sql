/*
  # Fix user panel permissions RLS policy

  1. Security Changes
    - Add INSERT policy for `user_panel_permissions` table
    - Allow authenticated users to insert their own permission records
    - This enables the default permissions application during login

  2. Policy Details
    - Users can insert records where user_id matches their auth.uid()
    - This is required for the applyDefaultPermissions function to work
    - Maintains security by only allowing users to manage their own permissions
*/

-- Add INSERT policy for user_panel_permissions
CREATE POLICY "Users can insert their own panel permissions"
  ON user_panel_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());