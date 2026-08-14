import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Warning, CheckCircle, Info, Trash, X } from '@phosphor-icons/react';

export interface CustomConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  theme?: 'light' | 'dark';
}

export const CustomConfirmModal: React.FC<CustomConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: Trash,
          bgColor: 'bg-rose-500/10',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/30',
          buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
        };
      case 'warning':
        return {
          icon: Warning,
          bgColor: 'bg-amber-500/10',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20'
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-emerald-500/10',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-sky-500/10',
          textColor: 'text-sky-400',
          borderColor: 'border-sky-500/30',
          buttonBg: 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20'
        };
    }
  };

  const style = getVariantStyles();
  const IconComponent = style.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border ${style.bgColor} ${style.textColor} ${style.borderColor} shrink-0`}>
              <IconComponent size={26} weight="duotone" />
            </div>

            <div className="space-y-1.5 pt-1">
              <h3 className="text-base font-bold tracking-wide">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            {cancelText && (
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${style.buttonBg}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
