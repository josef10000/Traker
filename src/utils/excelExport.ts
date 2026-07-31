import ExcelJS from 'exceljs';
import { Agreement } from '../types';
import { formatCurrency, maskCPF } from './masks';

export interface ExcelExportColumn {
  key: string;
  label: string;
  type?: 'text' | 'currency' | 'date' | 'cpf' | 'number' | 'percentage';
}

export interface ExcelDynamicExportOptions {
  filename: string;
  title?: string;
  columns: ExcelExportColumn[];
  data: Record<string, any>[];
  maskCpf?: boolean;
}

/**
 * Exportador Dinâmico em ExcelJS (Respeita exatamente as colunas e dados da aba atual)
 */
export async function exportDynamicToExcel({
  filename,
  title = 'RELATÓRIO DE DADOS CORPORATIVOS - TRACKER',
  columns,
  data,
  maskCpf = false
}: ExcelDynamicExportOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tracker SaaS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Relatório', {
    views: [{ showGridLines: true }]
  });

  // Cabeçalho da Empresa
  const colCount = Math.max(columns.length, 1);
  worksheet.mergeCells(1, 1, 1, colCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 32;

  // Linha de Cabeçalhos de Coluna
  const headerLabels = columns.map(c => c.label);
  const headerRow = worksheet.addRow(headerLabels);
  headerRow.height = 25;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' } // Sky 600
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0369A1' } }
    };
  });

  // Linhas de Dados
  data.forEach((item) => {
    const rowValues = columns.map((col) => {
      let rawVal = item[col.key];

      if (rawVal === undefined || rawVal === null) return '-';

      // Tratamento de CPF / CNPJ conforme preferência do usuário (Completo vs Mascarado)
      if (col.type === 'cpf' || col.key.toLowerCase().includes('cpf')) {
        const strVal = String(rawVal);
        return maskCpf ? maskCPF(strVal) : strVal;
      }

      if (col.type === 'date') {
        try {
          return new Date(rawVal).toLocaleDateString('pt-BR');
        } catch {
          return String(rawVal);
        }
      }

      return rawVal;
    });

    const row = worksheet.addRow(rowValues);
    row.height = 20;

    // Formatação de Células Específicas (Moedas BRL e Porcentagens)
    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      if (col.type === 'currency' || typeof cell.value === 'number' && col.key.toLowerCase().includes('valor')) {
        cell.numFmt = '"R$"#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (col.type === 'percentage') {
        cell.numFmt = '0.0"%"';
        cell.alignment = { horizontal: 'right' };
      } else if (col.type === 'number') {
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  // Linha de Totais para Colunas Numéricas/Moeda
  const totalsRow: (string | number)[] = columns.map((col, idx) => {
    if (idx === 0) return 'TOTAL GERAL';
    if (col.type === 'currency' || col.key.toLowerCase().includes('valor')) {
      const sum = data.reduce((acc, curr) => acc + (Number(curr[col.key]) || 0), 0);
      return sum;
    }
    if (idx === columns.length - 1) return `${data.length} registros`;
    return '';
  });

  const totalRow = worksheet.addRow(totalsRow);
  totalRow.height = 24;
  totalRow.eachCell((cell, colIdx) => {
    const colDef = columns[colIdx - 1];
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' } // Slate 200
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }
    };
    if (colDef && (colDef.type === 'currency' || colDef.key.toLowerCase().includes('valor'))) {
      cell.numFmt = '"R$"#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
  });

  // Ajuste automático da largura das colunas
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 4, 40);
  });

  // Fazer download do arquivo no navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Exportador legado mantido para compatibilidade
 */
export async function exportAgreementsToExcel(
  agreements: Agreement[], 
  filename: string = 'Relatorio_Acordos_Tracker.xlsx'
) {
  const columns: ExcelExportColumn[] = [
    { key: 'id', label: 'ID do Acordo', type: 'text' },
    { key: 'clientName', label: 'Cliente / Devedor', type: 'text' },
    { key: 'clientCpf', label: 'CPF / CNPJ', type: 'cpf' },
    { key: 'value', label: 'Valor do Acordo (R$)', type: 'currency' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'createdAt', label: 'Data de Criação', type: 'date' }
  ];

  return exportDynamicToExcel({
    filename,
    title: 'RELATÓRIO CORPORATIVO DE ACORDOS - TRACKER',
    columns,
    data: agreements,
    maskCpf: false
  });
}
