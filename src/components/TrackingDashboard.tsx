import React, { useState } from 'react';
import { TrackingTimeline } from './TrackingTimeline';
import { ProcessSummary } from './ProcessSummary';
import { StatusTimelineAnalysis } from './StatusTimelineAnalysis';
import { StatusCountAnalysis } from './StatusCountAnalysis';
import { Clock, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface TrackingDashboardProps {
  recordId: string;
  vehicleCode: string;
  onStatusChange?: () => void;
}

export function TrackingDashboard({ recordId, vehicleCode, onStatusChange }: TrackingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'summary' | 'analysis' | 'count'>('count');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleStatusChange = () => {
    if (onStatusChange) {
      onStatusChange();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Rastreamento Temporal - Losung
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Veículo: <span className="font-medium text-blue-600">{vehicleCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-all duration-200"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`transition-all duration-500 ease-in-out ${
        isCollapsed 
          ? 'max-h-0 opacity-0 overflow-hidden' 
          : 'max-h-[2000px] opacity-100 overflow-visible'
      }`}>
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="h-4 w-4" />
            Timeline de Status
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Resumo do Processo
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Análise Temporal
          </button>
          <button
            onClick={() => setActiveTab('count')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'count'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Contagem de Status
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'timeline' && (
            <TrackingTimeline 
              recordId={recordId} 
              onStatusChange={handleStatusChange}
            />
          )}
          {activeTab === 'summary' && (
            <ProcessSummary recordId={recordId} />
          )}
          {activeTab === 'analysis' && (
            <StatusTimelineAnalysis recordId={recordId} vehicleCode={vehicleCode} />
          )}
          {activeTab === 'count' && (
            <StatusCountAnalysis 
              recordId={recordId} 
              vehicleCode={vehicleCode}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}