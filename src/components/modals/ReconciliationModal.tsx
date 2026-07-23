import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { 
  X, 
  Calculator, 
  ArrowsCounterClockwise as RefreshCw, 
  WarningCircle as AlertCircle, 
  CheckCircle as CheckCircle2, 
  Trash as Trash2,
  MagnifyingGlass,
  FileArrowUp,
  Checks,
  PlusCircle,
  Question,
  User,
  Warning
} from '@phosphor-icons/react';
import { formatCurrency } from '../../utils/masks';
import { Agreement, AgreementStatus, AgreementOrigin, AgreementType, AgreementCategory } from '../../types';
import { CustomConfirm } from '../ui/CustomConfirm';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackerValue: number;
  trackerProjected: number;
  currentOfficialValue: number;
  currentOfficialEffectiveness: number;
  onSave: (officialValue: number | null, officialEffectiveness: number | null) => void;
  onClear: () => void;
  adjustments: any[];
  onDeleteAdjustment: (id: string) => Promise<void>;
  monthAgreements: Agreement[];
  onUpdateAgreementStatus: (agreementId: string, status: AgreementStatus, optionalData?: Partial<Agreement>) => Promise<void>;
  onCreateAgreement: (agreementData: Omit<Agreement, 'id' | 'operatorId' | 'teamId' | 'organizationId' | 'createdAt'>) => Promise<void>;
}

interface ExcelRow {
  cpf: string;
  value: number;
  status: string;
}

