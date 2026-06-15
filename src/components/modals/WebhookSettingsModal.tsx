import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Save, Loader2, Link2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface WebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currentWebhookUrl?: string;
  onSaveSuccess: (newUrl: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const WebhookSettingsModal = ({ isOpen, onClose, organizationId, currentWebhookUrl, onSaveSuccess, showToast }: WebhookSettingsModalProps) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setWebhookUrl(currentWebhookUrl || '');
  }, [currentWebhookUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (webhookUrl.trim() && !webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
      showToast('A URL deve iniciar com http:// ou https://', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const orgRef = doc(db, 'organizations', organizationId);
      await updateDoc(orgRef, {
        webhookUrl: webhookUrl.trim() || null
      });
      onSaveSuccess(webhookUrl.trim());
      showToast('Configurações de Webhook salvas com sucesso!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar as configurações de Webhook.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-sky-500/20 to-sky-400/10 rounded-2xl border border-sky-500/30 text-sky-400">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-none">Integração por Webhook</h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Configurações para Manager</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure uma URL para enviar notificações reativas (payloads) do sistema Tracker sempre que um acordo for registrado, alterado ou pago.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">URL de Destino (POST)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Link2 size={16} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="https://meusistema.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t border-slate-800/60">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl border border-slate-800 font-bold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3.5 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar URL
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
