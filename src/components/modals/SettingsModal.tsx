import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gear, 
  X, 
  Plus, 
  Check, 
  Phone, 
  ChatCircleText, 
  Tag, 
  Calculator, 
  Bell, 
  ShieldCheck, 
  Circle, 
  CheckCircle, 
  Trash, 
  Sparkle 
} from '@phosphor-icons/react';
import { UserProfile, ContactChannelConfig, TabulationReasonConfig } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onOpenReconciliation?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

const DEFAULT_CHANNELS: ContactChannelConfig[] = [
  { id: 'ch-voz', name: 'Voz / Telefone', code: 'voz', active: true, color: '#38bdf8' },
  { id: 'ch-chat', name: 'Chat Online', code: 'chat', active: true, color: '#34d399' },
  { id: 'ch-webphone', name: 'Webphone / Discador', code: 'webphone', active: true, color: '#fbbf24' },
  { id: 'ch-oktor', name: 'Oktor VoIP', code: 'oktor', active: true, color: '#a78bfa' },
  { id: 'ch-salesforce', name: 'Salesforce CRM', code: 'salesforce', active: true, color: '#f472b6' },
  { id: 'ch-whatsapp', name: 'WhatsApp Oficial', code: 'whatsapp', active: true, color: '#10b981' },
  { id: 'ch-quite', name: 'Quite Digital', code: 'quite_digital', active: true, color: '#fb923c' }
];

