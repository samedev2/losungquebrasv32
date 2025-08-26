/*
  # Adicionar permissão de alteração de data/hora

  1. Alterações na Tabela
    - Adicionar coluna `can_modify_datetime` na tabela `user_profiles`
    - Definir valor padrão como `false` (apenas admins por padrão)
    - Atualizar admins existentes para ter a permissão

  2. Segurança
    - Manter RLS existente
    - Apenas admins podem alterar esta permissão
*/

-- Adicionar coluna de permissão para alterar data/hora
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'can_modify_datetime'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN can_modify_datetime boolean DEFAULT false;
  END IF;
END $$;

-- Dar permissão para todos os admins existentes
UPDATE user_profiles 
SET can_modify_datetime = true 
WHERE profile_type = 'admin';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_can_modify_datetime 
ON user_profiles (can_modify_datetime) 
WHERE can_modify_datetime = true;