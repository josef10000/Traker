import React, { useState, useMemo } from 'react';
import { X, FileCsv as FileSpreadsheet, Check, SlidersHorizontal, DownloadSimple, ShieldCheck, ChartPie, LockLaminated } from '@phosphor-icons/react';
import { exportDynamicToExcel, ExcelExportColumn } from '../../utils/excelExport';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultFilename: string;
  availableColumns: ExcelExportColumn[];
  data: Record<string, any>[];
  onGetChartImages?: () => Promise<string[]>; // Função para capturar gráficos da tela
  forceCpfMasked?: boolean; // Forçar CPF oculto por regras de segurança/negócio
  cpfMaskReason?: string; // Motivo da restrição
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  title,
  defaultFilename,
  availableColumns,
  data,
  onGetChartImages,
  forceCpfMasked = false,
  cpfMaskReason,
  showToast,
  theme = 'dark'
}) => {
  const [filename, setFilename] = useState(defaultFilename);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    availableColumns.map(c => c.key)
  );
  const [maskCpf, setMaskCpf] = useState(forceCpfMasked || false);
  const [includeCharts, setIncludeCharts] = useState(!!onGetChartImages);
  const [isExporting, setIsExporting] = useState(false);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    setSelectedColumnKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelectedColumnKeys(availableColumns.map(c => c.key));
  };

  const deselectAll = () => {
    setSelectedColumnKeys([]);
  };

  const handleExport = async () => {
    if (selectedColumnKeys.length === 0) {
      showToast('Selecione pelo menos uma coluna para exportar.', 'warning');
      return;
    }

    setIsExporting(true);
    try {
      let chartImages: string[] = [];
      if (includeCharts && onGetChartImages) {
        chartImages = await onGetChartImages();
      }

      const activeColumns = availableColumns.filter(c => selectedColumnKeys.includes(c.key));
      await exportDynamicToExcel({
        filename: filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
        title,
        columns: activeColumns,
        data,
        maskCpf,
        chartImages
      });
      showToast('Planilha Excel de alta precisão gerada com sucesso!', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Erro ao gerar a planilha Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-xl rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider">
                Configurar Exportação em Excel (ExcelJS)
              </h3>
              <p className="text-xs text-slate-400">
                Personalize as colunas, gráficos visuais, máscara de CPF e nome do relatório
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Nome do Arquivo */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Nome do Arquivo (.xlsx)
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Opção de Incluir Gráficos da Tela (Se houver gráficos) */}
          {onGetChartImages && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              isDark ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <ChartPie size={20} className={includeCharts ? 'text-sky-400' : 'text-slate-500'} />
                <div>
                  <span className="text-xs font-bold block">Incorporar Gráficos Nativos na Planilha</span>
                  <span className="text-[11px] text-slate-400 block">
                    {includeCharts 
                      ? 'Cria uma aba no Excel contendo as imagens dos gráficos do ApexCharts' 
                      : 'Exporta apenas a tabela de dados brutos'}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIncludeCharts(!includeCharts)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  includeCharts 
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {includeCharts ? 'Com Gráficos' : 'Apenas Tabela'}
              </button>
            </div>
          )}

          {/* Opção de Máscara de CPF */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            forceCpfMasked
              ? 'bg-amber-500/10 border-amber-500/30'
              : isDark ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              {forceCpfMasked ? (
                <LockLaminated size={20} className="text-amber-400 shrink-0" />
              ) : (
                <ShieldCheck size={20} className={maskCpf ? 'text-amber-400' : 'text-emerald-400'} />
              )}
              <div>
                <span className="text-xs font-bold block flex items-center gap-1.5">
                  Visibilidade do CPF / CNPJ
                  {forceCpfMasked && (
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Restrito a Operadores
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {forceCpfMasked 
                    ? (cpfMaskReason || 'Operadores só podem exportar o CPF completo após assumir o cliente no balcão de recuperação.')
                    : maskCpf 
                      ? 'CPF Mascarado para conformidade LGPD (Ex: ***.456.***-00)' 
                      : 'CPF Completo visível no relatório (Ex: 123.456.789-00)'}
                </span>
              </div>
            </div>
            
            <button
              type="button"
              disabled={forceCpfMasked}
              onClick={() => !forceCpfMasked && setMaskCpf(!maskCpf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                forceCpfMasked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 opacity-90 cursor-not-allowed'
                  : maskCpf 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-pointer' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-pointer'
              }`}
              title={forceCpfMasked ? (cpfMaskReason || 'Exportação com CPF restrita para clientes não assumidos') : ''}
            >
              {forceCpfMasked ? '🔒 Oculto (Segurança)' : maskCpf ? 'Oculto (LGPD)' : 'Completo (Visível)'}
            </button>
          </div>

          {/* Seleção de Colunas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal size={14} className="text-emerald-400" />
                <span>Colunas a Incluir ({selectedColumnKeys.length} de {availableColumns.length})</span>
              </label>

              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Marcar Todas
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-400 hover:underline"
                >
                  Desmarcar Todas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableColumns.map((col) => {
                const isSelected = selectedColumnKeys.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className={`p-2.5 rounded-xl text-left border flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? isDark 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold' 
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                        : isDark 
                          ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="truncate">{col.label}</span>
                    {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-950/40">
          <span className="text-[11px] font-mono text-slate-400">
            {data.length} registros selecionados
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || selectedColumnKeys.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <DownloadSimple size={16} />
              <span>{isExporting ? 'Exportando...' : 'Exportar Planilha'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