const DEFAULT_REASONS: TabulationReasonConfig[] = [
  { id: 'r-1', title: '💬 Solicitação de Código PIX com Desconto', isNegotiation: true, isSuccess: true, active: true },
  { id: 'r-2', title: '💸 Falta de Limite / Parcelamento de Saldo', isNegotiation: true, isSuccess: true, active: true },
  { id: 'r-3', title: '⏳ Aguardando Salário / Adiantamento Quinzena', isNegotiation: true, isSuccess: false, active: true },
  { id: 'r-4', title: '🔍 Dúvida sobre Compensação Bancária', isNegotiation: false, isSuccess: false, active: true },
  { id: 'r-5', title: '📱 Problemas no App / Erro de Boleto', isNegotiation: false, isSuccess: false, active: true },
  { id: 'r-6', title: '🚨 Contestação de Encargos / Solicitação de Isenção', isNegotiation: true, isSuccess: false, active: true },
  { id: 'r-7', title: '🤝 Solicitação de Segunda Via de Acordo', isNegotiation: false, isSuccess: true, active: true }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenReconciliation,
  showToast,
  theme = 'dark'
}) => {
  const isLeadership = ['manager', 'coordinator', 'supervisor', 'super_admin'].includes(profile.role);
  
  const [activeTab, setActiveTab] = useState<'channels' | 'reasons' | 'preferences'>(
    isLeadership ? 'channels' : 'preferences'
  );

  const [channels, setChannels] = useState<ContactChannelConfig[]>(DEFAULT_CHANNELS);
  const [reasons, setReasons] = useState<TabulationReasonConfig[]>(DEFAULT_REASONS);

  // Estados dos formulários de adição
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelColor, setNewChannelColor] = useState('#38bdf8');
  
  const [newReasonTitle, setNewReasonTitle] = useState('');
  const [newReasonIsNegotiation, setNewReasonIsNegotiation] = useState(true);
  const [newReasonIsSuccess, setNewReasonIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Carregar configurações da organização
    if (profile.organizationId === 'sandbox-test') {
      const org = sandboxService.getOrganization ? sandboxService.getOrganization(profile.organizationId) : null;
      if (org?.contactChannels && org.contactChannels.length > 0) {
        setChannels(org.contactChannels);
      }
      if (org?.tabulationReasons && org.tabulationReasons.length > 0) {
        setReasons(org.tabulationReasons);
      }
    }
  }, [isOpen, profile.organizationId]);

  if (!isOpen) return null;

  const handleToggleChannel = (id: string) => {
    const updated = channels.map(c => c.id === id ? { ...c, active: !c.active } : c);
    setChannels(updated);
    saveChannels(updated);
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const newChan: ContactChannelConfig = {
      id: `ch-custom-${Date.now()}`,
      name: newChannelName.trim(),
      code: newChannelName.trim().toLowerCase().replace(/\s+/g, '_'),
      active: true,
      color: newChannelColor
    };

    const updated = [...channels, newChan];
    setChannels(updated);
    saveChannels(updated);
    setNewChannelName('');
    showToast('Canal de atendimento adicionado com sucesso!', 'success');
  };

  const saveChannels = async (updated: ContactChannelConfig[]) => {
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.updateOrganization?.(profile.organizationId, { contactChannels: updated });
    } else if (profile.organizationId) {
      try {
        await updateDoc(doc(db, 'organizations', profile.organizationId), { contactChannels: updated });
      } catch (err) {
        console.error('Erro ao salvar canais:', err);
      }
    }
  };

  const handleToggleReason = (id: string) => {
    const updated = reasons.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setReasons(updated);
    saveReasons(updated);
  };

  const handleAddReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonTitle.trim()) return;

    const newReas: TabulationReasonConfig = {
      id: `reas-custom-${Date.now()}`,
      title: newReasonTitle.trim(),
      isNegotiation: newReasonIsNegotiation,
      isSuccess: newReasonIsSuccess,
      active: true
    };

    const updated = [...reasons, newReas];
    setReasons(updated);
    saveReasons(updated);
    setNewReasonTitle('');
    showToast('Motivo de objeção adicionado com sucesso!', 'success');
  };

  const saveReasons = async (updated: TabulationReasonConfig[]) => {
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.updateOrganization?.(profile.organizationId, { tabulationReasons: updated });
    } else if (profile.organizationId) {
      try {
        await updateDoc(doc(db, 'organizations', profile.organizationId), { tabulationReasons: updated });
      } catch (err) {
        console.error('Erro ao salvar motivos:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-3xl p-6 rounded-3xl border shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] ${
            theme === 'dark' ? 'bg-slate-900 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Gear size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider">Central de Configurações</h2>
                <p className="text-xs text-slate-400">
                  {isLeadership ? 'Governança operacional de canais, motivos e preferências' : 'Minhas preferências e atalhos do sistema'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sub-Abas de Navegação */}
          <div className="flex items-center gap-2 mt-4 border-b border-white/5 pb-3 overflow-x-auto shrink-0">
            {isLeadership && (
              <>
                <button
                  onClick={() => setActiveTab('channels')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'channels'
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Phone size={16} />
                  <span>📱 Canais de Contato ({channels.filter(c => c.active).length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('reasons')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'reasons'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Tag size={16} />
                  <span>🏷️ Motivos de Objeção ({reasons.filter(r => r.active).length})</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sparkle size={16} />
              <span>⚙️ Minhas Preferências & Atalhos</span>
            </button>
          </div>

          {/* Conteúdo da Aba */}
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* ABA 1: CANAIS DE CONTATO (LIDERANÇA) */}
            {activeTab === 'channels' && isLeadership && (
              <div className="space-y-6">
                {/* Lista de Canais Ativos/Inativos */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Canais de Atendimento Habilitados na Operação
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {channels.map((chan) => (
                      <div
                        key={chan.id}
                        onClick={() => handleToggleChannel(chan.id)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          chan.active
                            ? 'bg-slate-800/60 border-white/10 hover:border-sky-500/40'
                            : 'bg-slate-900/30 border-white/5 opacity-50 hover:opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: chan.color || '#38bdf8' }}
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{chan.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Código: {chan.code}</span>
                          </div>
                        </div>

                        {chan.active ? (
                          <CheckCircle size={20} className="text-sky-400 shrink-0" weight="fill" />
                        ) : (
                          <Circle size={20} className="text-slate-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulário de Adicionar Novo Canal */}
                <form onSubmit={handleAddChannel} className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Plus size={16} className="text-sky-400" />
                    <span>Adicionar Novo Canal Customizado</span>
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="text"
                      placeholder="Nome do Canal (ex: WhatsApp VIP, Telefone Ativo)"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 outline-none focus:border-sky-500/50"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Cor:</span>
                      <input
                        type="color"
                        value={newChannelColor}
                        onChange={(e) => setNewChannelColor(e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                      />

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-sky-600/20"
                      >
                        Salvar Canal
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* ABA 2: MOTIVOS DE OBJEÇÃO (LIDERANÇA) */}
            {activeTab === 'reasons' && isLeadership && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Catálogo de Motivos de Tabulação & Objeções
                  </h3>

                  <div className="space-y-2">
                    {reasons.map((reas) => (
                      <div
                        key={reas.id}
                        onClick={() => handleToggleReason(reas.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          reas.active
                            ? 'bg-slate-800/60 border-white/10 hover:border-amber-500/40'
                            : 'bg-slate-900/30 border-white/5 opacity-50 hover:opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Tag size={18} className="text-amber-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-200">{reas.title}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {reas.isNegotiation && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-bold">
                              Negociação
                            </span>
                          )}
                          {reas.isSuccess && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                              Sucesso
                            </span>
                          )}
                          {reas.active ? (
                            <CheckCircle size={18} className="text-amber-400" weight="fill" />
                          ) : (
                            <Circle size={18} className="text-slate-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulário Novo Motivo */}
                <form onSubmit={handleAddReason} className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Plus size={16} className="text-amber-400" />
                    <span>Adicionar Novo Motivo de Tabulação</span>
                  </h4>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Título do Motivo (ex: Aguardando Liberação de FGTS)"
                      value={newReasonTitle}
                      onChange={(e) => setNewReasonTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 outline-none focus:border-amber-500/50"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newReasonIsNegotiation}
                            onChange={(e) => setNewReasonIsNegotiation(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500"
                          />
                          <span>Exige Negociação Ativa</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newReasonIsSuccess}
                            onChange={(e) => setNewReasonIsSuccess(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500"
                          />
                          <span>Indica Sucesso / Acordo</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-600/20"
                      >
                        Salvar Motivo
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* ABA 3: MINHAS PREFERÊNCIAS & ATALHOS (TODOS OS PERFIS) */}
            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Atalhos Operacionais & Preferências do Usuário
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Atalho Conciliação */}
                    {onOpenReconciliation && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenReconciliation();
                        }}
                        className="p-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Calculator size={22} className="text-sky-400" />
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">Atalho</span>
                        </div>
                        <span className="text-xs font-bold text-slate-200 block group-hover:text-sky-300">Conciliação de Acordos</span>
                        <span className="text-[10px] text-slate-400">Confrontar saldos liquidados vs. sistema</span>
                      </button>
                    )}

                    {/* Resumo do Perfil */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <ShieldCheck size={22} className="text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Perfil</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 block">{profile.displayName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{profile.email}</span>
                      <span className="text-[10px] font-bold text-sky-400 uppercase mt-1 block">Cargo: {profile.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Concluir & Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
