/*
  # Create Status Analysis Functions

  1. New Functions
    - `get_record_status_analysis(p_record_id uuid)` - Returns comprehensive status analysis
    - `transition_status_with_count()` - Handles status transitions with counting

  2. Features
    - Avoids nested aggregate functions using CTEs
    - Provides detailed breakdown by status
    - Calculates timeline and current status info
    - Handles duration calculations properly

  3. Security
    - Functions are security definer for proper access
    - Input validation included
*/

-- Function to get comprehensive record status analysis
CREATE OR REPLACE FUNCTION get_record_status_analysis(p_record_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_record_exists boolean;
BEGIN
  -- Check if record exists
  SELECT EXISTS(
    SELECT 1 FROM logistics_records WHERE id = p_record_id
  ) INTO v_record_exists;
  
  IF NOT v_record_exists THEN
    RETURN json_build_object('error', 'Record not found');
  END IF;

  -- Build comprehensive analysis using CTEs to avoid nested aggregates
  WITH record_info AS (
    SELECT 
      lr.id,
      lr.vehicle_code,
      lr.driver_name,
      lr.operator_name,
      lr.status as current_record_status,
      lr.created_at
    FROM logistics_records lr
    WHERE lr.id = p_record_id
  ),
  
  status_entries AS (
    SELECT 
      sct.*,
      CASE 
        WHEN sct.status_ended_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (sct.status_ended_at - sct.status_started_at))
        ELSE 
          EXTRACT(EPOCH FROM (NOW() - sct.status_started_at))
      END as calculated_duration_seconds
    FROM status_count_tracking sct
    WHERE sct.record_id = p_record_id
    ORDER BY sct.count_sequence
  ),
  
  status_breakdown AS (
    SELECT 
      se.new_status as status,
      COUNT(*) as occurrences,
      SUM(se.calculated_duration_seconds) as total_time_seconds,
      AVG(se.calculated_duration_seconds) as average_time_seconds,
      MIN(se.calculated_duration_seconds) as min_time_seconds,
      MAX(se.calculated_duration_seconds) as max_time_seconds
    FROM status_entries se
    WHERE se.status_ended_at IS NOT NULL OR se.is_current_status = false
    GROUP BY se.new_status
  ),
  
  process_totals AS (
    SELECT 
      COUNT(*) as total_changes,
      SUM(se.calculated_duration_seconds) as total_seconds,
      MIN(se.status_started_at) as process_start
    FROM status_entries se
  ),
  
  current_status_info AS (
    SELECT 
      se.new_status,
      se.operator_name,
      se.status_started_at,
      se.count_sequence,
      se.notes,
      se.calculated_duration_seconds as current_duration_seconds
    FROM status_entries se
    WHERE se.is_current_status = true
    LIMIT 1
  ),
  
  breakdown_with_percentages AS (
    SELECT 
      sb.*,
      (sb.total_time_seconds / NULLIF(pt.total_seconds, 0) * 100) as percentage_of_total,
      (sb.total_time_seconds / 3600.0) as total_time_hours,
      (sb.average_time_seconds / 3600.0) as average_time_hours
    FROM status_breakdown sb
    CROSS JOIN process_totals pt
  )
  
  SELECT json_build_object(
    'record_id', ri.id,
    'vehicle_code', ri.vehicle_code,
    'driver_name', ri.driver_name,
    'operator_name', ri.operator_name,
    'process_started_at', pt.process_start,
    'current_status', COALESCE(csi.new_status, ri.current_record_status),
    'total_process_time_seconds', COALESCE(pt.total_seconds, 0),
    'total_process_time_hours', COALESCE(pt.total_seconds / 3600.0, 0),
    'total_status_changes', COALESCE(pt.total_changes, 0),
    'status_breakdown', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'status', bwp.status,
          'total_time_seconds', bwp.total_time_seconds,
          'total_time_hours', bwp.total_time_hours,
          'occurrences', bwp.occurrences,
          'average_time_seconds', bwp.average_time_seconds,
          'average_time_hours', bwp.average_time_hours,
          'min_time_seconds', bwp.min_time_seconds,
          'max_time_seconds', bwp.max_time_seconds,
          'percentage_of_total', bwp.percentage_of_total
        )
      ) FROM breakdown_with_percentages bwp),
      '[]'::json
    ),
    'timeline', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', se.id,
          'count_sequence', se.count_sequence,
          'previous_status', se.previous_status,
          'new_status', se.new_status,
          'operator_name', se.operator_name,
          'status_started_at', se.status_started_at,
          'status_ended_at', se.status_ended_at,
          'duration_seconds', se.calculated_duration_seconds,
          'duration_hours', se.calculated_duration_seconds / 3600.0,
          'notes', se.notes,
          'is_current_status', se.is_current_status
        ) ORDER BY se.count_sequence
      ) FROM status_entries se),
      '[]'::json
    ),
    'current_status_info', CASE 
      WHEN csi.new_status IS NOT NULL THEN
        json_build_object(
          'status', csi.new_status,
          'operator_name', csi.operator_name,
          'started_at', csi.status_started_at,
          'current_duration_seconds', csi.current_duration_seconds,
          'current_duration_hours', csi.current_duration_seconds / 3600.0,
          'count_sequence', csi.count_sequence,
          'notes', csi.notes
        )
      ELSE NULL
    END
  ) INTO v_result
  FROM record_info ri
  LEFT JOIN process_totals pt ON true
  LEFT JOIN current_status_info csi ON true;
  
  RETURN v_result;
END;
$$;

-- Function to transition status with proper counting
CREATE OR REPLACE FUNCTION transition_status_with_count(
  p_record_id uuid,
  p_new_status text,
  p_operator_name text,
  p_notes text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_entry status_count_tracking%ROWTYPE;
  v_next_sequence integer;
  v_previous_status text;
  v_new_entry_id uuid;
BEGIN
  -- Get current status entry
  SELECT * INTO v_current_entry
  FROM status_count_tracking
  WHERE record_id = p_record_id 
    AND is_current_status = true
  ORDER BY count_sequence DESC
  LIMIT 1;
  
  -- Determine next sequence number and previous status
  IF v_current_entry.id IS NOT NULL THEN
    v_next_sequence := v_current_entry.count_sequence + 1;
    v_previous_status := v_current_entry.new_status;
    
    -- Close current status entry
    UPDATE status_count_tracking
    SET 
      status_ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - status_started_at)),
      duration_hours = EXTRACT(EPOCH FROM (NOW() - status_started_at)) / 3600.0,
      is_current_status = false,
      updated_at = NOW()
    WHERE id = v_current_entry.id;
  ELSE
    v_next_sequence := 1;
    v_previous_status := NULL;
  END IF;
  
  -- Insert new status entry
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
    v_previous_status,
    p_new_status,
    p_operator_name,
    NOW(),
    p_notes,
    true
  ) RETURNING id INTO v_new_entry_id;
  
  -- Update main logistics record
  UPDATE logistics_records
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_record_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'new_entry_id', v_new_entry_id,
    'sequence_number', v_next_sequence,
    'previous_status', v_previous_status,
    'new_status', p_new_status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;