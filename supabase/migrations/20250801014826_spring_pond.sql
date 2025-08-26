/*
  # Adicionar Timestamps de Quebra

  1. Novos Campos
    - `breakdown_occurred_at` (timestamp, opcional) - Quando a quebra realmente ocorreu
    - `breakdown_resolved_at` (timestamp, opcional) - Quando a quebra foi resolvida
    - `breakdown_timestamps_modified_by` (text, opcional) - Quem modificou os timestamps
    - `breakdown_timestamps_modified_at` (timestamp, opcional) - Quando foi modificado
    - `effective_breakdown_datetime` (computed) - Data efetiva da quebra

  2. Funções
    - Função para calcular data efetiva
    - Triggers para auditoria automática

  3. Validações
    - Constraints para garantir consistência temporal
    - Validação de datas futuras
*/

-- Adicionar novos campos à tabela logistics_records
DO $$
BEGIN
  -- Campo para data/hora real da quebra
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'breakdown_occurred_at'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN breakdown_occurred_at timestamptz;
  END IF;

  -- Campo para data/hora de resolução da quebra
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'breakdown_resolved_at'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN breakdown_resolved_at timestamptz;
  END IF;

  -- Campos de auditoria para timestamps
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'breakdown_timestamps_modified_by'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN breakdown_timestamps_modified_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'breakdown_timestamps_modified_at'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN breakdown_timestamps_modified_at timestamptz;
  END IF;
END $$;

-- Função para calcular data efetiva da quebra
CREATE OR REPLACE FUNCTION get_effective_breakdown_datetime(
  breakdown_occurred_at timestamptz,
  custom_datetime timestamptz,
  created_at timestamptz
) RETURNS timestamptz AS $$
BEGIN
  -- Prioridade: breakdown_occurred_at > custom_datetime > created_at
  RETURN COALESCE(breakdown_occurred_at, custom_datetime, created_at);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar timestamps de quebra
CREATE OR REPLACE FUNCTION validate_breakdown_timestamps() RETURNS trigger AS $$
BEGIN
  -- Validar que breakdown_occurred_at não é futuro
  IF NEW.breakdown_occurred_at IS NOT NULL AND NEW.breakdown_occurred_at > NOW() THEN
    RAISE EXCEPTION 'Data da quebra não pode ser futura';
  END IF;

  -- Validar que breakdown_resolved_at não é futuro
  IF NEW.breakdown_resolved_at IS NOT NULL AND NEW.breakdown_resolved_at > NOW() THEN
    RAISE EXCEPTION 'Data de resolução não pode ser futura';
  END IF;

  -- Validar que breakdown_resolved_at é posterior a breakdown_occurred_at
  IF NEW.breakdown_occurred_at IS NOT NULL AND NEW.breakdown_resolved_at IS NOT NULL THEN
    IF NEW.breakdown_resolved_at < NEW.breakdown_occurred_at THEN
      RAISE EXCEPTION 'Data de resolução deve ser posterior à data da quebra';
    END IF;
  END IF;

  -- Validar que breakdown_occurred_at não é muito antiga (30 dias)
  IF NEW.breakdown_occurred_at IS NOT NULL AND NEW.breakdown_occurred_at < (NOW() - INTERVAL '30 days') THEN
    RAISE EXCEPTION 'Data da quebra não pode ser anterior a 30 dias';
  END IF;

  -- Auto-preencher breakdown_resolved_at quando status é resolutivo
  IF NEW.status IN ('finalizado', 'resolvido', 'reinicio_viagem') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.breakdown_resolved_at IS NULL THEN
      NEW.breakdown_resolved_at = NOW();
    END IF;
  END IF;

  -- Registrar modificação de timestamps
  IF (OLD.breakdown_occurred_at IS DISTINCT FROM NEW.breakdown_occurred_at) OR 
     (OLD.breakdown_resolved_at IS DISTINCT FROM NEW.breakdown_resolved_at) THEN
    NEW.breakdown_timestamps_modified_at = NOW();
    -- breakdown_timestamps_modified_by deve ser definido pela aplicação
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação
DROP TRIGGER IF EXISTS validate_breakdown_timestamps_trigger ON logistics_records;
CREATE TRIGGER validate_breakdown_timestamps_trigger
  BEFORE INSERT OR UPDATE ON logistics_records
  FOR EACH ROW
  EXECUTE FUNCTION validate_breakdown_timestamps();

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_logistics_records_breakdown_occurred_at 
  ON logistics_records(breakdown_occurred_at) 
  WHERE breakdown_occurred_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logistics_records_breakdown_resolved_at 
  ON logistics_records(breakdown_resolved_at) 
  WHERE breakdown_resolved_at IS NOT NULL;

-- Criar view para facilitar consultas com data efetiva
CREATE OR REPLACE VIEW logistics_records_with_effective_dates AS
SELECT 
  *,
  get_effective_breakdown_datetime(breakdown_occurred_at, custom_datetime, created_at) as effective_breakdown_datetime,
  CASE 
    WHEN breakdown_resolved_at IS NOT NULL THEN breakdown_resolved_at
    WHEN status IN ('finalizado', 'resolvido', 'reinicio_viagem') THEN updated_at
    ELSE NULL
  END as effective_resolution_datetime
FROM logistics_records;

-- Comentários para documentação
COMMENT ON COLUMN logistics_records.breakdown_occurred_at IS 'Data/hora real quando a quebra ocorreu (pode ser diferente da data de registro)';
COMMENT ON COLUMN logistics_records.breakdown_resolved_at IS 'Data/hora quando a quebra foi efetivamente resolvida';
COMMENT ON COLUMN logistics_records.breakdown_timestamps_modified_by IS 'Usuário que modificou os timestamps da quebra';
COMMENT ON COLUMN logistics_records.breakdown_timestamps_modified_at IS 'Quando os timestamps foram modificados';