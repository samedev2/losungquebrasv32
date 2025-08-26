import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { LogisticsRecord } from '../types/logistics';
import { StatusCountService } from './statusCountService';
import { STATUS_CONFIGS } from '../types/tracking';

export interface ExcelReportData {
  LT: string; // Vehicle Code
  'Nome do Operador': string;
  'Nome do Motorista': string;
  Perfil: string;
  Tecnologia: string;
  'Horas Totais': number;
  'Aguardando Técnico (h)': number;
  'Aguardando Mecânico (h)': number;
  'Manutenção (h)': number;
  'Sem Previsão (h)': number;
  'Transbordo - Troca Cavalo (h)': number;
  'Transbordo em Andamento (h)': number;
  'Transbordo Finalizado (h)': number;
  'Reinício de Viagem (h)': number;
  'Finalizado (h)': number;
  'Total de Mudanças': number;
  'Data Início': string;
  'Data Fim': string;
  'Status Atual': string;
  'Tempo no Status Atual (h)': number;
}

export class ExcelReportService {
  /**
   * Gera relatório completo em Excel com dados de todos os registros
   */
  static async generateCompleteReport(records: LogisticsRecord[]): Promise<void> {
    try {
      console.log('Iniciando geração de relatório Excel...');
      
      const reportData: ExcelReportData[] = [];
      
      // Processar cada registro
      for (const record of records) {
        try {
          // Obter análise de status para cada registro
          const analysis = await StatusCountService.getRecordAnalysis(record.id);
          
          // Inicializar dados do registro
          const recordData: ExcelReportData = {
            'LT': record.vehicle_code,
            'Nome do Operador': record.operator_name,
            'Nome do Motorista': record.driver_name,
            'Perfil': record.vehicle_profile,
            'Tecnologia': record.technology,
            'Horas Totais': analysis.total_process_time_hours,
            'Aguardando Técnico (h)': 0,
            'Aguardando Mecânico (h)': 0,
            'Manutenção (h)': 0,
            'Sem Previsão (h)': 0,
            'Transbordo - Troca Cavalo (h)': 0,
            'Transbordo em Andamento (h)': 0,
            'Transbordo Finalizado (h)': 0,
            'Reinício de Viagem (h)': 0,
            'Finalizado (h)': 0,
            'Total de Mudanças': analysis.total_status_changes,
            'Data Início': new Date(record.created_at).toLocaleString('pt-BR'),
            'Data Fim': record.status === 'finalizado' || record.status === 'resolvido' 
              ? new Date(record.updated_at).toLocaleString('pt-BR') 
              : 'Em andamento',
            'Status Atual': this.getStatusLabel(record.status),
            'Tempo no Status Atual (h)': analysis.current_status_info?.current_duration_hours || 0
          };

          // Mapear breakdown de status para colunas específicas
          analysis.status_breakdown.forEach(breakdown => {
            switch (breakdown.status) {
              case 'aguardando_tecnico':
                recordData['Aguardando Técnico (h)'] = breakdown.total_time_hours;
                break;
              case 'aguardando_mecanico':
                recordData['Aguardando Mecânico (h)'] = breakdown.total_time_hours;
                break;
              case 'manutencao_sem_previsao':
                recordData['Manutenção (h)'] = breakdown.total_time_hours;
                break;
              case 'sem_previsao':
                recordData['Sem Previsão (h)'] = breakdown.total_time_hours;
                break;
              case 'transbordo_troca_cavalo':
                recordData['Transbordo - Troca Cavalo (h)'] = breakdown.total_time_hours;
                break;
              case 'transbordo_em_andamento':
                recordData['Transbordo em Andamento (h)'] = breakdown.total_time_hours;
                break;
              case 'transbordo_finalizado':
                recordData['Transbordo Finalizado (h)'] = breakdown.total_time_hours;
                break;
              case 'reinicio_viagem':
                recordData['Reinício de Viagem (h)'] = breakdown.total_time_hours;
                break;
              case 'finalizado':
                recordData['Finalizado (h)'] = breakdown.total_time_hours;
                break;
            }
          });

          reportData.push(recordData);
        } catch (error) {
          console.warn(`Erro ao processar registro ${record.id}:`, error);
          
          // Adicionar registro básico mesmo com erro na análise
          const basicData: ExcelReportData = {
            'LT': record.vehicle_code,
            'Nome do Operador': record.operator_name,
            'Nome do Motorista': record.driver_name,
            'Perfil': record.vehicle_profile,
            'Tecnologia': record.technology,
            'Horas Totais': this.calculateBasicHours(record),
            'Aguardando Técnico (h)': 0,
            'Aguardando Mecânico (h)': 0,
            'Manutenção (h)': 0,
            'Sem Previsão (h)': 0,
            'Transbordo - Troca Cavalo (h)': 0,
            'Transbordo em Andamento (h)': 0,
            'Transbordo Finalizado (h)': 0,
            'Reinício de Viagem (h)': 0,
            'Finalizado (h)': 0,
            'Total de Mudanças': 0,
            'Data Início': new Date(record.created_at).toLocaleString('pt-BR'),
            'Data Fim': record.status === 'finalizado' || record.status === 'resolvido' 
              ? new Date(record.updated_at).toLocaleString('pt-BR') 
              : 'Em andamento',
            'Status Atual': this.getStatusLabel(record.status),
            'Tempo no Status Atual (h)': this.calculateBasicHours(record)
          };
          
          reportData.push(basicData);
        }
      }

      // Ordenar por LT (Vehicle Code)
      reportData.sort((a, b) => a.LT.localeCompare(b.LT));

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      
      // Criar worksheet principal
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      
      // Configurar larguras das colunas
      const columnWidths = [
        { wch: 12 }, // LT
        { wch: 20 }, // Nome do Operador
        { wch: 25 }, // Nome do Motorista
        { wch: 15 }, // Perfil
        { wch: 15 }, // Tecnologia
        { wch: 12 }, // Horas Totais
        { wch: 15 }, // Aguardando Técnico
        { wch: 15 }, // Aguardando Mecânico
        { wch: 12 }, // Manutenção
        { wch: 12 }, // Sem Previsão
        { wch: 18 }, // Transbordo - Troca Cavalo
        { wch: 18 }, // Transbordo em Andamento
        { wch: 18 }, // Transbordo Finalizado
        { wch: 15 }, // Reinício de Viagem
        { wch: 12 }, // Finalizado
        { wch: 15 }, // Total de Mudanças
        { wch: 20 }, // Data Início
        { wch: 20 }, // Data Fim
        { wch: 15 }, // Status Atual
        { wch: 18 }  // Tempo no Status Atual
      ];
      
      worksheet['!cols'] = columnWidths;
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Completo');
      
      // Criar worksheet de resumo
      const summaryData = this.generateSummaryData(reportData);
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        { wch: 25 }, // Métrica
        { wch: 15 }, // Valor
        { wch: 10 }  // Unidade
      ];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumo Executivo');
      
      // Gerar nome do arquivo com timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `Relatorio_Quebras_Losung_${timestamp}.xlsx`;
      
      // Salvar arquivo
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
      
      console.log(`Relatório Excel gerado: ${filename}`);
    } catch (error) {
      console.error('Erro ao gerar relatório Excel:', error);
      throw new Error('Erro ao gerar relatório Excel: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }

  /**
   * Gera dados de resumo executivo
   */
  private static generateSummaryData(reportData: ExcelReportData[]) {
    const totalRecords = reportData.length;
    const totalHours = reportData.reduce((sum, record) => sum + record['Horas Totais'], 0);
    const averageHours = totalRecords > 0 ? totalHours / totalRecords : 0;
    const totalChanges = reportData.reduce((sum, record) => sum + record['Total de Mudanças'], 0);
    const averageChanges = totalRecords > 0 ? totalChanges / totalRecords : 0;
    
    // Calcular tempo por status
    const statusTotals = {
      'Aguardando Técnico': reportData.reduce((sum, r) => sum + r['Aguardando Técnico (h)'], 0),
      'Aguardando Mecânico': reportData.reduce((sum, r) => sum + r['Aguardando Mecânico (h)'], 0),
      'Manutenção': reportData.reduce((sum, r) => sum + r['Manutenção (h)'], 0),
      'Sem Previsão': reportData.reduce((sum, r) => sum + r['Sem Previsão (h)'], 0),
      'Transbordo - Troca Cavalo': reportData.reduce((sum, r) => sum + r['Transbordo - Troca Cavalo (h)'], 0),
      'Transbordo em Andamento': reportData.reduce((sum, r) => sum + r['Transbordo em Andamento (h)'], 0),
      'Transbordo Finalizado': reportData.reduce((sum, r) => sum + r['Transbordo Finalizado (h)'], 0),
      'Reinício de Viagem': reportData.reduce((sum, r) => sum + r['Reinício de Viagem (h)'], 0),
      'Finalizado': reportData.reduce((sum, r) => sum + r['Finalizado (h)'], 0)
    };

    const summaryData = [
      { 'Métrica': 'Total de Registros', 'Valor': totalRecords, 'Unidade': 'registros' },
      { 'Métrica': 'Tempo Total de Processos', 'Valor': totalHours.toFixed(2), 'Unidade': 'horas' },
      { 'Métrica': 'Tempo Médio por Processo', 'Valor': averageHours.toFixed(2), 'Unidade': 'horas' },
      { 'Métrica': 'Total de Mudanças de Status', 'Valor': totalChanges, 'Unidade': 'mudanças' },
      { 'Métrica': 'Média de Mudanças por Processo', 'Valor': averageChanges.toFixed(1), 'Unidade': 'mudanças' },
      { 'Métrica': '', 'Valor': '', 'Unidade': '' }, // Linha em branco
      { 'Métrica': 'TEMPO POR STATUS:', 'Valor': '', 'Unidade': '' },
      ...Object.entries(statusTotals).map(([status, hours]) => ({
        'Métrica': status,
        'Valor': hours.toFixed(2),
        'Unidade': 'horas'
      }))
    ];

    return summaryData;
  }

  /**
   * Calcula horas básicas quando não há dados de análise
   */
  private static calculateBasicHours(record: LogisticsRecord): number {
    const startTime = new Date(record.created_at);
    const endTime = record.status === 'finalizado' || record.status === 'resolvido' 
      ? new Date(record.updated_at) 
      : new Date();
    
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Obtém label amigável do status
   */
  private static getStatusLabel(status: string): string {
    const config = STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS];
    return config ? config.label : status.replace(/_/g, ' ').toUpperCase();
  }

  /**
   * Gera relatório filtrado por período
   */
  static async generatePeriodReport(
    records: LogisticsRecord[], 
    startDate: Date, 
    endDate: Date
  ): Promise<void> {
    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.created_at);
      return recordDate >= startDate && recordDate <= endDate;
    });

    if (filteredRecords.length === 0) {
      throw new Error('Nenhum registro encontrado no período selecionado');
    }

    await this.generateCompleteReport(filteredRecords);
  }

  /**
   * Gera relatório por status específico
   */
  static async generateStatusReport(
    records: LogisticsRecord[], 
    targetStatus: string
  ): Promise<void> {
    const filteredRecords = records.filter(record => record.status === targetStatus);

    if (filteredRecords.length === 0) {
      throw new Error(`Nenhum registro encontrado com status "${targetStatus}"`);
    }

    await this.generateCompleteReport(filteredRecords);
  }

  /**
   * Gera relatório de performance (apenas registros finalizados)
   */
  static async generatePerformanceReport(records: LogisticsRecord[]): Promise<void> {
    const completedRecords = records.filter(record => 
      record.status === 'finalizado' || record.status === 'resolvido'
    );

    if (completedRecords.length === 0) {
      throw new Error('Nenhum registro finalizado encontrado para análise de performance');
    }

    await this.generateCompleteReport(completedRecords);
  }
}