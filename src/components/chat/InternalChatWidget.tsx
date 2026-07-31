import React, { useState, useEffect, useRef } from 'react';
import { 
  ChatCircleDots, 
  X, 
  PaperPlaneRight, 
  User, 
  MagnifyingGlass, 
  FileText, 
  ArrowLeft,
  Checks,
  Building,
  Sparkle
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, InternalMessage } from '../../types';
import { Avatar } from '../ui/Avatar';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCPF } from '../../utils/masks';

interface InternalChatWidgetProps {
  profile: UserProfile;
  collaborators: UserProfile[];
  onSelectCpf?: (cpf: string) => void;
  theme?: 'dark' | 'light';
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const InternalChatWidget: React.FC<InternalChatWidgetProps> = ({
  profile,
  collaborators = [],
  onSelectCpf,
  theme = 'dark',
  showToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRecipient, setActiveRecipient] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtrar outros colaboradores da mesma empresa (excluindo a si próprio)
  const availableUsers = collaborators.filter(u => u.uid !== profile.uid && 
    (searchUserQuery.trim() === '' || 
      u.displayName?.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchUserQuery.toLowerCase())
    )
  );

  // Carregar Mensagens Realtime (Firestore com Fallback para Sandbox LocalStorage)
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test' || !db) {
      // Leitura LocalStorage em ambiente Demo / Sandbox
      const loadSandboxMessages = () => {
        const stored = localStorage.getItem(`sandbox_messages_${profile.organizationId}`);
        if (stored) {
          try {
            setMessages(JSON.parse(stored));
          } catch (e) {
            console.error('Erro ao ler mensagens sandbox', e);
          }
        } else {
          // Mensagens de boas-vindas demonstrativas
          const dummyMessages: InternalMessage[] = [
            {
              id: 'msg-1',
              senderId: 'sup-demo',
              senderName: 'Supervisor Demo',
              receiverId: profile.uid,
              text: 'Olá! Favor verificar a promessa do cliente CPF 123.456.789-01 para hoje.',
              cpfReference: '12345678901',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              read: false,
              organizationId: profile.organizationId
            }
          ];
          setMessages(dummyMessages);
          localStorage.setItem(`sandbox_messages_${profile.organizationId}`, JSON.stringify(dummyMessages));
        }
      };

