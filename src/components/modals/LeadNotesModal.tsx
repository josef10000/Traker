import React, { useState } from 'react';
import { X, ChatText, PhoneCall, WhatsappLogo, Warning, NotePencil, PaperPlaneRight, Calendar } from '@phosphor-icons/react';
import { Agreement, AgreementNote, UserProfile } from '../../types';
import { maskCPF } from '../../utils/masks';

interface LeadNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: Agreement | null;
  profile: UserProfile;
  onSaveNote: (agreementId: string, note: Omit<AgreementNote, 'id' | 'createdAt'>) => Promise<void>;
  theme?: 'light' | 'dark';
}

export const LeadNotesModal: React.FC<LeadNotesModalProps> = ({
  isOpen,
  onClose,
  agreement,
  profile,
  onSaveNote,
  theme = 'dark'
}) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'phone' | 'whatsapp' | 'warning' | 'general'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !agreement) return null;

  const notesHistory = agreement.notesHistory || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSaveNote(agreement.id, {
        authorId: profile.uid,
        authorName: profile.displayName || 'Colaborador',
        authorRole: profile.role,
        category,
        content: content.trim()
      });
      setContent('');
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (cat: AgreementNote['category']) => {
    switch (cat) {
      case 'phone':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <PhoneCall size={11} /> Ligação
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <WhatsappLogo size={11} /> WhatsApp
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Warning size={11} /> Alerta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <NotePencil size={11} /> Nota Geral
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ChatText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Notas de Transição do Lead</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {agreement.clientName} • CPF: {maskCPF(agreement.clientCpf)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notesHistory.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <ChatText size={32} className="mx-auto text-slate-600" />
              <p className="text-xs text-slate-500 italic">
                Nenhuma observação registrada para este lead ainda.
              </p>
            </div>
          ) : (
            notesHistory.map((note) => (
              <div 
                key={note.id}
                className="p-3 rounded-xl border border-slate-800/60 bg-slate-950/40 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{note.authorName}</span>
                    {getCategoryBadge(note.category)}
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(note.createdAt).toLocaleDateString('pt-BR')} às {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer - Add Note Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nova Observação:</span>
            <div className="flex gap-1.5">
              {(['general', 'phone', 'whatsapp', 'warning'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'general' ? 'Geral' : cat === 'phone' ? 'Ligação' : cat === 'whatsapp' ? 'WhatsApp' : 'Alerta'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite uma nota sobre este cliente (ex: ligar após as 14h, enviada proposta por e-mail)..."
              rows={2}
              className="flex-1 p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500/50 resize-none"
            />
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer self-end"
            >
              <PaperPlaneRight size={14} weight="bold" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
