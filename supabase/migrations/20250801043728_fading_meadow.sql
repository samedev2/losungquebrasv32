/*
  # Fix Operator DateTime Permissions

  1. Updates
    - Grant datetime modification permissions to all operator profiles
    - Update existing demo users to have datetime permissions
    - Ensure proper permission inheritance

  2. Security
    - Maintains admin-only permission management
    - Preserves audit trail for datetime modifications
*/

-- Update all existing operator profiles to have datetime modification permission
UPDATE user_profiles 
SET 
  can_modify_datetime = true,
  updated_at = now()
WHERE 
  profile_type IN ('compras', 'operacao', 'monitoramento', 'torre')
  AND is_active = true;

-- Ensure demo users have the correct permissions
UPDATE user_profiles 
SET 
  can_modify_datetime = true,
  updated_at = now()
WHERE 
  email IN (
    'compras@losung.com',
    'operacao@losung.com', 
    'monitoramento@losung.com',
    'torre@losung.com',
    'admin@losung.com'
  );

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_datetime_permission 
ON user_profiles (can_modify_datetime, profile_type) 
WHERE can_modify_datetime = true;

-- Add comment to document the permission purpose
COMMENT ON COLUMN user_profiles.can_modify_datetime IS 
'Allows user to modify breakdown timestamps and register retroactive entries. Required for Break timestamp setting functionality.';