      loadSandboxMessages();
      const interval = setInterval(loadSandboxMessages, 3000);
      return () => clearInterval(interval);
    }

    // Leitura Firebase Firestore em Produção
    try {
      const q = query(
        collection(db, 'internal_messages'),
        where('organizationId', '==', profile.organizationId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: InternalMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.senderId === profile.uid || data.receiverId === profile.uid) {
            list.push({
              id: docSnap.id,
              senderId: data.senderId,
              senderName: data.senderName,
              receiverId: data.receiverId,
              text: data.text,
              cpfReference: data.cpfReference,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
              read: data.read || false,
              organizationId: data.organizationId
            });
          }
        });
        // Ordenar por data
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(list);
      }, (err) => {
        console.warn('Fallback Firestore chat:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [profile.organizationId, profile.uid]);

  // Rolar para a última mensagem da conversa ativa
  useEffect(() => {
    if (activeRecipient) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeRecipient]);

  // Marcar mensagens recebidas do usuário ativo como lidas
  useEffect(() => {
    if (activeRecipient && messages.length > 0) {
      const unreadMsgs = messages.filter(m => m.senderId === activeRecipient.uid && m.receiverId === profile.uid && !m.read);
      if (unreadMsgs.length > 0) {
        if (profile.organizationId === 'sandbox-test' || !db) {
          const updated = messages.map(m => (m.senderId === activeRecipient.uid && m.receiverId === profile.uid) ? { ...m, read: true } : m);
          setMessages(updated);
          localStorage.setItem(`sandbox_messages_${profile.organizationId}`, JSON.stringify(updated));
        } else {
          unreadMsgs.forEach(async (msg) => {
            try {
              await updateDoc(doc(db, 'internal_messages', msg.id), { read: true });
            } catch (e) {
              console.error(e);
            }
          });
        }
      }
    }
  }, [activeRecipient, messages, profile.organizationId, profile.uid]);

  // Mensagens não lidas globais para mostrar badge
  const unreadTotal = messages.filter(m => m.receiverId === profile.uid && !m.read).length;

  // Extrair CPFs do texto via Regex inteligente
  const extractCpfFromText = (text: string): string | undefined => {
    const cleanDigits = text.replace(/\D/g, '');
    const match = text.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
    if (match) return match[0].replace(/\D/g, '');
    if (cleanDigits.length === 11) return cleanDigits;
    return undefined;
  };

  // Enviar Mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeRecipient) return;

    const textToSend = inputText.trim();
    const detectedCpf = extractCpfFromText(textToSend);
    setInputText('');

    const newMsgObj: InternalMessage = {
      id: `msg-${Date.now()}`,
      senderId: profile.uid,
      senderName: profile.displayName || 'Usuário',
      receiverId: activeRecipient.uid,
      text: textToSend,
      cpfReference: detectedCpf,
      createdAt: new Date().toISOString(),
      read: false,
      organizationId: profile.organizationId || 'demo'
    };

    if (profile.organizationId === 'sandbox-test' || !db) {
      const updatedList = [...messages, newMsgObj];
      setMessages(updatedList);
      localStorage.setItem(`sandbox_messages_${profile.organizationId}`, JSON.stringify(updatedList));
      if (showToast) showToast('Mensagem enviada no Chat Interno', 'success');
      return;
    }

    try {
      await addDoc(collection(db, 'internal_messages'), {
        senderId: profile.uid,
        senderName: profile.displayName || 'Usuário',
        receiverId: activeRecipient.uid,
        text: textToSend,
        cpfReference: detectedCpf || null,
        createdAt: serverTimestamp(),
        read: false,
        organizationId: profile.organizationId
      });
      if (showToast) showToast('Mensagem enviada com sucesso', 'success');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      if (showToast) showToast('Erro ao enviar mensagem no chat.', 'error');
    }
  };

  // Renderizador de Texto da Mensagem com Reconhecimento Dinâmico de CPFs
  const renderMessageContent = (text: string) => {
    const cpfRegex = /(\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b)/g;
    const parts = text.split(cpfRegex);

    return parts.map((part, idx) => {
      if (part.match(cpfRegex)) {
        const cleanCpf = part.replace(/\D/g, '');
        return (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (onSelectCpf) {
                onSelectCpf(cleanCpf);
                if (showToast) showToast(`Abrindo cliente CPF: ${formatCPF(cleanCpf)}`, 'info');
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-mono font-bold text-xs border border-sky-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Clique para abrir este cliente no painel"
          >
            <FileText size={14} className="text-sky-400" />
            <span>CPF: {formatCPF(cleanCpf)}</span>
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Conversa ativa com o usuário selecionado
  const activeConversationMessages = activeRecipient 
    ? messages.filter(m => 
        (m.senderId === profile.uid && m.receiverId === activeRecipient.uid) ||
        (m.senderId === activeRecipient.uid && m.receiverId === profile.uid)
      )
    : [];

  return (
    <>
      {/* Botão Flutuante de Disparo no Canto Inferior Direito */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all ${
            isOpen 
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30'
          }`}
          title="Chat & Comunicação Interna"
        >
          {isOpen ? <X size={24} weight="bold" /> : <ChatCircleDots size={26} weight="duotone" />}

          {/* Badge de Mensagens Não Lidas */}
          {!isOpen && unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-slate-950 shadow-md animate-bounce">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </motion.button>
      </div>

      {/* Drawer / Painel de Chat Flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[520px] rounded-3xl z-50 flex flex-col overflow-hidden border shadow-2xl backdrop-blur-2xl ${
              theme === 'dark' 
                ? 'bg-slate-950/95 border-white/10 text-white shadow-black/60' 
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}
          >
            {/* Cabeçalho do Chat */}
            <div className="p-4 border-b border-white/10 bg-slate-900/60 flex items-center justify-between shrink-0">
              {activeRecipient ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveRecipient(null)}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Voltar para lista de contatos"
                  >
                    <ArrowLeft size={18} weight="bold" />
                  </button>
                  <Avatar
                    displayName={activeRecipient.displayName || 'Usuário'}
                    email={activeRecipient.email}
                    size="sm"
                    className="w-8 h-8"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{activeRecipient.displayName}</h4>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      {activeRecipient.jobTitle || activeRecipient.role}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <ChatCircleDots size={20} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span>Chat & Recados Internos</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Comunicação rápida e envio de CPFs</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo Principal: Lista de Contatos ou Chat Room */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!activeRecipient ? (
                /* TELA 1: LISTA DE CONTATOS DA EMPRESA */
                <div className="space-y-3">
                  {/* Busca por Colaborador */}
                  <div className="relative">
                    <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou cargo..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* Relação de Colaboradores */}
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      <User size={32} className="mx-auto mb-2 opacity-40" />
                      <p>Nenhum colaborador encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {availableUsers.map((user) => {
                        const userUnread = messages.filter(m => m.senderId === user.uid && m.receiverId === profile.uid && !m.read).length;
                        const lastMsg = messages.filter(m => (m.senderId === user.uid && m.receiverId === profile.uid) || (m.senderId === profile.uid && m.receiverId === user.uid)).pop();

                        return (
                          <button
                            key={user.uid}
                            onClick={() => setActiveRecipient(user)}
                            className="w-full p-3 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900 hover:border-sky-500/30 transition-all flex items-center justify-between text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <Avatar
                                  displayName={user.displayName || 'Usuário'}
                                  email={user.email}
                                  size="sm"
                                  className="w-9 h-9"
                                />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors truncate">
                                  {user.displayName}
                                </h5>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {lastMsg ? lastMsg.text : (user.jobTitle || user.role)}
                                </p>
                              </div>
                            </div>

                            {userUnread > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-black shrink-0 shadow-md">
                                {userUnread}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* TELA 2: HISTÓRICO DE MENSAGENS DO CHAT */
                <div className="space-y-3 min-h-full flex flex-col justify-end">
                  {activeConversationMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      <Sparkle size={28} className="mx-auto mb-2 text-sky-400 opacity-60" />
                      <p className="font-bold text-slate-400">Inicie uma conversa com {activeRecipient.displayName}</p>
                      <p className="text-[10px] mt-1 text-slate-500">Envie dúvidas ou digite um CPF para compartilhar</p>
                    </div>
                  ) : (
                    activeConversationMessages.map((msg) => {
                      const isMe = msg.senderId === profile.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-1 ${
                              isMe
                                ? 'bg-sky-600 text-white rounded-br-none shadow-md shadow-sky-600/20'
                                : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
                            }`}
                          >
                            <div className="break-words leading-relaxed">
                              {renderMessageContent(msg.text)}
                            </div>
                            <div className={`flex items-center gap-1 text-[9px] ${isMe ? 'text-sky-200 justify-end' : 'text-slate-500'}`}>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && <Checks size={12} className={msg.read ? 'text-emerald-300' : 'text-sky-300'} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Rodapé: Input de Envio (Apenas na tela de chat ativo) */}
            {activeRecipient && (
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-slate-900/80 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Digite sua mensagem ou digite um CPF..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white transition-all cursor-pointer shrink-0 shadow-md shadow-sky-500/20"
                  title="Enviar mensagem"
                >
                  <PaperPlaneRight size={16} weight="fill" />
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