const formatCpfMask = (v: string) => {
  const digits = v.replace(/[^\d]/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
  return v;
};

export const ReconciliationModal = ({
  isOpen,
  onClose,
  trackerValue,
  trackerProjected,
  currentOfficialValue,
  currentOfficialEffectiveness,
  onSave,
  onClear,
  adjustments,
  onDeleteAdjustment,
  monthAgreements,
  onUpdateAgreementStatus,
  onCreateAgreement
}: ReconciliationModalProps) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'spreadsheet'>('manual');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Tab 1 States
  const [inputValue, setInputValue] = useState('');
  const [inputEffectiveness, setInputEffectiveness] = useState('');
  const [difference, setDifference] = useState(0);
  const [differenceEffectiveness, setDifferenceEffectiveness] = useState(0);
  const [cpfSearchQuery, setCpfSearchQuery] = useState('');

  // Tab 2 States
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (currentOfficialValue) {
        setInputValue((currentOfficialValue * 100).toFixed(0));
      } else {
        setInputValue((trackerValue * 100).toFixed(0));
      }
      
      if (currentOfficialEffectiveness) {
        setInputEffectiveness(currentOfficialEffectiveness.toString());
      } else {
        setInputEffectiveness('');
      }
      // Reset search/files states
      setCpfSearchQuery('');
      setFileName('');
      setDiscrepancies([]);
    }
  }, [isOpen, currentOfficialValue, currentOfficialEffectiveness, trackerValue]);

  useEffect(() => {
    const official = parseFloat(inputValue.replace(/[^\d]/g, '')) / 100 || 0;
    setDifference(official - trackerValue);
  }, [inputValue, trackerValue]);

  useEffect(() => {
    const trackerEff = trackerProjected > 0 ? (trackerValue / trackerProjected) * 100 : 0;
    const officialEff = parseFloat(inputEffectiveness.replace(',', '.')) || 0;
    setDifferenceEffectiveness(officialEff - trackerEff);
  }, [inputEffectiveness, trackerValue, trackerProjected]);

  // CPF Search memo
  const searchedAgreements = useMemo(() => {
    const query = cpfSearchQuery.replace(/[^\d]/g, '');
    if (query.length < 3) return [];
    return monthAgreements.filter(a => 
      !a.isAdjustment && 
      (a.clientCpf || '').replace(/[^\d]/g, '').includes(query)
    );
  }, [monthAgreements, cpfSearchQuery]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value === '') {
      setInputValue('');
      return;
    }
    setInputValue(value);
  };

  const handleEffectivenessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d.,]/g, '');
    setInputEffectiveness(value);
  };

  const formattedInput = () => {
    if (inputValue === '') return 'R$ 0,00';
    const val = parseFloat(inputValue) / 100;
    return formatCurrency(val);
  };

  const handleSave = () => {
    const official = inputValue !== '' ? (parseFloat(inputValue) / 100 || 0) : null;
    const officialEff = inputEffectiveness !== '' ? (parseFloat(inputEffectiveness.replace(',', '.')) || 0) : null;
    onSave(official, officialEff);
    onClose();
  };

  // Excel / CSV Parser
  const parseExcelFile = async (file: File): Promise<ExcelRow[]> => {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.split(','));
      if (lines.length < 2) return [];
      
      const headers = lines[0].map(h => h.trim().toLowerCase());
      const cpfIndex = headers.findIndex(h => h.includes('cpf') || h.includes('doc'));
      const valueIndex = headers.findIndex(h => h.includes('valor') || h.includes('pago') || h.includes('recebido') || h.includes('value'));
      const statusIndex = headers.findIndex(h => h.includes('status') || h.includes('situacao') || h.includes('pago') || h.includes('state'));
      
      const result: ExcelRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i];
        if (cells.length < Math.max(cpfIndex, valueIndex) + 1) continue;
        
        const rawCpf = cpfIndex !== -1 ? cells[cpfIndex].replace(/[^\d]/g, '') : '';
        if (!rawCpf) continue;
        
        const rawValue = valueIndex !== -1 ? parseFloat(cells[valueIndex].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
        let rawStatus = 'waiting';
        if (statusIndex !== -1) {
          const val = cells[statusIndex].trim().toLowerCase();
          if (val.includes('pago') || val.includes('recebido') || val.includes('sim') || val.includes('yes') || val.includes('liquidado')) {
            rawStatus = 'pago';
          } else if (val.includes('quebrado') || val.includes('nao') || val.includes('cancelado') || val.includes('vencido')) {
            rawStatus = 'broken';
          }
        } else {
          rawStatus = rawValue > 0 ? 'pago' : 'waiting';
        }
        
        result.push({ cpf: rawCpf, value: rawValue, status: rawStatus });
      }
      return result;
    }
    
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
    if (!worksheet) return [];
    
    const result: ExcelRow[] = [];
    let cpfCol = -1;
    let valueCol = -1;
    let statusCol = -1;
    
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const text = cell.text.trim().toLowerCase();
      if (text.includes('cpf') || text.includes('doc')) {
        cpfCol = colNumber;
      } else if (text.includes('valor') || text.includes('pago') || text.includes('recebido') || text.includes('value') || text.includes('monto')) {
        cpfCol = colNumber; // Fallback assignment safety
        valueCol = colNumber;
      } else if (text.includes('status') || text.includes('situac') || text.includes('pago') || text.includes('estado')) {
        statusCol = colNumber;
      }
    });
    
    // Fallback columns
    if (cpfCol === -1) cpfCol = 1;
    if (valueCol === -1) valueCol = 2;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const cpfVal = row.getCell(cpfCol).text || '';
      const cpf = cpfVal.replace(/[^\d]/g, '');
      if (!cpf) return;
      
      const valueRaw = row.getCell(valueCol).value;
      let value = 0;
      if (typeof valueRaw === 'number') {
        value = valueRaw;
      } else if (typeof valueRaw === 'string') {
        value = parseFloat(valueRaw.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      } else if (valueRaw && typeof valueRaw === 'object' && 'result' in valueRaw) {
        value = Number((valueRaw as any).result) || 0;
      }
      
      let status = 'waiting';
      if (statusCol !== -1) {
        const statusText = (row.getCell(statusCol).text || '').trim().toLowerCase();
        if (statusText.includes('pago') || statusText.includes('recebido') || statusText.includes('sim') || statusText.includes('yes') || statusText.includes('liquidado') || statusText.includes('paid')) {
          status = 'pago';
        } else if (statusText.includes('quebrado') || statusText.includes('nao') || statusText.includes('cancelado') || statusText.includes('vencido') || statusText.includes('broken')) {
          status = 'broken';
        }
      } else {
        status = value > 0 ? 'pago' : 'waiting';
      }
      
      result.push({ cpf, value, status });
    });
    
    return result;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsProcessingFile(true);
    setDiscrepancies([]);
    
    try {
      const sheetRows = await parseExcelFile(file);
      const foundDiscrepancies: any[] = [];
      
      sheetRows.forEach(row => {
        const cleanCpf = row.cpf;
        const trackerAgreements = monthAgreements.filter(a => 
          !a.isAdjustment && 
          (a.clientCpf || '').replace(/[^\d]/g, '') === cleanCpf
        );
        
        if (trackerAgreements.length === 0) {
          if (row.status === 'pago') {
            foundDiscrepancies.push({
              type: 'missing_in_tracker',
              cpf: cleanCpf,
              excelValue: row.value,
              excelStatus: 'pago',
              trackerValue: 0,
              trackerStatus: 'N/A',
              agreement: null
            });
          }
        } else {
          trackerAgreements.forEach(ta => {
            const statusMatch = (ta.status === AgreementStatus.PAID && row.status === 'pago') || 
                                (ta.status !== AgreementStatus.PAID && row.status !== 'pago');
            const valueMatch = Math.abs(ta.value - row.value) < 0.01;
            
            if (!statusMatch) {
              foundDiscrepancies.push({
                type: 'status_mismatch',
                cpf: cleanCpf,
                excelValue: row.value,
                excelStatus: row.status,
                trackerValue: ta.value,
                trackerStatus: ta.status === AgreementStatus.PAID ? 'pago' : 'aguardando',
                agreement: ta
              });
            } else if (!valueMatch) {
              foundDiscrepancies.push({
                type: 'value_mismatch',
                cpf: cleanCpf,
                excelValue: row.value,
                excelStatus: row.status,
                trackerValue: ta.value,
                trackerStatus: ta.status === AgreementStatus.PAID ? 'pago' : 'aguardando',
                agreement: ta
              });
            }
          });
        }
      });
      
      setDiscrepancies(foundDiscrepancies);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleUpdateStatusDirectly = async (id: string, status: AgreementStatus) => {
    try {
      await onUpdateAgreementStatus(id, status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAgreementDirectly = async (cpf: string, value: number) => {
    try {
      await onCreateAgreement({
        clientName: `Acordo Conciliado (${cpf.substring(0,3)}***)`,
        clientCpf: formatCpfMask(cpf),
        value: value,
        dueDate: new Date().toISOString().split('T')[0],
        status: AgreementStatus.PAID,
        origin: AgreementOrigin.QUITE_DIGITAL,
        type: AgreementType.QUITACAO,
        category: AgreementCategory.FIXA
      });
      setDiscrepancies(prev => prev.filter(d => d.cpf !== cpf));
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkFixStatus = async () => {
    const statusMismatches = discrepancies.filter(d => d.type === 'status_mismatch' && d.agreement);
    if (statusMismatches.length === 0) return;
    
    try {
      await Promise.all(
        statusMismatches.map(d => {
          const newStatus = d.excelStatus === 'pago' ? AgreementStatus.PAID : AgreementStatus.WAITING;
          return onUpdateAgreementStatus(d.agreement.id, newStatus);
        })
      );
      setDiscrepancies(prev => prev.filter(d => d.type !== 'status_mismatch'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkImportMissing = async () => {
    const missing = discrepancies.filter(d => d.type === 'missing_in_tracker');
    if (missing.length === 0) return;
    
    try {
      await Promise.all(
        missing.map(d =>
          onCreateAgreement({
            clientName: `Acordo Conciliado (${d.cpf.substring(0,3)}***)`,
            clientCpf: formatCpfMask(d.cpf),
            value: d.excelValue,
            dueDate: new Date().toISOString().split('T')[0],
            status: AgreementStatus.PAID,
            origin: AgreementOrigin.QUITE_DIGITAL,
            type: AgreementType.QUITACAO,
            category: AgreementCategory.FIXA
          })
        )
      );
      setDiscrepancies(prev => prev.filter(d => d.type !== 'missing_in_tracker'));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const trackerEffectiveness = trackerProjected > 0 ? (trackerValue / trackerProjected) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 border border-slate-800 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] text-white"
      >
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-xl">
              <Calculator size={20} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Conciliar Resultados</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Saldo, Efetividade & Planilhas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/5 bg-slate-950/40 px-8 pt-4 shrink-0 gap-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'manual' 
                ? 'border-sky-500 text-sky-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            1. Manual & Busca CPF
          </button>
          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'spreadsheet' 
                ? 'border-sky-500 text-sky-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            2. Conciliar Planilha (Excel)
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 flex-1">
          {activeTab === 'manual' ? (
            /* TAB 1: MANUAL & CPF SEARCH */
            <div className="space-y-6">
              {/* SEÇÃO 1: CONCILIAÇÃO DE SALDO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-3 bg-sky-500 rounded-full"></span>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Conciliação de Saldo (R$)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Meu Tracker</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(trackerValue)}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Diferença</p>
                    <p className={`text-lg font-bold ${difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valor Recebido Oficial (Teams) *</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                    <input 
                      type="text" 
                      value={formattedInput().replace('R$', '').trim()}
                      onChange={handleValueChange}
                      placeholder="0,00"
                      className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white text-xl font-bold backdrop-blur-sm"
                    />
                  </div>
                  {currentOfficialValue > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: "Apagar Saldo Conciliado",
                          message: "Deseja realmente apagar o saldo conciliado? Isso também excluirá todos os acordos de ajuste vinculados.",
                          type: 'danger',
                          onConfirm: () => {
                            onSave(null, currentOfficialEffectiveness || null);
                            onClose();
                          }
                        });
                      }}
                      className="w-full mt-2 py-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 font-bold rounded-xl border border-rose-500/20 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Trash2 size={12} />
                      Apagar Saldo Conciliado
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {difference !== 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3">
                      <AlertCircle className="text-rose-400 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-bold text-rose-200">Divergência de Saldo Detectada</p>
                        <p className="text-[10px] text-rose-300/80 mt-0.5">O valor do Tracker está diferente do oficial. Salve os dados de fechamento para registrar a conciliação de caixa.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                {difference === 0 && inputValue !== '' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3">
                      <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-bold text-emerald-200">Saldo Sincronizado</p>
                        <p className="text-[10px] text-emerald-300/80 mt-0.5">Os valores de saldo estão batendo perfeitamente. Ótimo trabalho de registro!</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SEÇÃO 2: CONCILIAÇÃO DE EFETIVIDADE */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Conciliação de Efetividade (%)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Efetividade Tracker</p>
                    <p className="text-lg font-bold text-white">{trackerEffectiveness.toFixed(1)}%</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Diferença</p>
                    <p className={`text-lg font-bold ${differenceEffectiveness === 0 ? 'text-emerald-400' : (differenceEffectiveness > 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                      {differenceEffectiveness > 0 ? '+' : ''}{differenceEffectiveness.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Efetividade Oficial (Teams) *</label>
                  <div className="relative group">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                    <input 
                      type="text" 
                      value={inputEffectiveness}
                      onChange={handleEffectivenessChange}
                      placeholder="0.0"
                      className="w-full bg-white/5 border border-white/10 pl-4 pr-10 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white text-xl font-bold backdrop-blur-sm"
                    />
                  </div>
                  {currentOfficialEffectiveness > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: "Apagar Efetividade Conciliada",
                          message: "Deseja realmente apagar a efetividade oficial conciliada?",
                          type: 'danger',
                          onConfirm: () => {
                            onSave(currentOfficialValue || null, null);
                            onClose();
                          }
                        });
                      }}
                      className="w-full mt-2 py-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 font-bold rounded-xl border border-rose-500/20 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Trash2 size={12} />
                      Apagar Efetividade Conciliada
                    </button>
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: BUSCA RÁPIDA DE CLIENTE (CPF) */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Auditar Acordo por CPF
                  </h3>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Digite o CPF do cliente..."
                    value={cpfSearchQuery}
                    onChange={(e) => setCpfSearchQuery(formatCpfMask(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-xs text-white"
                  />
                  <div className="absolute left-3 top-3.5 text-slate-500">
                    <MagnifyingGlass size={16} />
                  </div>
                </div>

                {searchedAgreements.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {searchedAgreements.map(a => (
                      <div key={a.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <User size={12} className="text-slate-400" />
                            {a.clientName}
                          </p>
                          <p className="text-[10px] text-slate-400">CPF: {a.clientCpf} | Valor: {formatCurrency(a.value)}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateStatusDirectly(a.id, AgreementStatus.PAID)}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                              a.status === AgreementStatus.PAID 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            Pago
                          </button>
                          <button
                            onClick={() => handleUpdateStatusDirectly(a.id, AgreementStatus.WAITING)}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                              a.status === AgreementStatus.WAITING 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            Pendente
                          </button>
                          <button
                            onClick={() => handleUpdateStatusDirectly(a.id, AgreementStatus.BROKEN)}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                              a.status === AgreementStatus.BROKEN 
                                ? 'bg-rose-500 text-white' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            Quebrado
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {cpfSearchQuery.replace(/[^\d]/g, '').length >= 3 && searchedAgreements.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">Nenhum acordo com esse CPF encontrado.</p>
                )}
              </div>

              {(currentOfficialValue > 0 || currentOfficialEffectiveness > 0) && (
                <button 
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: "Apagar Ambas as Conciliações",
                      message: "Tem certeza que deseja apagar ambas as conciliações salvas? Isso também removerá todos os ajustes automáticos gerados.",
                      type: 'danger',
                      onConfirm: () => {
                        onClear();
                        onClose();
                      }
                    });
                  }}
                  className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 font-bold rounded-xl border border-rose-500/20 transition-all text-xs flex items-center justify-center gap-2 mb-2"
                >
                  Apagar Tudo (Limpar Conciliações)
                </button>
              )}

              <div className="pt-2">
                <button 
                  onClick={handleSave}
                  className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-500/10 text-xs cursor-pointer"
                >
                  Salvar Dados de Conciliação
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: SPREADSHEET CONCILIATION */
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-3 bg-sky-500 rounded-full"></span>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Conciliação Inteligente por Planilha (Excel / CSV)
                </h3>
              </div>

              {/* UPLOAD BOX */}
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-sky-500/40 transition-colors relative">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessingFile}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileArrowUp size={32} className="text-slate-500" />
                  {fileName ? (
                    <div>
                      <p className="text-xs font-bold text-white">{fileName}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Clique ou arraste outro arquivo para substituir</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-300">Selecione a planilha da empresa/assessoria</p>
                      <p className="text-[10px] text-slate-500 mt-1">Suporta arquivos Excel (.xlsx, .xls) e CSV</p>
                    </div>
                  )}
                </div>
              </div>

              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <RefreshCw size={18} className="animate-spin text-sky-400" />
                  <span className="text-xs text-slate-400">Cruzando dados da planilha com o seu Tracker...</span>
                </div>
              )}

              {/* DISCREPANCIES LIST */}
              {!isProcessingFile && discrepancies.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Encontradas {discrepancies.length} divergências</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBulkFixStatus}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded text-[9px] uppercase transition-all flex items-center gap-1"
                      >
                        <Checks size={10} />
                        Corrigir Status
                      </button>
                      <button
                        onClick={handleBulkImportMissing}
                        className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded text-[9px] uppercase transition-all flex items-center gap-1"
                      >
                        <PlusCircle size={10} />
                        Importar Ausentes
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {discrepancies.map((d, index) => (
                      <div key={index} className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between text-xs transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              d.type === 'missing_in_tracker' 
                                ? 'bg-sky-500' 
                                : d.type === 'status_mismatch'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}></span>
                            <span className="font-bold text-white">CPF: {d.cpf.substring(0,3)}***{d.cpf.substring(d.cpf.length - 2)}</span>
                          </div>
                          
                          <p className="text-[10px] text-slate-400">
                            {d.type === 'missing_in_tracker' && 'Pago na planilha oficial, mas não cadastrado no seu Tracker.'}
                            {d.type === 'status_mismatch' && `Tracker diz: "${d.trackerStatus}" | Planilha Oficial diz: "${d.excelStatus}".`}
                            {d.type === 'value_mismatch' && `Tracker: ${formatCurrency(d.trackerValue)} | Oficial: ${formatCurrency(d.excelValue)}.`}
                          </p>
                        </div>

                        <div>
                          {d.type === 'missing_in_tracker' && (
                            <button
                              onClick={() => handleCreateAgreementDirectly(d.cpf, d.excelValue)}
                              className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white rounded font-bold uppercase transition-all text-[9px] flex items-center gap-1 border border-sky-500/20"
                            >
                              <PlusCircle size={10} />
                              Importar
                            </button>
                          )}
                          {d.type === 'status_mismatch' && (
                            <button
                              onClick={() => handleUpdateStatusDirectly(d.agreement.id, d.excelStatus === 'pago' ? AgreementStatus.PAID : AgreementStatus.WAITING)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded font-bold uppercase transition-all text-[9px] flex items-center gap-1 border border-emerald-500/20"
                            >
                              <Checks size={10} />
                              Corrigir
                            </button>
                          )}
                          {d.type === 'value_mismatch' && (
                            <span className="p-1 text-[9px] font-bold text-rose-400 uppercase bg-rose-500/10 rounded flex items-center gap-1 border border-rose-500/20">
                              <Warning size={10} />
                              Retificar
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isProcessingFile && fileName && discrepancies.length === 0 && (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-emerald-200">Nenhuma divergência encontrada!</p>
                  <p className="text-[10px] text-emerald-400/80">Todos os CPFs e status da planilha oficial coincidem perfeitamente com os seus registros.</p>
                </div>
              )}
            </div>
          )}

          {/* Histórico de Ajustes Técnicos no Mês */}
          {activeTab === 'manual' && adjustments.length > 0 && (
            <div className="pt-6 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-sky-500/10 rounded-lg text-sky-400">
                  <RefreshCw size={12} className="animate-spin-slow" />
                </div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Ajustes de Saldo Realizados neste Mês
                </h3>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {adjustments.map((adj) => {
                  const dateStr = new Date(adj.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div key={adj.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl text-xs transition-all">
                      <div>
                        <span className="font-bold text-white block">{formatCurrency(adj.value)}</span>
                        <span className="text-[9px] text-slate-500 block font-semibold mt-0.5">{dateStr}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: "Excluir Ajuste de Saldo",
                            message: `Deseja realmente excluir este ajuste de saldo de ${formatCurrency(adj.value)}?`,
                            type: 'danger',
                            onConfirm: () => onDeleteAdjustment(adj.id)
                          });
                        }}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/10 hover:border-transparent active:scale-95"
                        title="Excluir Ajuste"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <CustomConfirm 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
