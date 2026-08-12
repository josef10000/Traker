import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Key, ArrowRight, WarningCircle, CheckCircle, Envelope, X } from '@phosphor-icons/react';
import { UserProfile } from '../../types';
import { verifyWindowsHello } from '../../lib/webAuthnService';

interface WindowsHello2FaModalProps {
  user: UserProfile;
  isOpen: boolean;
  onSuccess: (usedBackupCode?: string) => void;
  onCancel: () => void;
  isSandbox?: boolean;
}

export const WindowsHello2FaModal: React.FC<WindowsHello2FaModalProps> = ({
  user,
  isOpen,
  onSuccess,
  onCancel,
  isSandbox = false
}) => {
  const [mode, setMode] = useState<'hello' | 'backup'>('hello');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backupInput, setBackupInput] = useState('');

  // Tenta acionar a verificação do Windows Hello ao abrir o modal
  useEffect(() => {
    if (isOpen && mode === 'hello') {
      handleTriggerWindowsHello();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerWindowsHello = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const isValid = await verifyWindowsHello(user.webAuthnCredentials || [], isSandbox);
      if (isValid) {
        onSuccess();
      } else {
        setErrorMessage('Verificação do Windows Hello cancelada ou não reconhecida.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao comunicar com o leitor biométrico do Windows Hello.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyBackupCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleaned = backupInput.trim();

    if (!cleaned) {
      setErrorMessage('Por favor, informe o código de contingência.');
      return;
    }

    const availableCodes = user.backupCodes || [];
    const matched = availableCodes.find(c => c === cleaned || c.replace('-', '') === cleaned.replace('-', ''));

    if (matched || isSandbox) {
      onSuccess(matched || cleaned);
    } else {
      setErrorMessage('Código de emergência inválido ou já utilizado.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white text-center relative overflow-hidden">
        {/* Glow de Segurança */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-400">
            <ShieldCheck size={18} className="text-sky-400" />
            <span>Verificação em 2 Etapas</span>
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {mode === 'hello' ? (
          <div className="space-y-6 py-2">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mx-auto">
              <Fingerprint size={48} className="animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Windows Hello</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Coloque sua digital no leitor ou digite o <strong>PIN do seu Windows</strong> para autorizar o acesso.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-2">
                <WarningCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleTriggerWindowsHello}
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <span>Aguardando Windows Hello...</span>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    <span>Verificar com Windows Hello</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('backup')}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              >
                <Envelope size={16} className="text-amber-400" />
                <span>Usar Código Enviado por E-mail</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerifyBackupCode} className="space-y-5 py-2 text-left">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
                <Key size={32} />
              </div>
              <h3 className="text-base font-black text-white">Código de Contingência</h3>
              <p className="text-xs text-slate-400 mt-1">
                Digite um dos 5 códigos de emergência enviados para <strong>{user.email}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Código de Backup (Ex: 8492-1029)
              </label>
              <input
                type="text"
                value={backupInput}
                onChange={(e) => setBackupInput(e.target.value)}
                placeholder="0000-0000"
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-white/15 text-center font-mono text-base font-bold text-emerald-400 tracking-widest outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Validar Acesso</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setMode('hello')}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-bold transition-colors text-center"
              >
                Voltar para o Windows Hello
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
