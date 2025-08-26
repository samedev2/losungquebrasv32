import React from 'react';
import { LogisticsRecord } from '../types/logistics';
import { StatusBadge } from './StatusBadge';
import { STATUS_CONFIGS } from '../types/tracking';
import { MapPin, User, Truck, Clock, ExternalLink } from 'lucide-react';

interface LogisticsCardProps {
  record: LogisticsRecord;
  onUpdateStatus: (recordId: string, newStatus: string) => void;
}

export function LogisticsCard({ record, onUpdateStatus }: LogisticsCardProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateStatus(record.id, e.target.value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{record.vehicle_code}</h3>
            <p className="text-sm text-gray-500">{record.vehicle_profile}</p>
          </div>
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">PRT:</span>
            <span className="font-medium">{record.internal_prt}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Motorista:</span>
            <span className="font-medium">{record.driver_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Placas:</span>
            <span className="font-medium">{record.truck_plate} / {record.trailer_plate}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Local:</span>
            <span className="font-medium">{record.current_address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Tecnologia:</span>
            <span className="font-medium">{record.technology}</span>
          </div>
          {record.maps_link && (
            <a 
              href={record.maps_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              Ver no Maps
            </a>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Ocorrência</h4>
        <p className="text-sm text-gray-600">{record.occurrence_description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-1">ETA Origem</h5>
          <p className="text-sm text-blue-700">{formatDate(record.eta_origin_deadline)}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <h5 className="font-medium text-green-900 mb-1">CPT</h5>
          <p className="text-sm text-green-700">{formatDate(record.cpt_release_deadline)}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <h5 className="font-medium text-purple-900 mb-1">ETA Destino</h5>
          <p className="text-sm text-purple-700">{formatDate(record.eta_destination_deadline)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Distância:</span> {record.remaining_distance}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={record.status}
            onChange={handleStatusChange}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}