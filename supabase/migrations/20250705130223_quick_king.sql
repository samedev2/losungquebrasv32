/*
  # Sistema de Monitoramento Logístico

  1. New Tables
    - `logistics_records`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `operator_name` (text) - Nome do operador responsável
      - `vehicle_code` (text) - Código LH TRIP do veículo
      - `vehicle_profile` (text) - Perfil do veículo
      - `internal_prt` (text) - PRT interno
      - `driver_name` (text) - Nome do motorista
      - `truck_plate` (text) - Placa do cavalo
      - `trailer_plate` (text) - Placa da carreta
      - `status` (text) - Status atual
      - `stopped_time` (text) - Tempo parado
      - `completion_time` (text) - Tempo de finalização
      - `technology` (text) - Tecnologia utilizada
      - `current_address` (text) - Endereço atual da quebra
      - `maps_link` (text) - Link do Google Maps
      - `occurrence_description` (text) - Descrição da ocorrência
      - `eta_origin_deadline` (text) - Prazo ETA origem
      - `eta_origin_address` (text) - Endereço ETA origem
      - `cpt_release_deadline` (text) - Prazo de liberação CPT
      - `eta_destination_deadline` (text) - Prazo ETA destino
      - `eta_destination_address` (text) - Endereço ETA destino
      - `remaining_distance` (text) - Distância restante
      - `arrival_prediction` (text) - Previsão de chegada
      - `new_arrival_prediction` (text) - Nova previsão de chegada
      - `original_message` (text) - Mensagem original do WhatsApp

    - `status_updates`
      - `id` (uuid, primary key)
      - `record_id` (uuid, foreign key)
      - `previous_status` (text)
      - `new_status` (text)
      - `comment` (text)
      - `updated_by` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage records
*/

CREATE TABLE IF NOT EXISTS logistics_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Operador responsável
  operator_name text NOT NULL DEFAULT '',
  
  -- Informações do veículo
  vehicle_code text NOT NULL DEFAULT '',
  vehicle_profile text DEFAULT '',
  internal_prt text DEFAULT '',
  driver_name text DEFAULT '',
  truck_plate text DEFAULT '',
  trailer_plate text DEFAULT '',
  
  -- Status e controle de tempo
  status text DEFAULT 'parado' CHECK (status IN ('parado', 'em_transito', 'resolvido', 'aguardando_tecnico', 'em_manutencao')),
  stopped_time text DEFAULT '',
  completion_time text DEFAULT '',
  
  -- Tecnologia e localização
  technology text DEFAULT '',
  current_address text DEFAULT '',
  maps_link text DEFAULT '',
  
  -- Ocorrência
  occurrence_description text DEFAULT '',
  
  -- ETA Origem
  eta_origin_deadline text DEFAULT '',
  eta_origin_address text DEFAULT '',
  
  -- CPT
  cpt_release_deadline text DEFAULT '',
  
  -- ETA Destino
  eta_destination_deadline text DEFAULT '',
  eta_destination_address text DEFAULT '',
  
  -- Distância e previsões
  remaining_distance text DEFAULT '',
  arrival_prediction text DEFAULT '',
  new_arrival_prediction text DEFAULT '',
  
  -- Mensagem original
  original_message text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES logistics_records(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  comment text DEFAULT '',
  updated_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE logistics_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for logistics_records
CREATE POLICY "Allow all operations on logistics_records"
  ON logistics_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read on logistics_records"
  ON logistics_records
  FOR SELECT
  TO anon
  USING (true);

-- Create policies for status_updates
CREATE POLICY "Allow all operations on status_updates"
  ON status_updates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read on status_updates"
  ON status_updates
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logistics_records_status ON logistics_records(status);
CREATE INDEX IF NOT EXISTS idx_logistics_records_created_at ON logistics_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logistics_records_vehicle_code ON logistics_records(vehicle_code);
CREATE INDEX IF NOT EXISTS idx_status_updates_record_id ON status_updates(record_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_created_at ON status_updates(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_logistics_records_updated_at
  BEFORE UPDATE ON logistics_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();