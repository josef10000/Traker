import React, { useEffect, useState } from 'react';
import { CheckCircle as CheckCircle2, XCircle, Info, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info';

const DURATION_MS = 3200;

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast = ({ message, type, onClose }: ToastProps) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(onClose, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Barra de progresso interna
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const icons = {
    success: <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />,
    error:   <XCircle className="text-rose-400 shrink-0" size={20} />,
    info:    <Info className="text-sky-400 shrink-0" size={20} />,
  };

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error:   'bg-rose-500/10 border-rose-500/20',
    info:    'bg-sky-500/10 border-sky-500/20',
  };

  const barColors = {
    success: 'bg-emerald-400',
    error:   'bg-rose-400',
    info:    'bg-sky-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
      exit={{ opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.18 } }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-0 rounded-2xl border backdrop-blur-xl shadow-2xl ${bgColors[type]} min-w-[320px] overflow-hidden`}
    >
      {/* Content */}
      <div className="flex items-center gap-3 px-6 py-4">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { delay: 0.1, type: 'spring', stiffness: 500 } }}
        >
          {icons[type]}
        </motion.span>
        <p className="text-sm font-medium text-white flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors ml-2 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] w-full bg-white/5">
        <div
          className={`h-full ${barColors[type]} transition-none rounded-full`}
          style={{ width: `${progress}%`, transition: 'width 0.08s linear' }}
        />
      </div>
    </motion.div>
  );
};
