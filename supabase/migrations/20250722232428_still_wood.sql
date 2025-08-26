/*
  # Sistema de Contagem e Rastreamento de Status

  1. Novas Tabelas
    - `status_count_tracking` - Rastreamento detalhado de cada mudança de status com contadores
    - Campos para contagem sequencial, tempo de duração, operador responsável
    
  2. Funcionalidades
    - Contador sequencial por registro
    - Cálculo automático de duração em cada status
    - Histórico completo de mudanças
    - Métricas de tempo para análise gerencial
    
  3. Segurança
    - RLS habilitado
    - Políticas para acesso público (temporário para desenvolvimento)
*/

-- Tabela para rastreamento detalhado de contagem de status
CREATE TABLE IF NOT EXISTS status_count_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES logistics_records(id) ON DELETE CASCADE,
  count_sequence integer NOT NULL DEFAULT 1,
  previous_status text,
  new_status text NOT NULL,
  operator_name text NOT NULL DEFAULT '',
  status_started_at timestamptz NOT NULL DEFAULT now(),
  status_ended_at timestamptz,
  duration_seconds integer,
  duration_hours decimal(10,2),
  notes text DEFAULT '',
  is_current_status boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_status_count_tracking_record_id ON status_count_tracking(record_id);
CREATE INDEX IF NOT EXISTS idx_status_count_tracking_sequence ON status_count_tracking(record_id, count_sequence);
CREATE INDEX IF NOT EXISTS idx_status_count_tracking_current ON status_count_tracking(record_id, is_current_status) WHERE is_current_status = true;
CREATE INDEX IF NOT EXISTS idx_status_count_tracking_status ON status_count_tracking(new_status);
CREATE INDEX IF NOT EXISTS idx_status_count_tracking_started_at ON status_count_tracking(status_started_at DESC);

-- RLS
ALTER TABLE status_count_tracking ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (desenvolvimento)
CREATE POLICY "Allow all operations on status_count_tracking"
  ON status_count_tracking
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_status_count_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_status_count_tracking_updated_at ON status_count_tracking;
CREATE TRIGGER update_status_count_tracking_updated_at
  BEFORE UPDATE ON status_count_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_status_count_tracking_updated_at();

-- Função para finalizar status anterior e iniciar novo status
CREATE OR REPLACE FUNCTION transition_status_with_count(
  p_record_id uuid,
  p_new_status text,
  p_operator_name text,
  p_notes text DEFAULT ''
)
RETURNS json AS $$
DECLARE
  v_current_tracking status_count_tracking%ROWTYPE;
  v_next_sequence integer;
  v_duration_seconds integer;
  v_duration_hours decimal(10,2);
  v_new_tracking_id uuid;
