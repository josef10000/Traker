import ExcelJS from 'exceljs';
import { Agreement } from '../types';
import { formatCurrency, maskCPF } from './masks';

/**
 * Exportador de Relatórios para Excel de Alta Qualidade Corporativa usando ExcelJS
 * Aplica estilos, formatação nativa de moeda BRL, larguras automáticas e cabeçalhos destacados.
 */
export async function exportAgreementsToExcel(
  agreements: Agreement[], 
  filename: string = 'Relatorio_Acordos_Tracker.xlsx'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tracker SaaS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Relatório de Acordos', {
    views: [{ showGridLines: true }]
  });

  // Estilo do Cabeçalho da Empresa
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'RELATÓRIO CORPORATIVO DE ACORDOS - TRACKER';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Cabeçalhos de Coluna
  const headers = [
    'ID do Acordo',
    'Cliente / Devedor',
    'CPF / CNPJ',
    'Valor Original',
    'Valor Negociado',
    'Desconto (%)',
    'Status',
    'Data de Criação'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;

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
  let totalOriginal = 0;
  let totalUpdated = 0;

  agreements.forEach((ag) => {
    const orig = ag.originalValue || 0;
    const upd = ag.updatedValue || ag.originalValue || 0;
    const desc = orig > 0 ? ((orig - upd) / orig) * 100 : 0;

    totalOriginal += orig;
    totalUpdated += upd;

    const row = worksheet.addRow([
      ag.id || '-',
      ag.clientName || 'Não Informado',
      maskCPF(ag.clientCpf || ''),
      orig,
      upd,
      Number(desc.toFixed(1)),
      ag.status || 'PENDING',
      ag.createdAt ? new Date(ag.createdAt).toLocaleDateString('pt-BR') : '-'
    ]);

    row.height = 20;

    // Formatação das células numéricas e moedas
    const cellOrig = row.getCell(4);
    cellOrig.numFmt = '"R$"#,##0.00';
    cellOrig.alignment = { horizontal: 'right' };

    const cellUpd = row.getCell(5);
    cellUpd.numFmt = '"R$"#,##0.00';
    cellUpd.alignment = { horizontal: 'right' };

    const cellDesc = row.getCell(6);
    cellDesc.numFmt = '0.0"%"';
    cellDesc.alignment = { horizontal: 'right' };
  });

  // Linha de Totais
  const totalRow = worksheet.addRow([
    'TOTAL GERAL',
    '',
    '',
    totalOriginal,
    totalUpdated,
    '',
    `${agreements.length} registros`,
    ''
  ]);
  totalRow.height = 24;

  totalRow.eachCell((cell) => {
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
  });

  totalRow.getCell(4).numFmt = '"R$"#,##0.00';
  totalRow.getCell(5).numFmt = '"R$"#,##0.00';

  // Ajuste automático da largura das colunas
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 4, 35);
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
