/*
  # Atualizar constraints de status para separar manutenção

  1. Alterações
    - Remover constraint antigo de status
    - Adicionar novo constraint com status separados
    - Atualizar registros existentes se necessário

  2. Novos Status
    - sem_previsao: Sem Previsão
    - manutencao: Manutenção
*/

-- Primeiro, atualizar registros existentes que usam o status antigo
UPDATE logistics_records 
SET status = 'sem_previsao' 
WHERE status = 'manutencao_sem_previsao';

UPDATE status_timestamps 
SET status = 'sem_previsao' 
WHERE status = 'manutencao_sem_previsao';

UPDATE status_updates 
SET new_status = 'sem_previsao' 
WHERE new_status = 'manutencao_sem_previsao';

UPDATE status_updates 
SET previous_status = 'sem_previsao' 
WHERE previous_status = 'manutencao_sem_previsao';

-- Remover constraint antigo da tabela logistics_records
ALTER TABLE logistics_records 
DROP CONSTRAINT IF EXISTS logistics_records_status_check;

-- Adicionar novo constraint com os status separados
ALTER TABLE logistics_records 
ADD CONSTRAINT logistics_records_status_check 
CHECK ((status = ANY (ARRAY[
  'parado'::text, 
  'em_transito'::text, 
  'resolvido'::text, 
  'aguardando_tecnico'::text, 
  'em_manutencao'::text, 
  'aguardando_mecanico'::text, 
  'sem_previsao'::text,
  'manutencao'::text,
  'transbordo_troca_cavalo'::text, 
  'transbordo_em_andamento'::text, 
  'transbordo_finalizado'::text, 
  'reinicio_viagem'::text, 
  'finalizado'::text
])));

-- Remover constraint antigo da tabela status_timestamps
ALTER TABLE status_timestamps 
DROP CONSTRAINT IF EXISTS status_timestamps_status_check;

-- Adicionar novo constraint para status_timestamps
ALTER TABLE status_timestamps 
ADD CONSTRAINT status_timestamps_status_check 
CHECK ((status = ANY (ARRAY[
  'aguardando_tecnico'::text, 
  'aguardando_mecanico'::text, 
  'sem_previsao'::text,
  'manutencao'::text,
  'transbordo_troca_cavalo'::text, 
  'transbordo_em_andamento'::text, 
  'transbordo_finalizado'::text, 
  'reinicio_viagem'::text, 
  'finalizado'::text
])));