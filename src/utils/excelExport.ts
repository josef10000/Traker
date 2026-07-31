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
  chartImages?: string[]; // Imagens base64 PNG dos gráficos da tela
}

// Mapa de tradução de Status para Português
const STATUS_PORTUGUESE_MAP: Record<string, string> = {
  broken: 'Quebrado',
  waiting: 'Aguardando',
  paid: 'Pago',
  recovered: 'Resgatado',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  treated: 'Tratado',
  ignored: 'Ignorado',
  has_notes: 'Com Anotações',
  invalid_cpf: 'CPF Inválido',
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
  success: 'Sucesso',
  error: 'Erro',
  failed: 'Falha',
  approved: 'Aprovado',
  reproved: 'Reprovado',
  under_review: 'Em Análise',
  pool: 'Fila Cega Geral',
  my_batch: 'Carteira Ativa'
};

export function formatExportStatus(status: any): string {
  if (status === undefined || status === null || status === '') return '-';
  const str = String(status).trim();
  const lower = str.toLowerCase();

  if (STATUS_PORTUGUESE_MAP[lower]) {
    return STATUS_PORTUGUESE_MAP[lower];
  }

  if (str.includes('_')) {
    return str
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return str;
}

/**
 * Formata datas com segurança sem gerar "Invalid Date"
 */
export function formatExportDate(val: any): string {
  if (val === undefined || val === null || val === '' || val === '-' || val === 'null' || val === 'undefined') {
    return '-';
  }

  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(val.trim())) {
    return val.trim();
  }

  let dateObj: Date | null = null;

  try {
    if (typeof val === 'object' && val !== null && typeof val.toDate === 'function') {
      dateObj = val.toDate();
    } else if (typeof val === 'object' && val !== null && typeof val.seconds === 'number') {
      dateObj = new Date(val.seconds * 1000);
    } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      const [year, month, day] = val.trim().split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else if (typeof val === 'number') {
      dateObj = new Date(val);
    } else {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
  } catch (e) {
    return '-';
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return '-';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata CPF / CNPJ de forma consistente (com ou sem máscara LGPD)
 * Formato sem máscara: 123.456.789-00 ou 12.345.678/0001-90
 * Formato com máscara: ***.456.***-00
 */
export function formatExportCpf(val: any, shouldMask: boolean): string {
  if (val === undefined || val === null || val === '' || val === '-' || val === 'null') {
    return '-';
  }
  const str = String(val).trim();

  if (str.includes('*')) {
    return str;
  }

  const digits = str.replace(/\D/g, '');

  if (digits.length === 11) {
    if (shouldMask) {
      return `***.${digits.slice(3, 6)}.***-${digits.slice(9, 11)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  if (digits.length === 14) {
    if (shouldMask) {
      return `**.${digits.slice(2, 5)}.***/${digits.slice(8, 12)}-**`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  }

  return str;
}

/**
 * Exportador Dinâmico em ExcelJS com suporte a Tabelas de Dados e Gráficos Incorporados
 */
export async function exportDynamicToExcel({
  filename,
  title = 'RELATÓRIO DE DADOS CORPORATIVOS - TRACKER',
  columns,
  data,
  maskCpf = false,
  chartImages = []
}: ExcelDynamicExportOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tracker SaaS';
  workbook.created = new Date();

  // Aba 1: Tabela de Dados Principais
  const dataSheet = workbook.addWorksheet('Dados Detalhados', {
    views: [{ showGridLines: true }]
  });

  // Cabeçalho da Empresa
  const colCount = Math.max(columns.length, 1);
  dataSheet.mergeCells(1, 1, 1, colCount);
  const titleCell = dataSheet.getCell(1, 1);
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  dataSheet.getRow(1).height = 32;

  // Linha de Cabeçalhos de Coluna
  const headerLabels = columns.map(c => c.label);
  const headerRow = dataSheet.addRow(headerLabels);
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

      const isCpfCol = col.type === 'cpf' || col.key.toLowerCase().includes('cpf');
      if (isCpfCol) {
        return formatExportCpf(rawVal, maskCpf);
      }

      const isDateCol = col.type === 'date' || col.key.toLowerCase().includes('data') || col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('createdat') || col.key.toLowerCase().includes('duedate');
      if (isDateCol) {
        return formatExportDate(rawVal);
      }

      const isStatusCol = col.key.toLowerCase().includes('status') || col.key.toLowerCase().includes('resultado');
      if (isStatusCol) {
        return formatExportStatus(rawVal);
      }

      if (rawVal === undefined || rawVal === null || rawVal === '') return '-';

      return rawVal;
    });

    const row = dataSheet.addRow(rowValues);
    row.height = 20;

    // Formatação de Células Específicas (Moedas BRL e Porcentagens)
    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      if (col.type === 'currency' || (typeof cell.value === 'number' && col.key.toLowerCase().includes('valor'))) {
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

  const totalRow = dataSheet.addRow(totalsRow);
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
  dataSheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 4, 40);
  });

  // Se houver imagens de gráficos capturadas da tela, criar a Aba de Gráficos Visual
  if (chartImages && chartImages.length > 0) {
    const chartSheet = workbook.addWorksheet('Painel de Gráficos', {
      views: [{ showGridLines: true }]
    });

    chartSheet.mergeCells('A1:H1');
    const chartTitle = chartSheet.getCell('A1');
    chartTitle.value = 'DASHBOARD VISUAL & ANALYTICS - TRACKER';
    chartTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    chartTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' } // Sky 600
    };
    chartTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    chartSheet.getRow(1).height = 35;

    let startRow = 3;
    chartImages.forEach((imgDataUri, idx) => {
      try {
        const base64Data = imgDataUri.replace(/^data:image\/(png|jpeg);base64,/, '');
        const imageId = workbook.addImage({
          base64: base64Data,
          extension: 'png'
        });

        chartSheet.addImage(imageId, {
          tl: { col: 0, row: startRow },
          ext: { width: 750, height: 360 }
        });

        startRow += 20; // Espaço de linhas para o próximo gráfico
      } catch (err) {
        console.error('Erro ao anexar gráfico no Excel:', err);
      }
    });
  }

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
