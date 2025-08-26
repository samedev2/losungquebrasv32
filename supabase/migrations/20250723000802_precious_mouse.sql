/*
  # Add monitoramento profile type

  1. Changes
    - Add 'monitoramento' to the profile_type enum
    - This allows users to have the 'monitoramento' profile type

  2. Security
    - No changes to existing RLS policies
    - Maintains existing security structure
*/

-- Add 'monitoramento' to the profile_type enum
ALTER TYPE profile_type ADD VALUE IF NOT EXISTS 'monitoramento';