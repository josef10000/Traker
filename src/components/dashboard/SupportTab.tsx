import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, AgreementStatus } from '../../types';
import { 
  Lifebuoy, 
  PaperPlane, 
  Warning, 
  CircleNotch, 
  CheckCircle, 
  Clock, 
  Chats,
  X,
  Lock,
  ClipboardText,
  Check
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

const CRM_API_URL = 'https://hubcrm.hubsymples.com.br/api/portal_handler';

interface SupportTabProps {
  profile: UserProfile;
  organizationId: string;
  organizationName: string;
  crmOrgId: string;
  crmClientId: string;
  crmPublicToken: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface CRMRequest {
  id: string;
  category: string;
  priority: string;
  status: 'aberto' | 'em_analise' | 'concluido';
  subject: string;
  message: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export const SupportTab = ({
  profile,
  organizationId,
  organizationName,
  crmOrgId,
  crmClientId,
  crmPublicToken,
  showToast
}: SupportTabProps) => {
  const isIntegrated = crmOrgId && crmClientId && crmPublicToken;

  // Estados dos chamados
  const [requests, setRequests] = useState<CRMRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CRMRequest | null>(null);

  // Estados de formulários
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Dúvida');
  const [priority, setPriority] = useState('media');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat réplica
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Cancelamento
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Carregar chamados do CRM
  const loadTickets = async () => {
    if (!isIntegrated) return;
    setIsLoading(true);
    try {
      const url = `${CRM_API_URL}?action=support_list&orgId=${crmOrgId}&clientId=${crmClientId}&token=${crmPublicToken}`;
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        console.error('Erro ao listar chamados:', data.error);
        showToast('Erro ao listar chamados da central de ajuda.', 'error');
      }
    } catch (error) {
      console.error('Erro de conexão ao listar chamados:', error);
      showToast('Erro de conexão ao HubCRM.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [crmOrgId, crmClientId, crmPublicToken]);

  // 2. Criar novo chamado
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Assunto e mensagem são obrigatórios.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(CRM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'support_create',
          orgId: crmOrgId,
          clientId: crmClientId,
          token: crmPublicToken,
          category,
          priority,
          subject,
          message
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Chamado aberto com sucesso!', 'success');
        setSubject('');
        setMessage('');
        loadTickets();
      } else {
        showToast('Erro ao abrir chamado: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Erro de conexão ao abrir chamado:', error);
      showToast('Erro de conexão ao enviar o chamado.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Enviar réplica
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !replyMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const response = await fetch(CRM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'support_reply',
          orgId: crmOrgId,
          clientId: crmClientId,
          token: crmPublicToken,
          requestId: selectedRequest.id,
          message: replyMessage
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Mensagem enviada com sucesso!', 'success');
        setReplyMessage('');
        
        // Atualiza a visualização local do chamado selecionado simulando a conversa
        const updatedRequest = { ...selectedRequest };
        if (updatedRequest.reply) {
          updatedRequest.reply += `\n\n[Sua réplica]: ${replyMessage}`;
        } else {
          updatedRequest.reply = `[Sua réplica]: ${replyMessage}`;
        }
        setSelectedRequest(updatedRequest);
        loadTickets();
      } else {
        showToast('Erro ao enviar mensagem: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Erro de conexão ao enviar réplica:', error);
      showToast('Erro de conexão ao enviar a réplica.', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  // 4. Cancelar Assinatura no CRM (Asaas)
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch(CRM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'support_cancel_subscription',
          orgId: crmOrgId,
          clientId: crmClientId,
          token: crmPublicToken
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Assinatura cancelada com sucesso no Asaas!', 'success');
        
        // Salva a data limite de expiração no documento da empresa no Firestore
        const orgRef = doc(db, 'organizations', organizationId);
        await updateDoc(orgRef, {
          planExpiresAt: data.accessUntil // ex: "2026-08-05"
        });
        
        setIsConfirmCancelOpen(false);
      } else {
        showToast('Erro ao cancelar assinatura: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Erro de conexão ao cancelar:', error);
      showToast('Erro de conexão ao cancelar assinatura.', 'error');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(organizationId);
    setCopiedCode(true);
    showToast('Código de integração copiado com sucesso!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Mapeador de badges de status
  const getStatusBadge = (status: CRMRequest['status']) => {
    switch (status) {
      case 'aberto':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={12} />
            Aguardando Atendimento
          </span>
        );
      case 'em_analise':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CircleNotch className="animate-spin" size={12} />
            Em Atendimento
          </span>
        );
      case 'concluido':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={12} />
            Resolvido
          </span>
        );
      default:
        return null;
    }
  };

  // Mapeador de prioridades
  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'critica' || p === 'high' || p === 'alta') {
      return <span className="text-rose-400 text-xs font-semibold">Alta</span>;
    }
    if (p === 'media' || p === 'medium') {
      return <span className="text-amber-400 text-xs font-semibold">Média</span>;
    }
    return <span className="text-slate-400 text-xs font-semibold">Baixa</span>;
  };

  if (!isIntegrated) {
    return (
      <div className="glass-card p-8 rounded-[2rem] border border-white/5 bg-slate-900/10 max-w-2xl mx-auto space-y-6 text-center">
        <div className="py-12 space-y-4">
          <CircleNotch className="animate-spin text-amber-500 mx-auto" size={48} />
          <h2 className="text-xl font-bold text-white tracking-tight">Configurando Central de Suporte</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            A central de atendimento está sendo ativada pela nossa equipe. 
            Por favor, aguarde alguns instantes. Este painel será liberado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Grade de Suporte e Chamados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulário Novo Chamado (Esquerda) */}
        <div className="lg:col-span-4 glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-900/10 h-fit space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">Abrir Chamado</h3>
            <p className="text-xs text-slate-400 mt-1">Envie sua dúvida ou solicitação técnica para os donos do SaaS</p>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Assunto / Título</label>
              <input
                type="text"
                required
                placeholder="Ex: Erro ao importar planilha CSV"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none text-xs appearance-none select-custom-arrow"
                >
                  <option value="Financeiro">Financeiro</option>
                  <option value="Dúvida">Dúvida</option>
                  <option value="Erro">Erro / Bug</option>
                  <option value="Sugestão">Sugestão</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none text-xs appearance-none select-custom-arrow"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Mensagem (Descrição)</label>
              <textarea
                required
                rows={4}
                placeholder="Descreva detalhadamente sua dúvida ou problema técnico..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-sky-500 text-white rounded-xl hover:bg-sky-400 transition-all font-bold text-xs active:scale-95 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <CircleNotch className="animate-spin" size={16} /> : <PaperPlane size={16} />}
              {isSubmitting ? 'Enviando chamado...' : 'Abrir chamado suporte'}
            </button>
          </form>
        </div>

        {/* Histórico e Chat (Direita) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabela de chamados */}
          <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-900/10">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Seus Chamados</h3>
                <p className="text-xs text-slate-400 mt-1">Histórico completo de interações com o suporte</p>
              </div>
              <button 
                onClick={loadTickets}
                className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="Sincronizar chamados"
              >
                <CircleNotch className={isLoading ? 'animate-spin' : ''} size={16} />
              </button>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <CircleNotch className="animate-spin text-sky-500" size={32} />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Carregando tickets...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm space-y-2">
                <Chats size={32} className="mx-auto text-slate-600" />
                <p>Nenhum chamado aberto por sua organização.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-black uppercase tracking-wider">
                      <th className="pb-3 pl-2">Assunto</th>
                      <th className="pb-3">Categoria</th>
                      <th className="pb-3">Prioridade</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr 
                        key={req.id} 
                        className={`border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${selectedRequest?.id === req.id ? 'bg-white/5' : ''}`}
                        onClick={() => setSelectedRequest(req)}
                      >
                        <td className="py-3.5 pl-2 font-bold text-white max-w-[200px] truncate">{req.subject}</td>
                        <td className="py-3.5 text-slate-300">{req.category}</td>
                        <td className="py-3.5">{getPriorityBadge(req.priority)}</td>
                        <td className="py-3.5">{getStatusBadge(req.status)}</td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(req);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-sky-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider"
                          >
                            Ver Conversa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Conversa ativa (Chat réplica) */}
          <AnimatePresence mode="wait">
            {selectedRequest && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-900/10 space-y-6"
              >
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visualizando Chamado</span>
                    <h4 className="text-md font-bold text-white mt-1">{selectedRequest.subject}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-400">ID: {selectedRequest.id}</span>
                      <span className="text-slate-700 text-xs">•</span>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Histórico do Chat */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Pergunta Original */}
                  <div className="flex flex-col items-start gap-1 max-w-[85%]">
                    <span className="text-[9px] text-slate-500 font-bold ml-3">{organizationName} (Você)</span>
                    <div className="bg-slate-950 p-4 rounded-3xl rounded-tl-none border border-white/5 text-xs text-slate-200 leading-relaxed shadow-sm">
                      {selectedRequest.message}
                    </div>
                  </div>

                  {/* Resposta do Suporte */}
                  {selectedRequest.reply ? (
                    <div className="flex flex-col items-end gap-1 ml-auto max-w-[85%]">
                      <span className="text-[9px] text-slate-500 font-bold mr-3">Suporte HubCRM</span>
                      <div className="bg-sky-500/10 p-4 rounded-3xl rounded-tr-none border border-sky-500/20 text-xs text-sky-200 leading-relaxed shadow-sm whitespace-pre-wrap">
                        {selectedRequest.reply}
                      </div>
                      {selectedRequest.repliedAt && (
                        <span className="text-[8px] text-slate-500 font-medium mr-3 mt-1">
                          Respondido em: {new Date(selectedRequest.repliedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/30 text-center border border-dashed border-white/5 text-xs text-slate-500">
                      Nenhum atendente respondeu este chamado ainda. Aguarde.
                    </div>
                  )}
                </div>

                {/* Form de Envio da Réplica */}
                {selectedRequest.status !== 'concluido' ? (
                  <form onSubmit={handleSendReply} className="border-t border-white/5 pt-4 flex gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Escrever uma réplica / responder ao chamado..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white text-xs outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply}
                      className="px-5 bg-sky-500 text-white rounded-xl hover:bg-sky-400 transition-colors font-bold text-xs active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/10"
                    >
                      {isSendingReply ? <CircleNotch className="animate-spin" size={14} /> : <PaperPlane size={14} />}
                      Enviar
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 text-center border border-emerald-500/10 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-2">
                    <Lock size={14} />
                    Chamado encerrado. Não é possível enviar novas réplicas.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Seção Perigosa: Cancelar Assinatura (Apenas Gerentes) */}
      {profile.role === 'manager' && (
        <div className="glass-card p-6 rounded-[2rem] border border-rose-500/20 bg-rose-950/5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl mt-0.5">
              <Warning size={24} weight="duotone" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white">Cancelar Assinatura do SaaS</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Ao cancelar a assinatura, o faturamento automático será desativado no Asaas e seu acesso pago ficará ativo somente até o final do período vigente concedido pela central.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-rose-500/10">
            <button
              onClick={() => setIsConfirmCancelOpen(true)}
              className="px-5 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/10 text-xs active:scale-95"
            >
              Cancelar Assinatura
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      <AnimatePresence>
        {isConfirmCancelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmCancelOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 p-8 space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto animate-bounce">
                  <Warning size={20} />
                </div>
                <h4 className="text-lg font-bold text-white">Confirmar Cancelamento</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tem certeza de que deseja cancelar sua assinatura? O faturamento será cancelado no Asaas e seu acesso será expirado automaticamente após o fim do ciclo mensal vigente.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsConfirmCancelOpen(false)}
                  disabled={isCanceling}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-colors text-xs"
                >
                  Manter Assinatura
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                  className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all text-xs active:scale-95 shadow-md shadow-rose-500/15 flex items-center justify-center gap-1.5"
                >
                  {isCanceling ? <CircleNotch className="animate-spin" size={14} /> : null}
                  {isCanceling ? 'Cancelando...' : 'Confirmar e Cancelar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
