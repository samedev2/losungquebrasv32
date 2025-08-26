import { LogisticsRecord } from '../types/logistics';
import { TrackingStatus } from '../types/tracking';

export function parseWhatsAppMessage(message: string, operatorName: string): Partial<LogisticsRecord> {
  const lines = message.split('\n').filter(line => line.trim());
  
  const extractValue = (line: string, pattern: RegExp): string => {
    const match = line.match(pattern);
    return match ? match[1].trim() : '';
  };

  const vehicleMatch = lines.find(line => line.includes('INF. QUEBRA VEÍCULO'));
  const vehicleCode = vehicleMatch ? extractValue(vehicleMatch, /INF\. QUEBRA VEÍCULO:\s*([A-Z0-9]+)/i) : '';
  const vehicleProfile = vehicleMatch ? extractValue(vehicleMatch, /PERFIL:\s*(.+)/i) : '';

  const prtLine = lines.find(line => line.includes('PRT Interno'));
  const internalPrt = prtLine ? extractValue(prtLine, /PRT Interno:\s*(\d+)/i) : '';

  const driverLine = lines.find(line => line.includes('Motorista'));
  const driverName = driverLine ? extractValue(driverLine, /Motorista:\s*(.+)/i) : '';

  const plateLine = lines.find(line => line.includes('Placa Cavalo'));
  const truckPlate = plateLine ? extractValue(plateLine, /Placa Cavalo\s*:\s*([A-Z0-9]+)/i) : '';
  const trailerPlate = plateLine ? extractValue(plateLine, /Placa Carreta:\s*([A-Z0-9]+)/i) : '';

  const statusLine = lines.find(line => line.includes('Status'));
  const status = statusLine ? extractValue(statusLine, /Status:\s*([^|]+)/i).toLowerCase() : '';
  const technology = statusLine ? extractValue(statusLine, /Tecnologia:\s*(.+)/i) : '';

  const addressLine = lines.find(line => line.includes('Endereço') && !line.includes('ETA'));
  const currentAddress = addressLine ? extractValue(addressLine, /Endereço:\s*(.+)/i) : '';

  const mapsLine = lines.find(line => line.includes('Maps'));
  const mapsLink = mapsLine ? extractValue(mapsLine, /Maps:\s*(.+)/i) : '';

  const occurrenceLine = lines.find(line => line.includes('Ocorrência'));
  const occurrenceDescription = occurrenceLine ? extractValue(occurrenceLine, /Ocorrência:\s*(.+)/i) : '';

  // ETA Origin
  const etaOriginIndex = lines.findIndex(line => line.includes('ETA ORIGEM'));
  const etaOriginDeadline = etaOriginIndex >= 0 && lines[etaOriginIndex + 1] ? 
    extractValue(lines[etaOriginIndex + 1], /Prazo:\s*(.+)/i) : '';
  const etaOriginAddress = etaOriginIndex >= 0 && lines[etaOriginIndex + 2] ? 
    extractValue(lines[etaOriginIndex + 2], /Endereço:\s*(.+)/i) : '';

  // CPT
  const cptIndex = lines.findIndex(line => line.includes('CPT'));
  const cptReleaseDeadline = cptIndex >= 0 && lines[cptIndex + 1] ? 
    extractValue(lines[cptIndex + 1], /Prazo de liberação:\s*(.+)/i) : '';

  // ETA Destination
  const etaDestinationIndex = lines.findIndex(line => line.includes('ETA DESTINO'));
  const etaDestinationDeadline = etaDestinationIndex >= 0 && lines[etaDestinationIndex + 1] ? 
    extractValue(lines[etaDestinationIndex + 1], /Prazo:\s*(.+)/i) : '';
  const etaDestinationAddress = etaDestinationIndex >= 0 && lines[etaDestinationIndex + 2] ? 
    extractValue(lines[etaDestinationIndex + 2], /Endereço:\s*(.+)/i) : '';

  // Distance
  const distanceLine = lines.find(line => line.includes('Distância restante'));
  const remainingDistance = distanceLine ? extractValue(distanceLine, /Distância restante:\s*([^-]+)/i) : '';
  const arrivalPrediction = distanceLine ? extractValue(distanceLine, /Previsão:\s*(.+)/i) : '';

  return {
    operator_name: operatorName,
    vehicle_code: vehicleCode,
    vehicle_profile: vehicleProfile,
    internal_prt: internalPrt,
    driver_name: driverName,
    truck_plate: truckPlate,
    trailer_plate: trailerPlate,
    status: mapStatus(status),
    technology: technology,
    current_address: currentAddress,
    maps_link: mapsLink,
    occurrence_description: occurrenceDescription,
    eta_origin_deadline: etaOriginDeadline,
    eta_origin_address: etaOriginAddress,
    cpt_release_deadline: cptReleaseDeadline,
    eta_destination_deadline: etaDestinationDeadline,
    eta_destination_address: etaDestinationAddress,
    remaining_distance: remainingDistance,
    arrival_prediction: arrivalPrediction,
    new_arrival_prediction: '',
    stopped_time: '',
    completion_time: '',
    original_message: message
  };
}

function mapStatus(status: string): TrackingStatus {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('parado')) return 'aguardando_tecnico';
  if (statusLower.includes('transito') || statusLower.includes('trânsito')) return 'reinicio_viagem';
  if (statusLower.includes('resolvido')) return 'finalizado';
  if (statusLower.includes('aguardando') && (statusLower.includes('tecnico') || statusLower.includes('técnico'))) return 'aguardando_tecnico';
  if (statusLower.includes('aguardando') && (statusLower.includes('mecanico') || statusLower.includes('mecânico'))) return 'aguardando_mecanico';
  if (statusLower.includes('manutencao') || statusLower.includes('manutenção')) {
    if (statusLower.includes('sem') && statusLower.includes('previsao')) return 'manutencao_sem_previsao';
    return 'manutencao_sem_previsao';
  }
  if (statusLower.includes('sem') && statusLower.includes('previsao')) return 'sem_previsao';
  if (statusLower.includes('transbordo')) {
    if (statusLower.includes('troca') || statusLower.includes('cavalo')) return 'transbordo_troca_cavalo';
    if (statusLower.includes('andamento')) return 'transbordo_em_andamento';
    if (statusLower.includes('finalizado')) return 'transbordo_finalizado';
    return 'transbordo_troca_cavalo';
  }
  if (statusLower.includes('reinicio') || statusLower.includes('reinício')) return 'reinicio_viagem';
  if (statusLower.includes('finalizado')) return 'finalizado';
  return 'aguardando_tecnico';
}