import React from 'react';
import { X, Warning } from '@phosphor-icons/react';

interface CustomConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function CustomConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}: CustomConfirmProps) {
  if (!isOpen) return null;

  const accentColor = type === 'danger' 
    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10' 
    : type === 'warning' 
    ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/10 font-bold' 
    : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/10';

  const iconColor = type === 'danger' 
    ? 'text-rose-400 bg-rose-500/10' 
    : type === 'warning' 
    ? 'text-amber-400 bg-amber-500/10' 
    : 'text-sky-400 bg-sky-500/10';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl bg-[#090d16] text-white animate-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h4 className="text-base font-black flex items-center gap-1.5">
            <span className={`p-1.5 rounded-lg ${iconColor}`}>
              <Warning size={16} />
            </span>
            {title}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-850"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${accentColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
