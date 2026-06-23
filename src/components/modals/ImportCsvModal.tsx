import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, CircleNotch as Loader2, FileCsv as FileSpreadsheet } from '@phosphor-icons/react';
import { db } from '../../lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { AgreementStatus, AgreementOrigin, AgreementType, AgreementCategory, UserProfile } from '../../types';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  selectedTeamId: string;
  onImportSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface ParsedAgreement {
  clientName: string;
  clientCpf: string;
  value: number;
  dueDate: string;
  origin: string;
  type: string;
  status: string;
  errors: string[];
  isValid: boolean;
}

export const ImportCsvModal = ({ isOpen, onClose, profile, selectedTeamId, onImportSuccess, showToast }: ImportCsvModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAgreement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const results = parseCSV(text);
        setParsedData(results);
      } catch (err) {
        showToast('Erro ao processar o arquivo CSV.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (text: string): ParsedAgreement[] => {
    const lines = text.split(/\r?\n/);
    const results: ParsedAgreement[] = [];
    
    if (lines.length <= 1) return results;
    
    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';
    const headers = header.toLowerCase().split(separator).map(h => h.trim().replace(/"/g, ''));
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(separator).map(c => c.trim().replace(/"/g, ''));
      if (columns.length < 3) continue;
      
      const getVal = (idxName: string, pos: number) => {
        const idx = headers.indexOf(idxName);
        return idx !== -1 ? columns[idx] : columns[pos];
      };
      
      const clientName = getVal('nome', 0) || '';
      const clientCpf = getVal('cpf', 1) || '';
      const rawVal = getVal('valor', 2) || '0';
      const cleanVal = rawVal.replace(/\./g, '').replace(',', '.');
      const value = parseFloat(cleanVal) || 0;
      
      const rawDate = getVal('vencimento', 3) || getVal('data', 3) || '';
      let dueDate = '';
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else {
        dueDate = rawDate;
      }
      
      const origin = (getVal('origem', 4) || 'whatsapp').toLowerCase();
      const type = (getVal('tipo', 5) || 'quitacao').toLowerCase();
      const status = (getVal('status', 6) || 'waiting').toLowerCase();
      
      // Validações
      const errors: string[] = [];
      if (!clientName) errors.push('Nome é obrigatório');
      if (!clientCpf) errors.push('CPF é obrigatório');
      if (isNaN(value) || value <= 0) errors.push('Valor inválido');
      if (!dueDate || isNaN(Date.parse(dueDate))) errors.push('Vencimento inválido');
      
      // Mapeamento das origens válidas
      const validOrigins = Object.values(AgreementOrigin);
      const mappedOrigin = validOrigins.includes(origin as AgreementOrigin) ? origin : 'whatsapp';
      
      // Mapeamento dos tipos válidos
      const validTypes = Object.values(AgreementType);
      const mappedType = validTypes.includes(type as AgreementType) ? type : 'quitacao';

      // Mapeamento dos status válidos
      const validStatuses = Object.values(AgreementStatus);
      const mappedStatus = validStatuses.includes(status as AgreementStatus) ? status : 'waiting';

      results.push({
        clientName,
        clientCpf,
        value,
        dueDate,
        origin: mappedOrigin,
        type: mappedType,
        status: mappedStatus,
        errors,
        isValid: errors.length === 0
      });
    }
    return results;
  };

  const handleImport = async () => {
    const validAgreements = parsedData.filter(d => d.isValid);
    if (validAgreements.length === 0) {
      showToast('Nenhum acordo válido para importar.', 'error');
      return;
    }

    const targetTeamId = profile.teamId || (selectedTeamId !== 'all' ? selectedTeamId : null);
    if (!targetTeamId) {
      showToast('Nenhuma equipe selecionada para salvar os acordos.', 'error');
      return;
    }
    if (!profile.organizationId) {
      showToast('Organização não identificada.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      const now = new Date().toISOString();

      for (const item of validAgreements) {
        const agreementRef = doc(collection(db, 'agreements'));
        const agreementData = {
          id: agreementRef.id,
          clientName: item.clientName,
          clientCpf: item.clientCpf,
          value: item.value,
          dueDate: item.dueDate,
          status: item.status as AgreementStatus,
          origin: item.origin as AgreementOrigin,
          type: item.type as AgreementType,
          category: AgreementCategory.VARIAVEL, // Padrão
          operatorId: profile.uid,
          teamId: targetTeamId,
          organizationId: profile.organizationId,
          createdAt: now,
          paidAt: item.status === AgreementStatus.PAID ? now : null
        };

        batch.set(agreementRef, agreementData);
        count++;

        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      showToast(`${validAgreements.length} acordos importados com sucesso!`, 'success');
      onImportSuccess();
      onClose();
      // Limpa estado
      setFile(null);
      setParsedData([]);
    } catch (err) {
      console.error(err);
      showToast('Erro ao importar acordos.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const totalValid = parsedData.filter(d => d.isValid).length;
  const totalErrors = parsedData.filter(d => !d.isValid).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-sky-500/20 to-sky-400/10 rounded-2xl border border-sky-500/30 text-sky-400">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-none">Importar Acordos (Lote)</h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Suporta arquivos CSV delimitados por vírgula ou ponto e vírgula</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-8 overflow-y-auto space-y-6 flex-1">
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-sky-500/30 bg-slate-950/20 hover:bg-sky-500/5 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden" 
                />
                <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-white group-hover:text-sky-400 transition-colors">Selecione ou arraste seu arquivo CSV</p>
                  <p className="text-xs text-slate-500 mt-1">Colunas recomendadas: Nome, CPF, Valor, Vencimento</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-950/30 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={20} className="text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                      <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setFile(null);
                      setParsedData([]);
                    }}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Remover
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="animate-spin text-sky-500" size={32} />
                    <p className="text-xs text-slate-400">Processando planilha...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Resumo de Validação */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-400" size={20} />
                        <div>
                          <span className="text-xs text-slate-400 block font-semibold">Registros Válidos</span>
                          <span className="text-lg font-black text-emerald-400">{totalValid}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="text-rose-400" size={20} />
                        <div>
                          <span className="text-xs text-slate-400 block font-semibold">Com Erros (Ignorados)</span>
                          <span className="text-lg font-black text-rose-400">{totalErrors}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preview da Tabela */}
                    {parsedData.length > 0 && (
                      <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold">
                              <th className="p-3">Nome</th>
                              <th className="p-3">CPF</th>
                              <th className="p-3">Valor</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Erros / Validação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 text-slate-300">
                            {parsedData.map((row, idx) => (
                              <tr key={idx} className={row.isValid ? 'bg-slate-950/10' : 'bg-rose-500/5'}>
                                <td className="p-3 truncate max-w-[120px] font-semibold text-white">{row.clientName}</td>
                                <td className="p-3 font-mono">{row.clientCpf}</td>
                                <td className="p-3 font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.value)}</td>
                                <td className="p-3 uppercase font-bold text-[10px]">{row.status}</td>
                                <td className="p-3">
                                  {row.isValid ? (
                                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">Válido</span>
                                  ) : (
                                    <span className="text-rose-400 font-semibold">{row.errors.join(', ')}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl flex gap-4 shrink-0">
            <button 
              onClick={onClose}
              disabled={isImporting}
              className="flex-1 px-5 py-4 rounded-xl border border-slate-800 font-bold text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              disabled={isImporting || !file || totalValid === 0}
              className="flex-1 px-5 py-4 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:hover:bg-sky-500 flex items-center justify-center gap-2"
            >
              {isImporting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              Confirmar Importação ({totalValid})
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
