import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  UserCheck, 
  ClockCounterClockwise, 
  FileText, 
  ChatTeardropText, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Hourglass, 
  CalendarBlank, 
  User, 
  Tag,
  Paperclip
} from '@phosphor-icons/react';
import { Agreement, AgreementNote, UserProfile } from '../../types';
import { formatCurrency, formatCPF } from '../../utils/masks';

interface CpfHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cpf: string;
  agreements: Agreement[];
  profile: UserProfile;
  onAddNote?: (cpf: string, note: Omit<AgreementNote, 'id' | 'createdAt'>) => void;
}

export const CpfHistoryModal: React.FC<CpfHistoryModalProps> = ({
  isOpen,
  onClose,
  cpf,
  agreements,
  profile,
  onAddNote
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'whatsapp' | 'phone' | 'warning' | 'general'>('whatsapp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanCpf = (cpf || '').replace(/\D/g, '');
  const formattedCpf = formatCPF(cleanCpf);

  // Filtra todos os acordos pertencentes a este CPF
  const clientAgreements = useMemo(() => {
    if (!cleanCpf) return [];
    return agreements.filter(a => (a.clientCpf || '').replace(/\D/g, '') === cleanCpf)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [agreements, cleanCpf]);

  const clientName = clientAgreements[0]?.clientName || 'Cliente';

  // Consolidação de notas e histórico
  const allNotes = useMemo(() => {
    const notes: Array<AgreementNote & { agreementId?: string }> = [];
    clientAgreements.forEach(a => {
      if (a.notesHistory && a.notesHistory.length > 0) {
        a.notesHistory.forEach(n => notes.push({ ...n, agreementId: a.id }));
      } else if (a.notes) {
        notes.push({
          id: `legacy_${a.id}`,
          authorId: a.operatorId || 'system',
          authorName: a.operatorName || 'Operador',
          content: a.notes,
          category: 'general',
          createdAt: a.createdAt,
          agreementId: a.id
        });
      }
    });
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clientAgreements]);

  // Estatísticas do CPF
  const totalAgreements = clientAgreements.length;
  const totalPaidValue = clientAgreements
    .filter(a => ['pago', 'paid', 'quitado'].includes((a.status || '').toString().toLowerCase()))
    .reduce((sum, a) => sum + (a.value || 0), 0);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !onAddNote) return;

    setIsSubmitting(true);
    onAddNote(cleanCpf, {
      authorId: profile.uid,
      authorName: profile.name,
      authorRole: profile.role,
      content: newNoteContent.trim(),
      category: newNoteCategory
    });

    setNewNoteContent('');
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        >
          {/* CABEÇALHO DO MODAL */}
          <div className="p-6 bg-slate-950 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <ClockCounterClockwise size={26} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider">
                    Prontuário Cronológico 360°
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">{formattedCpf}</span>
                </div>
                <h3 className="text-xl font-black text-white mt-0.5">{clientName}</h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* RESUMO RÁPIDO DO CLIENTE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-950/50 border-b border-white/10 text-center">
            <div className="p-2 bg-slate-900/60 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Acordos Históricos</span>
              <span className="text-sm font-black text-white font-mono">{totalAgreements} registros</span>
            </div>

            <div className="p-2 bg-slate-900/60 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Quitado</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{formatCurrency(totalPaidValue)}</span>
            </div>

            <div className="p-2 bg-slate-900/60 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Anotações Internas</span>
              <span className="text-sm font-black text-sky-400 font-mono">{allNotes.length} anotações</span>
            </div>
          </div>

          {/* CONTEÚDO SCROLLÁVEL */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            
            {/* SEÇÃO 1: LINHA DO TEMPO DE ACORDOS PASSADOS */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText size={16} className="text-sky-400" />
                <span>Histórico de Acordos ({clientAgreements.length})</span>
              </h4>

              {clientAgreements.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhum acordo cadastrado para este CPF.</p>
              ) : (
                <div className="space-y-2">
                  {clientAgreements.map((a) => {
                    const st = (a.status || '').toString().toLowerCase();
                    const isPaid = ['pago', 'paid', 'quitado'].includes(st);
                    const isBroken = ['quebrado', 'broken'].includes(st);

                    return (
                      <div
                        key={a.id}
                        className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 hover:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              isPaid 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : isBroken 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {a.status}
                            </span>
                            <span className="font-mono font-bold text-white">{formatCurrency(a.value || 0)}</span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <CalendarBlank size={12} /> Criado em: {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {a.operatorName && (
                              <span className="flex items-center gap-1">
                                <User size={12} /> Operador: <strong className="text-slate-300">{a.operatorName}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {a.receiptUrl && (
                          <a
                            href={a.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1 shrink-0 hover:underline"
                          >
                            <Paperclip size={12} /> Comprovante Anexo
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: ANOTAÇÕES E OBSERVATÓRIO DO CLIENTE */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ChatTeardropText size={16} className="text-amber-400" />
                <span>Anotações & Observações de Atendimento</span>
              </h4>

              {/* FORMULÁRIO PARA ADICIONAR NOVA NOTA */}
              {onAddNote && (
                <form onSubmit={handleCreateNote} className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Adicionar Nova Observação Interna
                    </span>

                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-300 focus:outline-none focus:border-sky-500"
                    >
                      <option value="whatsapp">📱 WhatsApp</option>
                      <option value="phone">📞 Telefone</option>
                      <option value="warning">⚠️ Alerta / Restrição</option>
                      <option value="general">📝 Geral</option>
                    </select>
                  </div>

                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Ex: Cliente prefere pagar no dia 05; solicitou envio da confirmação no WhatsApp à tarde..."
                    rows={2}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNoteContent.trim() || isSubmitting}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Salvar Anotação</span>
                    </button>
                  </div>
                </form>
              )}

              {/* LISTA DE ANOTAÇÕES ANTERIORES */}
              {allNotes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhuma anotação registrada para este cliente.</p>
              ) : (
                <div className="space-y-2.5">
                  {allNotes.map((note) => (
                    <div key={note.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <User size={12} className="text-sky-400" />
                          {note.authorName} {note.authorRole && <span className="text-[10px] text-slate-500 font-normal">({note.authorRole})</span>}
                        </span>
                        <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CpfHistoryModal;