BEGIN
  -- Buscar o status atual ativo
  SELECT * INTO v_current_tracking
  FROM status_count_tracking
  WHERE record_id = p_record_id 
    AND is_current_status = true
  ORDER BY count_sequence DESC
  LIMIT 1;

  -- Calcular próximo número de sequência
  SELECT COALESCE(MAX(count_sequence), 0) + 1 INTO v_next_sequence
  FROM status_count_tracking
  WHERE record_id = p_record_id;

  -- Se existe status atual, finalizá-lo
  IF v_current_tracking.id IS NOT NULL THEN
    -- Calcular duração
    v_duration_seconds := EXTRACT(EPOCH FROM (now() - v_current_tracking.status_started_at))::integer;
    v_duration_hours := v_duration_seconds / 3600.0;
    
    -- Finalizar status atual
    UPDATE status_count_tracking
    SET 
      status_ended_at = now(),
      duration_seconds = v_duration_seconds,
      duration_hours = v_duration_hours,
      is_current_status = false,
      updated_at = now()
    WHERE id = v_current_tracking.id;
  END IF;

  -- Criar novo registro de status
  INSERT INTO status_count_tracking (
    record_id,
    count_sequence,
    previous_status,
    new_status,
    operator_name,
    status_started_at,
    notes,
    is_current_status
  ) VALUES (
    p_record_id,
    v_next_sequence,
    v_current_tracking.new_status,
    p_new_status,
    p_operator_name,
    now(),
    p_notes,
    true
  ) RETURNING id INTO v_new_tracking_id;

  -- Atualizar status principal do registro
  UPDATE logistics_records
  SET 
    status = p_new_status,
    updated_at = now()
  WHERE id = p_record_id;

  -- Retornar informações da transição
  RETURN json_build_object(
    'success', true,
    'new_tracking_id', v_new_tracking_id,
    'sequence_number', v_next_sequence,
    'previous_status', v_current_tracking.new_status,
    'new_status', p_new_status,
    'previous_duration_seconds', v_duration_seconds,
    'previous_duration_hours', v_duration_hours
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Função para obter análise completa de um registro
CREATE OR REPLACE FUNCTION get_record_status_analysis(p_record_id uuid)
RETURNS json AS $$
DECLARE
  v_record logistics_records%ROWTYPE;
  v_total_process_time_seconds integer;
  v_total_process_time_hours decimal(10,2);
  v_status_breakdown json;
  v_timeline json;
  v_current_status_info json;
BEGIN
  -- Buscar informações do registro
  SELECT * INTO v_record
  FROM logistics_records
  WHERE id = p_record_id;

  IF v_record.id IS NULL THEN
    RETURN json_build_object('error', 'Registro não encontrado');
  END IF;

  -- Calcular tempo total do processo
  v_total_process_time_seconds := EXTRACT(EPOCH FROM (now() - v_record.created_at))::integer;
  v_total_process_time_hours := v_total_process_time_seconds / 3600.0;

  -- Obter breakdown por status
  SELECT json_agg(
    json_build_object(
      'status', new_status,
      'total_time_seconds', COALESCE(SUM(duration_seconds), 0),
      'total_time_hours', COALESCE(SUM(duration_hours), 0),
      'occurrences', COUNT(*),
      'average_time_seconds', COALESCE(AVG(duration_seconds), 0),
      'average_time_hours', COALESCE(AVG(duration_hours), 0),
      'min_time_seconds', COALESCE(MIN(duration_seconds), 0),
      'max_time_seconds', COALESCE(MAX(duration_seconds), 0),
      'percentage_of_total', 
        CASE 
          WHEN v_total_process_time_seconds > 0 THEN 
            (COALESCE(SUM(duration_seconds), 0) * 100.0 / v_total_process_time_seconds)
          ELSE 0 
        END
    ) ORDER BY SUM(duration_seconds) DESC
  ) INTO v_status_breakdown
  FROM status_count_tracking
  WHERE record_id = p_record_id
    AND duration_seconds IS NOT NULL
  GROUP BY new_status;

  -- Obter timeline completa
  SELECT json_agg(
    json_build_object(
      'id', id,
      'count_sequence', count_sequence,
      'previous_status', previous_status,
      'new_status', new_status,
      'operator_name', operator_name,
      'status_started_at', status_started_at,
      'status_ended_at', status_ended_at,
      'duration_seconds', duration_seconds,
      'duration_hours', duration_hours,
      'notes', notes,
      'is_current_status', is_current_status
    ) ORDER BY count_sequence ASC
  ) INTO v_timeline
  FROM status_count_tracking
  WHERE record_id = p_record_id;

  -- Obter informações do status atual
  SELECT json_build_object(
    'status', new_status,
    'operator_name', operator_name,
    'started_at', status_started_at,
    'current_duration_seconds', EXTRACT(EPOCH FROM (now() - status_started_at))::integer,
    'current_duration_hours', EXTRACT(EPOCH FROM (now() - status_started_at))::integer / 3600.0,
    'count_sequence', count_sequence,
    'notes', notes
  ) INTO v_current_status_info
  FROM status_count_tracking
  WHERE record_id = p_record_id 
    AND is_current_status = true
  ORDER BY count_sequence DESC
  LIMIT 1;

  -- Retornar análise completa
  RETURN json_build_object(
    'record_id', p_record_id,
    'vehicle_code', v_record.vehicle_code,
    'driver_name', v_record.driver_name,
    'operator_name', v_record.operator_name,
    'process_started_at', v_record.created_at,
    'current_status', v_record.status,
    'total_process_time_seconds', v_total_process_time_seconds,
    'total_process_time_hours', v_total_process_time_hours,
    'total_status_changes', (
      SELECT COUNT(*) FROM status_count_tracking WHERE record_id = p_record_id
    ),
    'status_breakdown', COALESCE(v_status_breakdown, '[]'::json),
    'timeline', COALESCE(v_timeline, '[]'::json),
    'current_status_info', v_current_status_info
  );

END;
$$ LANGUAGE plpgsql;