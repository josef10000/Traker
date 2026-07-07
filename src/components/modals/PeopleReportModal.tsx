import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, CircleNotch as Loader2, Printer, Calendar as CalendarDays, Check, Warning as AlertTriangle, WarningCircle as AlertCircle, FileText } from '@phosphor-icons/react';
import { CollaborationNote, UserProfile } from '../../types';
import { getOrganizationNotesReport } from '../../lib/notes';

interface PeopleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  collaborators: UserProfile[];
}

export const PeopleReportModal = ({ 
  isOpen, 
  onClose, 
  orgId, 
  collaborators 
}: PeopleReportModalProps) => {
  const [notes, setNotes] = useState<CollaborationNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadReportData = async () => {
      if (!isOpen || !orgId) return;
      setIsLoading(true);
      try {
        const reportNotes = await getOrganizationNotesReport(orgId);
        setNotes(reportNotes);
      } catch (error) {
        console.error('Erro ao carregar relatório de notas:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadReportData();
  }, [isOpen, orgId]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('occurrences-modal-open');
    }
    return () => {
      document.body.classList.remove('occurrences-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrar notas com base no mês e ano selecionados
  const filteredNotes = notes.filter(note => {
    const noteDate = new Date(note.createdAt);
    return (
      noteDate.getUTCFullYear() === selectedYear &&
      (noteDate.getUTCMonth() + 1) === selectedMonth
    );
  });

  // Consolidar dados por colaborador
  const summaryByCollaborator = collaborators.map(collab => {
    const collabNotes = filteredNotes.filter(n => n.collaboratorId === collab.uid);
    
    const presents = collabNotes.filter(n => n.type === 'attendance' && n.attendanceStatus === 'present').length;
    const lates = collabNotes.filter(n => n.type === 'attendance' && n.attendanceStatus === 'late').length;
    const absents = collabNotes.filter(n => n.type === 'attendance' && n.attendanceStatus === 'absent').length;
    const feedbackCount = collabNotes.filter(n => n.type === 'note').length;

    return {
      uid: collab.uid,
      name: collab.displayName || collab.email.split('@')[0],
      email: collab.email,
      presents,
      lates,
      absents,
      feedbackCount,
      notesList: collabNotes.filter(n => n.type === 'note')
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const monthsList = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay - Oculto na impressão */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md no-print"
      />
      
      {/* Container do Modal */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-[90vh] print:h-auto print:w-full print:border-none print:shadow-none print:bg-white print:text-slate-950 print:relative print:overflow-visible"
      >
        {/* Cabeçalho - Oculto na impressão */}
        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0 no-print">
          <div>
            <h3 className="text-lg font-bold text-white">Relatório de Gestão e Ocorrências</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Histórico Consolidado de Presenças e Feedbacks</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-black/10 active:scale-95"
            >
              <Printer size={14} />
              Imprimir / PDF
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filtros - Oculto na impressão */}
        <div className="p-8 pb-4 bg-slate-950/20 border-b border-white/5 flex flex-wrap gap-4 items-center shrink-0 no-print">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-300">Selecione o Período:</span>
          </div>
          
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 transition-all text-xs text-white"
          >
            {monthsList.map(m => (
              <option key={m.value} value={m.value} className="bg-slate-900">{m.label}</option>
            ))}
          </select>

          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 transition-all text-xs text-white"
          >
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y} className="bg-slate-900">{y}</option>
            ))}
          </select>
        </div>

        {/* Conteúdo Imprimível do Relatório */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 print:overflow-visible print:p-0 print:space-y-6">
          
          {/* Cabeçalho Corporativo de Impressão - Visível APENAS na Impressão */}
          <div className="hidden print:block border-b-2 border-slate-950 pb-4 space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">Relatório Executivo de Ocorrências</h1>
            <p className="text-xs text-slate-600">Período de Referência: {monthsList.find(m => m.value === selectedMonth)?.label} de {selectedYear}</p>
            <p className="text-[10px] text-slate-500">Documento Interno e Confidencial - Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-12 gap-3 no-print">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
              <span className="text-xs font-medium text-slate-500">Compilando dados do relatório...</span>
            </div>
          ) : (
            <>
              {/* Tabela de Ocorrências Consolidadas */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider print:text-slate-950 print:text-xs">Resumo Comportamental por Colaborador</h4>
                
                <div className="overflow-hidden border border-white/5 rounded-2xl print:border-slate-900 print:rounded-none">
                  <table className="w-full border-collapse text-left text-sm print:text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 text-[10px] text-slate-400 uppercase tracking-widest font-black print:bg-slate-100 print:border-slate-900 print:text-slate-900">
                        <th className="px-6 py-3.5 print:px-3 print:py-2">Colaborador</th>
                        <th className="px-6 py-3.5 print:px-3 print:py-2 text-center text-emerald-400 print:text-emerald-700">Presenças</th>
                        <th className="px-6 py-3.5 print:px-3 print:py-2 text-center text-amber-400 print:text-amber-700">Atrasos</th>
                        <th className="px-6 py-3.5 print:px-3 print:py-2 text-center text-rose-400 print:text-rose-700">Faltas</th>
                        <th className="px-6 py-3.5 print:px-3 print:py-2 text-center text-primary print:text-slate-950">Anotações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 print:divide-slate-300 print:text-slate-950">
                      {summaryByCollaborator.map(row => (
                        <tr key={row.uid} className="hover:bg-white/[0.01] print:hover:bg-transparent">
                          <td className="px-6 py-3.5 print:px-3 print:py-2">
                            <div className="font-bold text-slate-200 print:text-slate-950">{row.name}</div>
                            <div className="text-xs text-slate-500 font-mono print:text-slate-500">{row.email}</div>
                          </td>
                          <td className="px-6 py-3.5 text-center font-bold text-emerald-400 print:text-slate-900 print:px-3 print:py-2">{row.presents}</td>
                          <td className="px-6 py-3.5 text-center font-bold text-amber-400 print:text-slate-900 print:px-3 print:py-2">{row.lates}</td>
                          <td className="px-6 py-3.5 text-center font-bold text-rose-400 print:text-slate-900 print:px-3 print:py-2">{row.absents}</td>
                          <td className="px-6 py-3.5 text-center font-bold text-slate-400 print:text-slate-900 print:px-3 print:py-2">{row.feedbackCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feed Detalhado de Ocorrências e Observações */}
              <div className="space-y-4 break-before-page">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider print:text-slate-950 print:text-xs">Detalhamento das Anotações e Feedbacks</h4>
                
                {filteredNotes.filter(n => n.type === 'note').length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/20 border border-white/5 rounded-2xl text-slate-500 text-xs italic print:border-slate-300 print:text-slate-600 print:bg-transparent">
                    Nenhuma anotação registrada no período de referência.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotes.filter(n => n.type === 'note').map((note) => {
                      const date = new Date(note.createdAt);
                      const collabName = collaborators.find(c => c.uid === note.collaboratorId)?.displayName || 'Colaborador';
                      
                      return (
                        <div key={note.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-1.5 print:bg-transparent print:border-slate-300 print:rounded-none print:border print:p-3 print:break-inside-avoid">
                          <div className="flex justify-between items-center flex-wrap gap-2 text-xs">
                            <span className="font-bold text-slate-200 print:text-slate-900">
                              Para: {collabName}
                            </span>
                            <span className="text-slate-500 font-mono">
                              {date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800 print:text-xs whitespace-pre-wrap">
                            {note.content}
                          </p>
                          
                          <div className="text-[10px] text-slate-500 font-semibold print:text-slate-500">
                            Autor da nota: <span className="text-slate-400 print:text-slate-700">{note.creatorName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assinatura Corporativa - Visível APENAS na Impressão */}
              <div className="hidden print:block pt-16 space-y-8 break-inside-avoid">
                <div className="border-t border-slate-400 w-64 mx-auto" />
                <div className="text-center text-xs text-slate-600">
                  <p className="font-bold">Assinatura do Gestor Responsável</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Gestão de Operações de Cobrança / RNV</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé - Oculto na Impressão */}
        <div className="p-8 pt-4 border-t border-white/5 bg-white/5 backdrop-blur-xl flex shrink-0 no-print">
          <button 
            onClick={onClose}
            className="flex-1 px-5 py-4 rounded-xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-colors text-sm"
          >
            Fechar Relatório
          </button>
        </div>
      </motion.div>
    </div>
  );
};
