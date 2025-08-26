/*
  # Adicionar campos de ocorrência de quebra e controle de data/hora

  1. Novos Campos
    - `breakdown_occurrence` (text) - Descrição obrigatória da ocorrência relacionada ao tipo de quebra
    - `custom_datetime` (timestamptz) - Data/hora customizada se alterada pelo operador
    - `datetime_modified_by` (text) - Nome do operador que alterou a data/hora
    - `datetime_modified_at` (timestamptz) - Timestamp da alteração da data/hora

  2. Atualizações
    - Adicionar campos à tabela logistics_records
    - Manter compatibilidade com registros existentes
*/

-- Adicionar novos campos à tabela logistics_records
DO $$
BEGIN
  -- Campo para ocorrência obrigatória do tipo de quebra
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'breakdown_occurrence'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN breakdown_occurrence text DEFAULT '' NOT NULL;
  END IF;

  -- Campo para data/hora customizada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'custom_datetime'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN custom_datetime timestamptz;
  END IF;

  -- Campo para quem modificou a data/hora
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'datetime_modified_by'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN datetime_modified_by text;
  END IF;

  -- Campo para quando foi modificada a data/hora
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_records' AND column_name = 'datetime_modified_at'
  ) THEN
    ALTER TABLE logistics_records ADD COLUMN datetime_modified_at timestamptz;
  END IF;
END $$;

-- Adicionar comentários para documentação
COMMENT ON COLUMN logistics_records.breakdown_occurrence IS 'Descrição obrigatória da ocorrência relacionada ao tipo de quebra inicial';
COMMENT ON COLUMN logistics_records.custom_datetime IS 'Data/hora customizada se alterada pelo operador (substitui created_at para cálculos)';
COMMENT ON COLUMN logistics_records.datetime_modified_by IS 'Nome do operador que alterou a data/hora original';
COMMENT ON COLUMN logistics_records.datetime_modified_at IS 'Timestamp de quando a data/hora foi alterada';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_logistics_records_breakdown_occurrence 
ON logistics_records USING gin(to_tsvector('portuguese', breakdown_occurrence));

CREATE INDEX IF NOT EXISTS idx_logistics_records_custom_datetime 
ON logistics_records (custom_datetime) WHERE custom_datetime IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logistics_records_datetime_modified 
ON logistics_records (datetime_modified_by, datetime_modified_at) WHERE datetime_modified_by IS NOT NULL;