import React, { useState } from 'react';
import { LogisticsRecord } from '../types/logistics';
import { ExcelReportService } from '../lib/excelReportService';
import { STATUS_CONFIGS } from '../types/tracking';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  BarChart3, 
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface ExcelReportGeneratorProps {
  records: LogisticsRecord[];
}

type ReportType = 'complete' | 'period' | 'status' | 'performance';

export function ExcelReportGenerator({ records }: ExcelReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>('complete');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      switch (reportType) {
        case 'complete':
          await ExcelReportService.generateCompleteReport(records);
          break;
          
        case 'period':
          if (!startDate || !endDate) {
            throw new Error('Selecione as datas de início e fim');
          }
          await ExcelReportService.generatePeriodReport(
            records, 
            new Date(startDate), 
            new Date(endDate)
          );
          break;
          
        case 'status':
          if (!selectedStatus) {
            throw new Error('Selecione um status');
          }
          await ExcelReportService.generateStatusReport(records, selectedStatus);
          break;
          
        case 'performance':
          await ExcelReportService.generatePerformanceReport(records);
          break;
      }
      
      setLastGenerated(new Date());
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const getRecordCount = (): number => {
    switch (reportType) {
      case 'complete':
        return records.length;
      case 'period':
        if (!startDate || !endDate) return 0;
        return records.filter(record => {
          const recordDate = new Date(record.created_at);
          return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
        }).length;
      case 'status':
        if (!selectedStatus) return 0;
        return records.filter(record => record.status === selectedStatus).length;
      case 'performance':
        return records.filter(record => 
          record.status === 'finalizado' || record.status === 'resolvido'
        ).length;
      default:
        return 0;
    }
  };

  const isFormValid = (): boolean => {
    switch (reportType) {
      case 'complete':
      case 'performance':
        return true;
      case 'period':
        return !!(startDate && endDate);
      case 'status':
        return !!selectedStatus;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-2 rounded-lg">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gerador de Relatórios Excel</h3>
          <p className="text-sm text-gray-600">
            Exporte dados detalhados com breakdown de tempo por status
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Erro na Geração</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {lastGenerated && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Relatório Gerado com Sucesso!</h4>
              <p className="text-sm text-green-700 mt-1">
                Último relatório gerado em: {lastGenerated.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Tipo de Relatório */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Relatório
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setReportType('complete')}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                reportType === 'complete'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Relatório Completo</div>
                  <div className="text-sm text-gray-600">Todos os registros com breakdown detalhado</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType('period')}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                reportType === 'period'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Relatório por Período</div>
                  <div className="text-sm text-gray-600">Filtrar por data de criação</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType('status')}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                reportType === 'status'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Relatório por Status</div>
                  <div className="text-sm text-gray-600">Apenas registros com status específico</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType('performance')}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                reportType === 'performance'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Relatório de Performance</div>
                  <div className="text-sm text-gray-600">Apenas processos finalizados</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Filtros Específicos */}
        {reportType === 'period' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Filtro por Período</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {reportType === 'status' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Filtro por Status</h4>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um status</option>
              {Object.entries(STATUS_CONFIGS).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Preview dos Dados */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Preview do Relatório</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Registros a incluir:</span>
              <span className="font-medium text-gray-900">{getRecordCount()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Colunas de dados:</span>
              <span className="font-medium text-gray-900">20</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Formato:</span>
              <span className="font-medium text-gray-900">Excel (.xlsx)</span>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded border border-gray-200">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Colunas incluídas:</h5>
            <div className="text-xs text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-1">
              <span>• LT (Código do Veículo)</span>
              <span>• Nome do Operador</span>
              <span>• Nome do Motorista</span>
              <span>• Perfil</span>
              <span>• Tecnologia</span>
              <span>• Horas Totais</span>
              <span>• Aguardando Técnico (h)</span>
              <span>• Aguardando Mecânico (h)</span>
              <span>• Manutenção (h)</span>
              <span>• Sem Previsão (h)</span>
              <span>• Transbordo - Troca Cavalo (h)</span>
              <span>• Transbordo em Andamento (h)</span>
              <span>• Transbordo Finalizado (h)</span>
              <span>• Reinício de Viagem (h)</span>
              <span>• Finalizado (h)</span>
              <span>• Total de Mudanças</span>
              <span>• Data Início</span>
              <span>• Data Fim</span>
              <span>• Status Atual</span>
              <span>• Tempo no Status Atual (h)</span>
            </div>
          </div>
        </div>

        {/* Botão de Geração */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {getRecordCount() > 0 ? (
              <span>✅ Pronto para gerar relatório com {getRecordCount()} registro{getRecordCount() !== 1 ? 's' : ''}</span>
            ) : (
              <span>⚠️ Nenhum registro será incluído com os filtros atuais</span>
            )}
          </div>
          
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || !isFormValid() || getRecordCount() === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando Relatório...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Gerar Relatório Excel
              </>
            )}
          </button>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">ℹ️ Informações do Relatório</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• O relatório inclui breakdown detalhado de tempo por cada status</li>
            <li>• Todas as horas são calculadas cronologicamente baseadas nas mudanças de status</li>
            <li>• O arquivo Excel contém duas abas: "Relatório Completo" e "Resumo Executivo"</li>
            <li>• Os dados são ordenados por código do veículo (LT) em ordem alfabética</li>
            <li>• Registros sem dados de tracking terão cálculo básico de tempo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}