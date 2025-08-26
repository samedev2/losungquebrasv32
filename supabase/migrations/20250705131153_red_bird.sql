/*
  # Corrigir políticas RLS para permitir operações completas

  1. Políticas Atualizadas
    - Permitir todas as operações para usuários anônimos e autenticados
    - Corrigir políticas de INSERT, UPDATE, DELETE
    - Garantir que o frontend possa operar normalmente

  2. Segurança
    - Manter RLS habilitado
    - Políticas permissivas para desenvolvimento
*/

-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Allow anonymous insert on logistics_records" ON logistics_records;
DROP POLICY IF EXISTS "Allow anonymous read and insert on logistics_records" ON logistics_records;
DROP POLICY IF EXISTS "Allow authenticated all operations on logistics_records" ON logistics_records;
DROP POLICY IF EXISTS "Allow anonymous insert on status_updates" ON status_updates;
DROP POLICY IF EXISTS "Allow anonymous read on status_updates" ON status_updates;
DROP POLICY IF EXISTS "Allow authenticated all operations on status_updates" ON status_updates;

-- Políticas para logistics_records - permitir todas as operações
CREATE POLICY "Enable all operations for logistics_records"
  ON logistics_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para status_updates - permitir todas as operações
CREATE POLICY "Enable all operations for status_updates"
  ON status_updates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE logistics_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;