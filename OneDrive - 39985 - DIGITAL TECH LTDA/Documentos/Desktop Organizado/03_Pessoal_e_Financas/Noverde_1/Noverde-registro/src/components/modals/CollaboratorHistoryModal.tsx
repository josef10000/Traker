import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CircleNotch as Loader2, Calendar as CalendarDays, Clock, FileText, ClipboardText as ClipboardList, Check, Warning as AlertTriangle, WarningCircle as AlertCircle } from '@phosphor-icons/react';
import { CollaborationNote } from '../../types';

interface CollaboratorHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string;
  notes: CollaborationNote[];
  isLoading: boolean;
}

export const CollaboratorHistoryModal = ({ 
  isOpen, 
  onClose, 
  collaboratorName, 
  notes, 
  isLoading 
}: CollaboratorHistoryModalProps) => {
  
  if (!isOpen) return null;

  const getAttendanceBadge = (status?: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check size={10} /> Presente
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={10} /> Atraso
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle size={10} /> Falta
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 w-full max-w-2xl rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Histórico de Ocorrências</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Colaborador: {collaboratorName}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
              <span className="text-xs font-medium text-slate-500">Buscando histórico...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              Nenhum apontamento ou registro de presença cadastrado para este colaborador.
            </div>
          ) : (
            <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
              {notes.map((note) => {
                const date = new Date(note.createdAt);
                const isAttendance = note.type === 'attendance';
                
                return (
                  <div key={note.id} className="relative">
                    {/* Indicador na linha do tempo */}
                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                      isAttendance 
                        ? (note.attendanceStatus === 'present' ? 'bg-emerald-500' : note.attendanceStatus === 'late' ? 'bg-amber-500' : 'bg-rose-500')
                        : 'bg-primary'
                    }`} />
                    
                    <div className="space-y-1.5 bg-slate-950/40 border border-white/5 p-4 rounded-2xl">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <CalendarDays size={12} />
                          {date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isAttendance ? (
                          getAttendanceBadge(note.attendanceStatus)
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            <FileText size={8} /> Anotação
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {note.content}
                      </p>

                      <div className="pt-1 text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <span>Registrado por:</span>
                        <span className="text-slate-400">{note.creatorName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-8 pt-4 border-t border-white/5 bg-white/5 backdrop-blur-xl flex shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 px-5 py-4 rounded-xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-colors"
          >
            Fechar Histórico
          </button>
        </div>
      </motion.div>
    </div>
  );
};
