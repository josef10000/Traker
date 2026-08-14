import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Copy, 
  Check, 
  Trash, 
  BuildingOffice, 
  ShieldCheck, 
  UserGear, 
  UserCheck, 
  Link,
  Sparkle,
  Info,
  ListChecks,
  EnvelopeSimple,
  PaperPlaneRight
} from '@phosphor-icons/react';
import { UserRole } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { generateSecureToken } from '../../lib/teams';
import { sendInviteEmail } from '../../services/emailService';

interface CompanyUserSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  maxUsers?: number;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  teamId?: string;
  monthlyServiceValue?: number;
  createdAt: string;
}

const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'super_admin':
      return '👑 Administrador Master';
    case 'manager':
      return '🏢 Gerente da Empresa';
    case 'coordinator':
      return '🎯 Coordenador de Operações';
    case 'supervisor':
      return '👥 Supervisor de Equipe';
    case 'monitor':
      return '🛡️ Monitor / QA';
    case 'backoffice':
      return '📋 Backoffice';
    case 'member':
    default:
      return '🎧 Operador';
  }
};

export const CompanyUserSetupModal: React.FC<CompanyUserSetupModalProps> = ({
  isOpen,
  onClose,
  orgId,
  orgName,
  maxUsers = 50,
  showToast
}) => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Linhas de cadastro de convite no Setup
  const [setupRows, setSetupRows] = useState<Array<{
    email: string;
    role: UserRole;
    teamId: string;
    monthlyServiceValue: number;
  }>>([
    { email: '', role: 'manager', teamId: '', monthlyServiceValue: 0 }
  ]);

  // Ouvinte em tempo real dos convites da empresa
  useEffect(() => {
    if (!isOpen || !orgId) return;

    const q = query(collection(db, 'invites'), where('organizationId', '==', orgId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: PendingInvite[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as PendingInvite));
      setPendingInvites(list);
    }, (err) => {
      console.error('Erro ao ouvir convites da empresa:', err);
    });

    return () => unsubscribe();
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  // Adicionar linha de cadastro no Setup
  const handleAddRow = () => {
    setSetupRows(prev => [...prev, { email: '', role: 'supervisor', teamId: '', monthlyServiceValue: 0 }]);
  };

  // Remover linha
  const handleRemoveRow = (index: number) => {
    if (setupRows.length === 1) return;
    setSetupRows(prev => prev.filter((_, i) => i !== index));
  };

  // Alterar campo da linha
  const handleRowChange = (index: number, field: string, value: any) => {
    setSetupRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Criar e Gerar Links de Convite
  const handleCreateInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = setupRows.filter(r => r.email.trim() && r.email.includes('@'));
    if (validRows.length === 0) {
      showToast('Preencha ao menos um e-mail válido para gerar o convite.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const createdList: PendingInvite[] = [];

      for (const row of validRows) {
        const token = `inv-${generateSecureToken(8).toLowerCase()}`;
        const inviteUrl = `${window.location.origin}/register?invite=${token}`;
        const roleLabel = getRoleLabel(row.role);

        // Disparo automático via Resend
        const emailRes = await sendInviteEmail({
          recipientEmail: row.email.trim().toLowerCase(),
          orgName: orgName,
          roleName: roleLabel,
          inviteUrl: inviteUrl
        });

        const inviteDoc: any = {
          organizationId: orgId,
          orgName: orgName,
          email: row.email.trim().toLowerCase(),
          role: row.role,
          token,
          createdAt: now,
          status: 'pending',
          emailSent: emailRes.success
        };

        if (row.monthlyServiceValue && row.monthlyServiceValue > 0) {
          inviteDoc.monthlyServiceValue = Number(row.monthlyServiceValue);
        }

        await setDoc(doc(db, 'invites', token), inviteDoc);
        createdList.push({ id: token, ...inviteDoc });
      }

      showToast(`${createdList.length} convite(s) gerado(s) e enviado(s) por e-mail com sucesso!`, 'success');
      setSetupRows([{ email: '', role: 'supervisor', teamId: '', monthlyServiceValue: 0 }]);
    } catch (error) {
      console.error('Erro ao gerar convites de setup:', error);
      showToast('Erro ao gerar links de convite.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar E-mail de Convite Individual via Resend
  const handleResendEmail = async (inv: PendingInvite) => {
    const inviteUrl = `${window.location.origin}/register?invite=${inv.token}`;
    const roleLabel = getRoleLabel(inv.role);

    showToast(`Reenviando e-mail para ${inv.email}...`, 'success');
    const emailRes = await sendInviteEmail({
      recipientEmail: inv.email,
      orgName: orgName,
      roleName: roleLabel,
      inviteUrl: inviteUrl
    });

    if (emailRes.success) {
      showToast(`E-mail reenviado com sucesso para ${inv.email}!`, 'success');
    } else {
      showToast(`Falha ao reenviar e-mail: ${emailRes.error}`, 'error');
    }
  };

  // Copiar link individual
  const handleCopySingleLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    showToast('Link de convite copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  // Copiar todos os links em lote para WhatsApp/Telegram
  const handleCopyBatchLinks = () => {
    if (pendingInvites.length === 0) return;

    let text = `🚀 *Links de Acesso e Setup — ${orgName}*\n\n`;
    pendingInvites.forEach(inv => {
      const roleLabel = getRoleLabel(inv.role);
      text += `👤 *${inv.email}* (${roleLabel}):\n🔗 ${window.location.origin}/register?invite=${inv.token}\n\n`;
    });

    navigator.clipboard.writeText(text.trim());
    setCopiedBatch(true);
    showToast('Todos os links foram copiados em lote formatado!', 'success');
    setTimeout(() => setCopiedBatch(false), 3000);
  };

  // Revogar / Excluir Convite
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      showToast('Convite revogado com sucesso!', 'success');
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error('Erro ao revogar convite:', error);
      showToast('Erro ao revogar convite.', 'error');
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
        className="w-full max-w-3xl my-8 p-6 rounded-3xl border-2 bg-slate-900 border-white/10 text-white shadow-2xl space-y-6 cursor-default"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BuildingOffice size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <span>Setup Inicial de Usuários — {orgName}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Empresa Ativa
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre os e-mails e cargos da liderança ou colaboradores para disparar os e-mails via Resend e gerar os links.
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

        {/* Banner Informativo */}
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-3">
          <Info size={22} className="text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-white font-black block">💡 Dupla Garantia de Entrega (Resend + WhatsApp):</strong>
            <p className="text-purple-200/90 leading-relaxed">
              Os e-mails de convite são enviados automaticamente via <strong>Resend</strong> para a caixa de entrada dos colaboradores. Você também pode copiar o link individual ou em lote para enviar via WhatsApp.
            </p>
          </div>
        </div>

        {/* FORMULÁRIO DE GERAÇÃO DE CONVITES EM LOTE */}
        <form onSubmit={handleCreateInvites} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ListChecks size={16} className="text-purple-400" />
              Novos Convites a Gerar:
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} /> Adicionar Linha
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {setupRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 items-center">
                <div className="sm:col-span-5">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">E-mail do Colaborador</label>
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => handleRowChange(idx, 'email', e.target.value)}
                    placeholder="colaborador@empresa.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:border-purple-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cargo Pré-Definido</label>
                  <select
                    value={row.role}
                    onChange={(e) => handleRowChange(idx, 'role', e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:border-purple-500 transition-all"
                  >
                    <option value="manager">🏢 Gerente da Empresa</option>
                    <option value="coordinator">🎯 Coordenador de Operações</option>
                    <option value="supervisor">👥 Supervisor de Equipe</option>
                    <option value="monitor">🛡️ Monitor / QA</option>
                    <option value="backoffice">📋 Backoffice</option>
                    <option value="member">🎧 Operador de Cobrança</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1" title="Opcional no Setup (Definido posteriormente pela Liderança)">
                    Prestação (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Opcional"
                    value={row.monthlyServiceValue || ''}
                    onChange={(e) => handleRowChange(idx, 'monthlyServiceValue', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-mono font-bold focus:border-purple-500 transition-all"
                  />
                </div>

                <div className="sm:col-span-1 flex items-center justify-center pt-4 sm:pt-0">
                  {setupRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remover linha"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <PaperPlaneRight size={16} weight="bold" />
              Enviar E-mails & Gerar Links
            </button>
          </div>
        </form>

        {/* LISTA DE CONVITES PENDENTES COM BOTÕES DE E-MAIL E CÓPIA */}
        <div className="space-y-3 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Link size={16} className="text-sky-400" />
              Convites Ativos ({pendingInvites.length}):
            </h4>

            {pendingInvites.length > 0 && (
              <button
                type="button"
                onClick={handleCopyBatchLinks}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/30 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedBatch ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedBatch ? 'Todos Copiados!' : 'Copiar Todos em Lote (WhatsApp)'}
              </button>
            )}
          </div>

          {pendingInvites.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {pendingInvites.map(inv => {
                const isCopied = copiedToken === inv.token;
                const roleLabel = getRoleLabel(inv.role);

                return (
                  <div key={inv.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-bold">{inv.email}</strong>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {roleLabel}
                        </span>
                        {inv.monthlyServiceValue && inv.monthlyServiceValue > 0 && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            R$ {inv.monthlyServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Token: {inv.token}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResendEmail(inv)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reenviar e-mail de convite via Resend"
                      >
                        <PaperPlaneRight size={14} />
                        Reenviar E-mail
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopySingleLink(inv.token)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isCopied
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                        }`}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        {isCopied ? 'Copiado!' : 'Copiar Link'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Revogar convite"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-400">
              Nenhum convite ativo para esta empresa. Cadastre os e-mails acima e clique em "Enviar E-mails & Gerar Links".
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="flex justify-end border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs cursor-pointer transition-all"
          >
            Concluir Setup da Empresa
          </button>
        </div>
      </motion.div>
    </div>
  );
};
