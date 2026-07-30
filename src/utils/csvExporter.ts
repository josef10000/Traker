/**
 * Utilitário Universal para Exportação de Planilhas CSV Formatadas
 * Compatível 100% com Microsoft Excel, LibreOffice e Numbers no Brasil.
 */

export interface ExportCsvOptions {
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Exporta uma matriz de dados para CSV formatado com separador ponto e vírgula (;) e acentuação UTF-8.
 */
export function exportToCsv({ filename, headers, rows }: ExportCsvOptions): void {
  // Função interna para escapar aspas e proteger células contra desalinhamento
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Montagem das linhas utilizando delimitador ';' (Padrão Excel Brasil)
  const headerRow = headers.map(escapeCell).join(';');
  const dataRows = rows.map(row => row.map(escapeCell).join(';'));
  
  // Instrução sep=; + BOM \uFEFF para forçar colunas corretas no Excel e acentuação perfeita
  const csvContent = '\uFEFFsep=;\n' + [headerRow, ...dataRows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
