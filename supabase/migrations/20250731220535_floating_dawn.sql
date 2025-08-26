/*
  # Aprimoramento do Sistema de Data/Hora Personalizável

  1. Melhorias na Tabela user_profiles
    - Garantir que a coluna can_modify_datetime existe e está configurada corretamente
    - Adicionar índices para performance

  2. Melhorias na Tabela logistics_records
    - Garantir que as colunas de data/hora personalizada existem
    - Adicionar índices para consultas eficientes

  3. Funções e Triggers
    - Função para validar datas personalizadas
    - Trigger para auditoria de alterações de data/hora

  4. Políticas de Segurança
    - RLS para controlar acesso às funcionalidades de data/hora
*/

-- Garantir que a coluna can_modify_datetime existe na tabela user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'can_modify_datetime'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN can_modify_datetime boolean DEFAULT false;
  END IF;
END $$;

-- Garantir que as colunas de data/hora personalizada existem na tabela logistics_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'custom_datetime'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN custom_datetime timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'datetime_modified_by'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN datetime_modified_by text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'datetime_modified_at'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN datetime_modified_at timestamptz;
  END IF;
END $$;

-- Adicionar comentários para documentação
COMMENT ON COLUMN user_profiles.can_modify_datetime IS 'Permite ao usuário alterar data/hora de registros (registro retroativo)';
COMMENT ON COLUMN logistics_records.custom_datetime IS 'Data/hora personalizada se alterada pelo operador (substitui created_at para cálculos)';
COMMENT ON COLUMN logistics_records.datetime_modified_by IS 'Nome do operador que alterou a data/hora original';
COMMENT ON COLUMN logistics_records.datetime_modified_at IS 'Timestamp de quando a data/hora foi alterada';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_can_modify_datetime 
ON user_profiles (can_modify_datetime) 
WHERE can_modify_datetime = true;

CREATE INDEX IF NOT EXISTS idx_logistics_records_custom_datetime 
ON logistics_records (custom_datetime) 
WHERE custom_datetime IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logistics_records_datetime_modified 
ON logistics_records (datetime_modified_by, datetime_modified_at) 
WHERE datetime_modified_by IS NOT NULL;

-- Função para validar data/hora personalizada
CREATE OR REPLACE FUNCTION validate_custom_datetime()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se a data personalizada não é futura
  IF NEW.custom_datetime IS NOT NULL AND NEW.custom_datetime > NOW() THEN
    RAISE EXCEPTION 'Data/hora personalizada não pode ser futura';
  END IF;

  -- Se está definindo data personalizada, deve ter modificador
  IF NEW.custom_datetime IS NOT NULL AND NEW.datetime_modified_by IS NULL THEN
    RAISE EXCEPTION 'datetime_modified_by é obrigatório quando custom_datetime é definido';
  END IF;

  -- Se está definindo data personalizada, deve ter timestamp de modificação
  IF NEW.custom_datetime IS NOT NULL AND NEW.datetime_modified_at IS NULL THEN
    NEW.datetime_modified_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação
DROP TRIGGER IF EXISTS validate_custom_datetime_trigger ON logistics_records;
CREATE TRIGGER validate_custom_datetime_trigger
  BEFORE INSERT OR UPDATE ON logistics_records
  FOR EACH ROW
  EXECUTE FUNCTION validate_custom_datetime();

-- Função para obter data/hora efetiva (custom_datetime ou created_at)
CREATE OR REPLACE FUNCTION get_effective_datetime(record logistics_records)
RETURNS timestamptz AS $$
BEGIN
  RETURN COALESCE(record.custom_datetime, record.created_at);
END;
$$ LANGUAGE plpgsql;

-- View para relatórios com data/hora efetiva
CREATE OR REPLACE VIEW logistics_records_with_effective_datetime AS
SELECT 
  *,
  get_effective_datetime(logistics_records.*) as effective_datetime,
  CASE 
    WHEN custom_datetime IS NOT NULL THEN true 
    ELSE false 
  END as has_custom_datetime
FROM logistics_records;

-- Função para auditoria de alterações de data/hora
CREATE OR REPLACE FUNCTION log_datetime_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Log apenas quando custom_datetime é alterado
  IF (OLD.custom_datetime IS DISTINCT FROM NEW.custom_datetime) THEN
    INSERT INTO panel_permission_audit (
      action_type,
      target_type,
      target_id,
      old_value,
      new_value,
      changed_by,
      changed_at
    ) VALUES (
      'datetime_modified',
      'logistics_record',
      NEW.id::text,
      jsonb_build_object(
        'old_custom_datetime', OLD.custom_datetime,
        'old_datetime_modified_by', OLD.datetime_modified_by
      ),
      jsonb_build_object(
        'new_custom_datetime', NEW.custom_datetime,
        'new_datetime_modified_by', NEW.datetime_modified_by
      ),
      COALESCE(
        (SELECT id FROM user_profiles WHERE full_name = NEW.datetime_modified_by LIMIT 1),
        NULL
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para auditoria
DROP TRIGGER IF EXISTS log_datetime_modification_trigger ON logistics_records;
CREATE TRIGGER log_datetime_modification_trigger
  AFTER UPDATE ON logistics_records
  FOR EACH ROW
  EXECUTE FUNCTION log_datetime_modification();

-- Política RLS para controlar acesso a alterações de data/hora
-- (As políticas existentes já permitem acesso total, mas podemos adicionar validação específica)

-- Função para verificar permissão de alteração de data/hora
CREATE OR REPLACE FUNCTION can_modify_datetime(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_id 
    AND is_active = true 
    AND (profile_type = 'admin' OR can_modify_datetime = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar usuários existentes com permissões apropriadas
-- Admins sempre podem modificar data/hora
UPDATE user_profiles 
SET can_modify_datetime = true 
WHERE profile_type = 'admin' AND can_modify_datetime IS NOT true;

-- Torre de controle pode modificar data/hora por padrão
UPDATE user_profiles 
SET can_modify_datetime = true 
WHERE profile_type = 'torre' AND can_modify_datetime IS NOT true;

-- Outros perfis não podem por padrão (podem ser habilitados individualmente)
UPDATE user_profiles 
SET can_modify_datetime = false 
WHERE profile_type IN ('compras', 'operacao', 'monitoramento') 
AND can_modify_datetime IS NULL;