/*
  # Adicionar novo status 'sem_previsao'

  1. Alterações no banco de dados
    - Adicionar 'sem_previsao' como status válido na tabela logistics_records
    - Adicionar 'sem_previsao' como status válido na tabela status_timestamps
    - Manter compatibilidade com status existentes

  2. Status disponíveis após a migração
    - aguardando_tecnico
    - aguardando_mecanico  
    - manutencao_sem_previsao (existente)
    - sem_previsao (novo)
    - transbordo_troca_cavalo
    - transbordo_em_andamento
    - transbordo_finalizado
    - reinicio_viagem
    - finalizado
*/

-- Adicionar o novo status 'sem_previsao' às constraints existentes
ALTER TABLE logistics_records 
DROP CONSTRAINT IF EXISTS logistics_records_status_check;

ALTER TABLE logistics_records 
ADD CONSTRAINT logistics_records_status_check 
CHECK ((status = ANY (ARRAY[
  'parado'::text, 
  'em_transito'::text, 
  'resolvido'::text, 
  'aguardando_tecnico'::text, 
  'em_manutencao'::text, 
  'aguardando_mecanico'::text, 
  'manutencao_sem_previsao'::text,
  'sem_previsao'::text,
  'transbordo_troca_cavalo'::text, 
  'transbordo_em_andamento'::text, 
  'transbordo_finalizado'::text, 
  'reinicio_viagem'::text, 
  'finalizado'::text
])));

-- Adicionar o novo status 'sem_previsao' à tabela status_timestamps
ALTER TABLE status_timestamps 
DROP CONSTRAINT IF EXISTS status_timestamps_status_check;

ALTER TABLE status_timestamps 
ADD CONSTRAINT status_timestamps_status_check 
CHECK ((status = ANY (ARRAY[
  'aguardando_tecnico'::text, 
  'aguardando_mecanico'::text, 
  'manutencao_sem_previsao'::text,
  'sem_previsao'::text,
  'transbordo_troca_cavalo'::text, 
  'transbordo_em_andamento'::text, 
  'transbordo_finalizado'::text, 
  'reinicio_viagem'::text, 
  'finalizado'::text
])));