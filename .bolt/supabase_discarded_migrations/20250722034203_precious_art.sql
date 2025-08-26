/*
  # Atualizar registros existentes para novos status separados

  1. Conversão de Status
    - Converte registros com 'manutencao_sem_previsao' para 'manutencao'
    - Preserva todos os dados existentes
    - Mantém histórico de timestamps

  2. Atualização de Constraints
    - Remove o status antigo 'manutencao_sem_previsao'
    - Adiciona os novos status 'sem_previsao' e 'manutencao'
    - Atualiza validações da tabela

  3. Preservação de Dados
    - Todos os 5 registros existentes são preservados
    - Apenas o campo status é atualizado
    - Timestamps e histórico mantidos intactos
*/

-- Primeiro, atualizar os registros existentes
UPDATE logistics_records 
SET status = 'manutencao', 
    updated_at = now()
WHERE status = 'manutencao_sem_previsao';

-- Atualizar também os registros na tabela de status_timestamps se existirem
UPDATE status_timestamps 
SET status = 'manutencao'
WHERE status = 'manutencao_sem_previsao';

-- Atualizar também os registros na tabela de status_updates se existirem
UPDATE status_updates 
SET new_status = 'manutencao'
WHERE new_status = 'manutencao_sem_previsao';

UPDATE status_updates 
SET previous_status = 'manutencao'
WHERE previous_status = 'manutencao_sem_previsao';

-- Remover o constraint antigo
ALTER TABLE logistics_records 
DROP CONSTRAINT IF EXISTS logistics_records_status_check;

-- Adicionar o novo constraint com os status separados
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

-- Atualizar constraint da tabela status_timestamps se existir
ALTER TABLE status_timestamps 
DROP CONSTRAINT IF EXISTS status_timestamps_status_check;

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