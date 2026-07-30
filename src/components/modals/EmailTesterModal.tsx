import React, { useState } from 'react';
import { motion } from 'motion/react';
import { EnvelopeSimple, PaperPlaneRight, CheckCircle, Warning, Eye, ShieldCheck } from '@phosphor-icons/react';
import { sendInviteEmail } from '../../services/emailService';
import { generateInviteEmailHtml } from '../../templates/inviteEmailTemplate';

interface EmailTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const EmailTesterModal: React.FC<EmailTesterModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [testEmail, setTestEmail] = useState('');
  const [testOrgName, setTestOrgName] = useState('Empresa Teste Resend');
  const [testRoleName, setTestRoleName] = useState('🏢 Gerente de Operações');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'preview'>('send');
  const [lastResult, setLastResult] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const previewInviteUrl = `${window.location.origin}/register?invite=inv-demo-123456`;
  const previewHtml = generateInviteEmailHtml({
    recipientEmail: testEmail || 'colaborador@empresa.com',
    orgName: testOrgName,
    roleName: testRoleName,
    inviteUrl: previewInviteUrl
  });

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim() || !testEmail.includes('@')) {
      showToast('Informe um e-mail válido para envio de teste.', 'error');
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const res = await sendInviteEmail({
        recipientEmail: testEmail.trim().toLowerCase(),
        orgName: testOrgName,
        roleName: testRoleName,
        inviteUrl: previewInviteUrl
      });

      setLastResult(res);

      if (res.success) {
        showToast(`E-mail de teste enviado com sucesso para ${testEmail}! ID: ${res.messageId}`, 'success');
      } else {
        showToast(`Falha no envio: ${res.error}`, 'error');
      }
    } catch (error: any) {
      console.error('Erro no testador de e-mails:', error);
      setLastResult({ success: false, error: error.message });
      showToast('Erro ao testar envio via Resend.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl my-8 p-6 rounded-3xl border-2 bg-slate-900 border-white/10 text-white shadow-2xl space-y-6 cursor-default"
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <EnvelopeSimple size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <span>Testador de E-mails Resend (Nativo)</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VITE_RESEND_API_KEY Configurada
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Envie um e-mail de teste real nativo ou veja a pré-visualização do template HTML com a logo s-logo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ABAS DO MODAL */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'send'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <PaperPlaneRight size={16} />
            Enviar E-mail de Teste
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={16} />
            Preview Visual do HTML
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        {activeTab === 'send' ? (
          <div className="space-y-5">
            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">E-mail de Destino (Seu E-mail)</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="seuemail@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome da Empresa Exemplo</label>
                  <input
                    type="text"
                    value={testOrgName}
                    onChange={(e) => setTestOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <PaperPlaneRight size={18} weight="bold" />
                  {isSending ? 'Disparando pelo Resend...' : 'Enviar E-mail de Teste Agora'}
                </button>
              </div>
            </form>

            {/* RETORNO DA API DO RESEND */}
            {lastResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                lastResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {lastResult.success ? <CheckCircle size={20} className="text-emerald-400" /> : <Warning size={20} className="text-rose-400" />}
                  <span>{lastResult.success ? 'E-mail Disparado com Sucesso via Resend!' : 'Falha na Resposta do Resend'}</span>
                </div>

                {lastResult.messageId && (
                  <p className="font-mono text-[11px] text-emerald-300">
                    ID da Mensagem Resend: <strong>{lastResult.messageId}</strong>
                  </p>
                )}

                {lastResult.error && (
                  <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-rose-500/20 text-rose-300">
                    Erro detalhado: {lastResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Pré-visualização do HTML exatamente como aparecerá na caixa de entrada do destinatário:</span>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950 max-h-[500px] overflow-y-auto">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full min-h-[550px] border-none"
              />
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="flex justify-end border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs cursor-pointer transition-all"
          >
            Fechar Testador
          </button>
        </div>
      </motion.div>
    </div>
  );
};
