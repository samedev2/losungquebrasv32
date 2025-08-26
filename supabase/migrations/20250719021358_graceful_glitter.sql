/*
  # Update logistics_records status constraint

  1. Changes
    - Update status check constraint to include all TrackingStatus values
    - Change default status to 'aguardando_tecnico'
    - Ensure compatibility with tracking system

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Drop the existing constraint
ALTER TABLE logistics_records DROP CONSTRAINT IF EXISTS logistics_records_status_check;

-- Add the new constraint with all tracking status values
ALTER TABLE logistics_records ADD CONSTRAINT logistics_records_status_check 
CHECK (status = ANY (ARRAY[
  'parado'::text,
  'em_transito'::text, 
  'resolvido'::text,
  'aguardando_tecnico'::text,
  'em_manutencao'::text,
  'aguardando_mecanico'::text,
  'manutencao_sem_previsao'::text,
  'transbordo_troca_cavalo'::text,
  'transbordo_em_andamento'::text,
  'transbordo_finalizado'::text,
  'reinicio_viagem'::text,
  'finalizado'::text
]));

-- Update the default value for new records
ALTER TABLE logistics_records ALTER COLUMN status SET DEFAULT 'aguardando_tecnico';