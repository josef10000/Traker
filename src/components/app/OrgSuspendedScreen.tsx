import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface OrgSuspendedScreenProps {
  onReturnToLogin: () => void;
}

export function OrgSuspendedScreen({ onReturnToLogin }: OrgSuspendedScreenProps) {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
      <div className="glass-card max-w-md p-8 rounded-3xl border border-white/5 bg-slate-900/20 space-y-6">
        <WarningCircle className="text-rose-500 mx-auto animate-pulse" size={48} />
        <h2 className="text-2xl font-bold text-white">Acesso Suspenso</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          O acesso para a organização vinculada à sua conta foi temporariamente suspenso.
        </p>
        <button 
          onClick={onReturnToLogin} 
          className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all active:scale-[0.98] cursor-pointer"
        >
          Voltar ao Login
        </button>
      </div>
    </div>
  );
}
