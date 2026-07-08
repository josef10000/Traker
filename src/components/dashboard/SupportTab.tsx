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
  theme?: 'light' | 'dark';
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
  showToast,
  theme = 'dark'
}: SupportTabProps) => {
  const isIntegrated = organizationId === 'sandbox-test' || (!!crmOrgId && !!crmClientId && !!crmPublicToken);

  // Chamados fictícios do Sandbox
  const SANDBOX_TICKETS: CRMRequest[] = [
    {
      id: 'req-sb1',
      category: 'Financeiro',
      priority: 'alta',
      status: 'concluido',
      subject: 'Fatura Asaas pendente após pagamento',
      message: 'Olá suporte! O pagamento do ciclo de Junho já foi debitado no meu cartão, mas a central continua me mostrando aviso de pendência no painel. Podem verificar por favor?',
      reply: 'Olá! Identificamos um atraso na compensação bancária do gateway do Asaas, mas já confirmamos o recebimento e seu acesso foi restabelecido normalmente. Agradecemos o contato!',
      repliedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 90000000).toISOString()
    },
    {
      id: 'req-sb2',
      category: 'Erro',
      priority: 'media',
      status: 'em_analise',
      subject: 'Problema no carregamento do gráfico de dilação',
      message: 'O gráfico de dilação vs quebra na aba de BI está demorando muito para carregar ou às vezes dá erro em tela branca no Safari. Podem analisar?',
      reply: null,
      repliedAt: null,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

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
    if (organizationId === 'sandbox-test') {
      if (requests.length === 0) {
        setRequests(SANDBOX_TICKETS);
      }
      return;
    }
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
    if (organizationId === 'sandbox-test') {
      setTimeout(() => {
        const newTicket: CRMRequest = {
          id: `req-sb${Date.now()}`,
          category,
          priority,
          status: 'aberto',
          subject,
          message,
          reply: null,
          repliedAt: null,
          createdAt: new Date().toISOString()
        };
        setRequests(prev => [newTicket, ...prev]);
        showToast('Chamado de simulação aberto com sucesso!', 'success');
        setSubject('');
        setMessage('');
        setIsSubmitting(false);
      }, 500);
      return;
    }

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
    if (organizationId === 'sandbox-test') {
      setTimeout(() => {
        const userText = replyMessage;
        const currentReply = selectedRequest.reply 
          ? `${selectedRequest.reply}\n\n[Sua réplica]: ${userText}`
          : `[Sua réplica]: ${userText}`;

        const updatedRequest: CRMRequest = {
          ...selectedRequest,
          reply: currentReply,
          repliedAt: new Date().toISOString()
        };

        setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedRequest : r));
        setSelectedRequest(updatedRequest);
        setReplyMessage('');
        setIsSendingReply(false);
        showToast('Mensagem enviada com sucesso (Simulação)!', 'success');

        // Resposta do bot simulando o atendente real em 1.5s
        setTimeout(() => {
          const botText = `Olá! Recebemos sua réplica no Sandbox ("${userText}"). Nossos simuladores estão testando esta interação. Fique à vontade para fazer novos testes!`;
          const finalReply = `${currentReply}\n\n[Suporte HubCRM]: ${botText}`;
          const finalRequest: CRMRequest = {
            ...updatedRequest,
            reply: finalReply,
            repliedAt: new Date().toISOString()
          };
          setRequests(prev => prev.map(r => r.id === selectedRequest.id ? finalRequest : r));
          setSelectedRequest(prev => prev && prev.id === selectedRequest.id ? finalRequest : prev);
          showToast('O Suporte do HubCRM respondeu seu chamado!', 'info');
        }, 1500);

      }, 500);
      return;
    }

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
    if (organizationId === 'sandbox-test') {
      setTimeout(async () => {
        showToast('Assinatura cancelada com sucesso (Simulação Sandbox)!', 'success');
        // Define data limite local D+30
        const d = new Date();
        d.setDate(d.getDate() + 30);
        const limitDate = d.toISOString().split('T')[0];

        const orgRef = doc(db, 'organizations', organizationId);
        await updateDoc(orgRef, {
          planExpiresAt: limitDate
        });

        setIsConfirmCancelOpen(false);
        setIsCanceling(false);
      }, 800);
      return;
    }

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
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            theme === 'dark' 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Clock size={12} />
            Aguardando Atendimento
          </span>
        );
      case 'em_analise':
        return (
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            theme === 'dark' 
              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
              : 'bg-sky-50 text-sky-700 border-sky-200'
          }`}>
            <CircleNotch className="animate-spin" size={12} />
            Em Atendimento
          </span>
        );
      case 'concluido':
        return (
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            theme === 'dark' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
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
      return <span className={theme === 'dark' ? 'text-rose-400 text-xs font-semibold' : 'text-rose-600 text-xs font-semibold'}>Alta</span>;
    }
    if (p === 'media' || p === 'medium') {
      return <span className={theme === 'dark' ? 'text-amber-400 text-xs font-semibold' : 'text-amber-600 text-xs font-semibold'}>Média</span>;
    }
    return <span className={theme === 'dark' ? 'text-slate-400 text-xs font-semibold' : 'text-slate-500 text-xs font-semibold'}>Baixa</span>;
  };

  if (!isIntegrated) {
    return (
      <div className={`p-8 rounded-[2rem] border max-w-2xl mx-auto space-y-6 text-center ${
        theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="py-12 space-y-4">
          <CircleNotch className="animate-spin text-amber-500 mx-auto" size={48} />
          <h2 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Configurando Central de Suporte</h2>
          <p className={`text-sm max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
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
        <div className={`p-6 rounded-[2rem] border h-fit space-y-5 ${
          theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Abrir Chamado</h3>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Envie sua dúvida ou solicitação técnica para os donos do SaaS</p>
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
                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none text-xs ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-555 transition-all outline-none text-xs appearance-none select-custom-arrow cursor-pointer ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="Financeiro" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Financeiro</option>
                  <option value="Dúvida" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Dúvida</option>
                  <option value="Erro" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Erro / Bug</option>
                  <option value="Sugestão" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Sugestão</option>
                  <option value="Outros" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Outros</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-555 transition-all outline-none text-xs appearance-none select-custom-arrow cursor-pointer ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="baixa" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Baixa</option>
                  <option value="media" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Média</option>
                  <option value="alta" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Alta</option>
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
                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none text-xs resize-none ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-sky-500 text-white rounded-xl hover:bg-sky-400 transition-all font-bold text-xs active:scale-95 shadow-lg shadow-sky-555/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <CircleNotch className="animate-spin" size={16} /> : <PaperPlane size={16} />}
              {isSubmitting ? 'Enviando chamado...' : 'Abrir chamado suporte'}
            </button>
          </form>
        </div>

        {/* Histórico e Chat (Direita) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabela de chamados */}
          <div className={`p-6 rounded-[2rem] border ${
            theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`flex justify-between items-center border-b pb-4 mb-4 ${
              theme === 'dark' ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Seus Chamados</h3>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Histórico completo de interações com o suporte</p>
              </div>
              <button 
                onClick={loadTickets}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
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
                    <tr className={`border-b text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'border-white/5' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      <th className="pb-3 pl-2">Assunto</th>
                      <th className="pb-3">Categoria</th>
                      <th className="pb-3">Prioridade</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-white/[0.02]' : 'divide-slate-100'
                  }`}>
                    {requests.map((req) => (
                      <tr 
                        key={req.id} 
                        className={`border-b transition-all cursor-pointer ${
                          theme === 'dark' 
                            ? `border-white/5 hover:bg-white/5 ${selectedRequest?.id === req.id ? 'bg-white/5' : ''}` 
                            : `border-slate-100 hover:bg-slate-50 ${selectedRequest?.id === req.id ? 'bg-slate-50' : ''}`
                        }`}
                        onClick={() => setSelectedRequest(req)}
                      >
                        <td className={`py-3.5 pl-2 font-bold max-w-[200px] truncate ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>{req.subject}</td>
                        <td className={`py-3.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{req.category}</td>
                        <td className="py-3.5">{getPriorityBadge(req.priority)}</td>
                        <td className="py-3.5">{getStatusBadge(req.status)}</td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(req);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              theme === 'dark' 
                                ? 'bg-white/5 hover:bg-sky-500 hover:text-white' 
                                : 'bg-slate-100 hover:bg-sky-500 hover:text-white text-slate-700'
                            }`}
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
                className={`p-6 rounded-[2rem] border space-y-6 ${
                  theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className={`flex justify-between items-start border-b pb-4 ${
                  theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visualizando Chamado</span>
                    <h4 className={`text-md font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedRequest.subject}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">ID: {selectedRequest.id}</span>
                      <span className="text-slate-350 dark:text-slate-700 text-xs">•</span>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      theme === 'dark' ? 'hover:bg-white/10 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Histórico do Chat */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Pergunta Original */}
                  <div className="flex flex-col items-start gap-1 max-w-[85%]">
                    <span className="text-[9px] text-slate-550 dark:text-slate-500 font-bold ml-3">{organizationName} (Você)</span>
                    <div className={`p-4 rounded-3xl rounded-tl-none border text-xs leading-relaxed shadow-sm ${
                      theme === 'dark' ? 'bg-slate-950 border-white/5 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}>
                      {selectedRequest.message}
                    </div>
                  </div>

                  {/* Resposta do Suporte */}
                  {selectedRequest.reply ? (
                    <div className="flex flex-col items-end gap-1 ml-auto max-w-[85%]">
                      <span className="text-[9px] text-slate-550 dark:text-slate-500 font-bold mr-3">Suporte HubCRM</span>
                      <div className={`p-4 rounded-3xl rounded-tr-none border text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                        theme === 'dark' ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-850'
                      }`}>
                        {selectedRequest.reply}
                      </div>
                      {selectedRequest.repliedAt && (
                        <span className="text-[8px] text-slate-500 font-medium mr-3 mt-1">
                          Respondido em: {new Date(selectedRequest.repliedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl text-center border border-dashed text-xs ${
                      theme === 'dark' ? 'bg-slate-950/30 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      Nenhum atendente respondeu este chamado ainda. Aguarde.
                    </div>
                  )}
                </div>

                {/* Form de Envio da Réplica */}
                {selectedRequest.status !== 'concluido' ? (
                  <form onSubmit={handleSendReply} className={`flex gap-3 border-t pt-4 ${
                    theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                  }`}>
                    <input
                      type="text"
                      required
                      placeholder="Escrever uma réplica / responder ao chamado..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className={`flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-xs outline-none ${
                        theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply}
                      className="px-5 bg-sky-500 text-white rounded-xl hover:bg-sky-655 transition-colors font-bold text-xs active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/10 cursor-pointer"
                    >
                      {isSendingReply ? <CircleNotch className="animate-spin" size={14} /> : <PaperPlane size={14} />}
                      Enviar
                    </button>
                  </form>
                ) : (
                  <div className={`p-4 rounded-2xl text-center border text-xs font-semibold flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
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
        <div className={`p-6 rounded-[2rem] border space-y-4 ${
          theme === 'dark' ? 'bg-rose-955/5 border-rose-500/20' : 'bg-white border-rose-200 shadow-sm'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl mt-0.5">
              <Warning size={24} weight="duotone" />
            </div>
            <div>
              <h3 className={`text-md font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Cancelar Assinatura do SaaS</h3>
              <p className={`text-xs mt-1 max-w-xl leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Ao cancelar a assinatura, o faturamento automático será desativado no Asaas e seu acesso pago ficará ativo somente até o final do período vigente concedido pela central.
              </p>
            </div>
          </div>

          <div className={`flex justify-end pt-2 border-t ${
            theme === 'dark' ? 'border-rose-500/10' : 'border-rose-100'
          }`}>
            <button
              onClick={() => setIsConfirmCancelOpen(true)}
              className="px-5 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-655 transition-colors shadow-lg shadow-rose-500/10 text-xs active:scale-95 cursor-pointer"
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
              className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl shadow-2xl border p-8 space-y-6 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-center space-y-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto animate-bounce border ${
                  theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-rose-50 border-rose-250 text-rose-600'
                }`}>
                  <Warning size={20} />
                </div>
                <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Confirmar Cancelamento</h4>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tem certeza de que deseja cancelar sua assinatura? O faturamento será cancelado no Asaas e seu acesso será expirado automaticamente após o fim do ciclo mensal vigente.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsConfirmCancelOpen(false)}
                  disabled={isCanceling}
                  className={`flex-1 py-3.5 rounded-xl border font-bold transition-colors text-xs cursor-pointer ${
                    theme === 'dark' 
                      ? 'border-white/10 text-slate-400 hover:bg-white/5' 
                      : 'border-slate-200 text-slate-655 hover:bg-slate-50'
                  }`}
                >
                  Manter Assinatura
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                  className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all text-xs active:scale-95 shadow-md shadow-rose-500/15 flex items-center justify-center gap-1.5 cursor-pointer"
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
