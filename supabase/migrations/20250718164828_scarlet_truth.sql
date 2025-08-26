/*
  # Sistema de Rastreamento Temporal - Tabela de Timestamps de Status

  1. Nova Tabela
    - `status_timestamps`
      - `id` (uuid, primary key)
      - `record_id` (uuid, foreign key para logistics_records)
      - `status` (text, status do rastreamento)
      - `operator_name` (text, nome do operador responsável)
      - `entered_at` (timestamp, quando entrou no status)
      - `exited_at` (timestamp, quando saiu do status - nullable)
      - `duration_seconds` (integer, duração em segundos - nullable)
      - `notes` (text, observações opcionais)
      - `created_at` (timestamp, criação do registro)

  2. Segurança
    - Habilitar RLS na tabela `status_timestamps`
    - Adicionar política para operações públicas (temporário para desenvolvimento)

  3. Índices
    - Índice para record_id (consultas por registro)
    - Índice para status (consultas por status)
    - Índice para entered_at (ordenação temporal)
    - Índice composto para record_id + entered_at (consultas otimizadas)

  4. Constraints
    - Check constraint para status válidos
    - Check constraint para duração não negativa
*/

-- Criar tabela de timestamps de status
CREATE TABLE IF NOT EXISTS status_timestamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  status text NOT NULL,
  operator_name text NOT NULL DEFAULT '',
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  duration_seconds integer,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Adicionar foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'status_timestamps_record_id_fkey'
  ) THEN
    ALTER TABLE status_timestamps 
    ADD CONSTRAINT status_timestamps_record_id_fkey 
    FOREIGN KEY (record_id) REFERENCES logistics_records(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'status_timestamps_status_check'
  ) THEN
    ALTER TABLE status_timestamps 
    ADD CONSTRAINT status_timestamps_status_check 
    CHECK (status IN (
      'aguardando_tecnico',
      'aguardando_mecanico', 
      'manutencao_sem_previsao',
      'transbordo_troca_cavalo',
      'transbordo_em_andamento',
      'transbordo_finalizado',
      'reinicio_viagem',
      'finalizado'
    ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'status_timestamps_duration_check'
  ) THEN
    ALTER TABLE status_timestamps 
    ADD CONSTRAINT status_timestamps_duration_check 
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_status_timestamps_record_id 
ON status_timestamps (record_id);

CREATE INDEX IF NOT EXISTS idx_status_timestamps_status 
ON status_timestamps (status);

CREATE INDEX IF NOT EXISTS idx_status_timestamps_entered_at 
ON status_timestamps (entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_timestamps_record_entered 
ON status_timestamps (record_id, entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_timestamps_current_status 
ON status_timestamps (record_id, entered_at DESC) 
WHERE exited_at IS NULL;

-- Habilitar Row Level Security
ALTER TABLE status_timestamps ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (desenvolvimento)
CREATE POLICY "Enable all operations for status_timestamps"
  ON status_timestamps
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_status_timestamps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_status_timestamps_updated_at ON status_timestamps;
CREATE TRIGGER update_status_timestamps_updated_at
  BEFORE INSERT ON status_timestamps
  FOR EACH ROW
  EXECUTE FUNCTION update_status_timestamps_updated_at();