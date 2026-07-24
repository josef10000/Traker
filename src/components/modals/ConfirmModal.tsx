import React from 'react';
import { Warning as AlertTriangle, Info, CheckCircle } from '@phosphor-icons/react';
import { LinearModal } from '../ui/LinearModal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  theme?: 'light' | 'dark';
}

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar',
  variant = 'danger',
  theme = 'dark'
}: ConfirmModalProps) => {
  const colors = {
    danger: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25',
    warning: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25',
    info: 'bg-primary hover:bg-primary/80 shadow-primary/25'
  };

  const iconColors = {
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  };

  const icons = {
    danger: <AlertTriangle size={28} weight="duotone" />,
    warning: <AlertTriangle size={28} weight="duotone" />,
    info: <Info size={28} weight="duotone" />
  };

  return (
    <LinearModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center pt-2 pb-1">
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${iconColors[variant]} shadow-lg`}>
          {icons[variant]}
        </div>

        <h3 className="text-xl font-black text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
          {message}
        </p>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-2xl border border-white/10 font-bold text-slate-300 hover:bg-white/5 transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
          >
            {cancelText}
          </button>
          <button 
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-5 py-3 rounded-2xl text-white font-black transition-all shadow-xl active:scale-95 cursor-pointer text-xs uppercase tracking-wider ${colors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </LinearModal>
  );
};

