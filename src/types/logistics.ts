import { TrackingStatus } from './tracking';

export interface LogisticsRecord {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Operador responsável
  operator_name: string;
  
  // Informações do veículo
  vehicle_code: string; // LH TRIP
  vehicle_profile: string;
  internal_prt: string;
  driver_name: string;
  truck_plate: string;
  trailer_plate: string;
  
  // Status e controle de tempo
  status: TrackingStatus;
  stopped_time: string; // Tempo parado calculado
  completion_time: string; // Tempo de finalização
  
  // Tecnologia e localização
  technology: string;
  current_address: string;
  maps_link: string;
  
  // Ocorrência
  occurrence_description: string;
  
  // ETA Origem
  eta_origin_deadline: string;
  eta_origin_address: string;
  
  // CPT
  cpt_release_deadline: string;
  
  // ETA Destino
  eta_destination_deadline: string;
  eta_destination_address: string;
  
  // Distância e previsões
  remaining_distance: string;
  arrival_prediction: string;
  new_arrival_prediction: string;
  
  // Mensagem original
  original_message: string;
}

export interface StatusUpdate {
  id: string;
  record_id: string;
  previous_status: string;
  new_status: string;
  comment: string;
  updated_by: string;
  created_at: string;
}