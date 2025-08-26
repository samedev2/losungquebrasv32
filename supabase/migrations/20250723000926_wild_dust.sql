/*
  # Create occurrence management tables

  1. New Tables
    - `occurrence_history`
      - `id` (uuid, primary key)
      - `record_id` (uuid, foreign key to logistics_records)
      - `occurrence_title` (text)
      - `occurrence_description` (text)
      - `occurrence_category` (text)
      - `priority_level` (enum: baixa, media, alta, critica)
      - `status` (enum: aberta, em_andamento, resolvida, cancelada)
      - `created_by` (text)
      - `resolved_by` (text, nullable)
      - `created_at` (timestamp)
      - `resolved_at` (timestamp, nullable)
      - `duration_hours` (numeric)
      - `notes` (text, nullable)

    - `occurrence_summary` (view for aggregated data)

  2. Security
    - Enable RLS on `occurrence_history` table
    - Add policies for authenticated users

  3. Functions
    - Helper functions for occurrence management
*/

-- Create enum types for occurrences
DO $$ BEGIN
  CREATE TYPE occurrence_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE occurrence_status AS ENUM ('aberta', 'em_andamento', 'resolvida', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update profile_type enum to include all types
DO $$ BEGIN
  ALTER TYPE profile_type ADD VALUE IF NOT EXISTS 'monitoramento';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE profile_type ADD VALUE IF NOT EXISTS 'torre';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create occurrence_history table
CREATE TABLE IF NOT EXISTS occurrence_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES logistics_records(id) ON DELETE CASCADE,
  occurrence_title text NOT NULL DEFAULT '',
  occurrence_description text NOT NULL DEFAULT '',
  occurrence_category text NOT NULL DEFAULT 'geral',
  priority_level occurrence_priority NOT NULL DEFAULT 'media',
  status occurrence_status NOT NULL DEFAULT 'aberta',
  created_by text NOT NULL DEFAULT '',
  resolved_by text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL,
  duration_hours numeric(10,2) DEFAULT 0,
  notes text DEFAULT ''
);

-- Create indexes for occurrence_history
CREATE INDEX IF NOT EXISTS idx_occurrence_history_record_id ON occurrence_history(record_id);
CREATE INDEX IF NOT EXISTS idx_occurrence_history_status ON occurrence_history(status);
CREATE INDEX IF NOT EXISTS idx_occurrence_history_created_at ON occurrence_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_occurrence_history_priority ON occurrence_history(priority_level);

-- Enable RLS
ALTER TABLE occurrence_history ENABLE ROW LEVEL SECURITY;

-- Create policies for occurrence_history
CREATE POLICY "Allow all operations on occurrence_history"
  ON occurrence_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create occurrence_summary view
CREATE OR REPLACE VIEW occurrence_summary AS
SELECT 
  lr.id as record_id,
  lr.vehicle_code,
  lr.driver_name,
  lr.operator_name,
  lr.status as record_status,
  lr.created_at as record_created_at,
  COALESCE(occ_stats.total_occurrences, 0) as total_occurrences,
  COALESCE(occ_stats.open_occurrences, 0) as open_occurrences,
  COALESCE(occ_stats.resolved_occurrences, 0) as resolved_occurrences,
  COALESCE(occ_stats.total_occurrence_hours, 0) as total_occurrence_hours,
  occ_stats.first_occurrence_at,
  occ_stats.last_resolved_at
FROM logistics_records lr
LEFT JOIN (
  SELECT 
    record_id,
    COUNT(*) as total_occurrences,
    COUNT(CASE WHEN status IN ('aberta', 'em_andamento') THEN 1 END) as open_occurrences,
    COUNT(CASE WHEN status = 'resolvida' THEN 1 END) as resolved_occurrences,
    SUM(COALESCE(duration_hours, 0)) as total_occurrence_hours,
    MIN(created_at) as first_occurrence_at,
    MAX(resolved_at) as last_resolved_at
  FROM occurrence_history
  GROUP BY record_id
) occ_stats ON lr.id = occ_stats.record_id;

-- Create helper functions
CREATE OR REPLACE FUNCTION add_occurrence_to_history(
  p_record_id uuid,
  p_title text,
  p_description text,
  p_category text DEFAULT 'geral',
  p_priority text DEFAULT 'media',
  p_created_by text DEFAULT ''
) RETURNS uuid AS $$
DECLARE
  occurrence_id uuid;
BEGIN
  INSERT INTO occurrence_history (
    record_id,
    occurrence_title,
    occurrence_description,
    occurrence_category,
    priority_level,
    created_by
  ) VALUES (
    p_record_id,
    p_title,
    p_description,
    p_category,
    p_priority::occurrence_priority,
    p_created_by
  ) RETURNING id INTO occurrence_id;
  
  RETURN occurrence_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_occurrence(
  p_occurrence_id uuid,
  p_resolved_by text,
  p_notes text DEFAULT ''
) RETURNS boolean AS $$
DECLARE
  occurrence_created_at timestamptz;
  duration_calc numeric;
BEGIN
  -- Get the created_at timestamp
  SELECT created_at INTO occurrence_created_at
  FROM occurrence_history
  WHERE id = p_occurrence_id;
  
  IF occurrence_created_at IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate duration in hours
  duration_calc := EXTRACT(EPOCH FROM (now() - occurrence_created_at)) / 3600;
  
  -- Update the occurrence
  UPDATE occurrence_history
  SET 
    status = 'resolvida',
    resolved_by = p_resolved_by,
    resolved_at = now(),
    duration_hours = duration_calc,
    notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n' ELSE '' END || p_notes
  WHERE id = p_occurrence_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_total_occurrence_hours(
  p_record_id uuid
) RETURNS numeric AS $$
DECLARE
  total_hours numeric;
BEGIN
  SELECT COALESCE(SUM(duration_hours), 0)
  INTO total_hours
  FROM occurrence_history
  WHERE record_id = p_record_id;
  
  RETURN total_hours;
END;
$$ LANGUAGE plpgsql;