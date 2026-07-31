import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { Agreement, AgreementStatus, Team, UserProfile } from '../../types';
import { formatCurrency, maskCPF, blindMaskCPF } from '../../utils/masks';
import { OriginBadge } from './OriginBadge';
import { CustomSelect } from '../ui/CustomSelect';
import { ShieldWarning as ShieldAlert, Download, CheckSquare, Square, Eye, EyeClosed as EyeOff, Play, Users, Calendar, Question as HelpCircle, CircleNotch as Loader2, UserPlus, LockLaminated as Lock, Clock } from '@phosphor-icons/react';
import { ExportCpfModal } from '../modals/ExportCpfModal';
import { logAudit } from '../../lib/audit';
import { exportToCsv } from '../../utils/csvExporter';
import { ExcelExportModal } from '../modals/ExcelExportModal';
import { ExcelExportColumn } from '../../utils/excelExport';

interface RecoveryPoolTabProps {
  profile: UserProfile;
  managedTeamsData: Team[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onAttend: (agreement: Agreement) => void;
  onTakeOverSuccess?: () => void;
  theme?: 'light' | 'dark';
}

export const RecoveryPoolTab = ({
  profile,
  managedTeamsData,
  showToast,
  onAttend,
  onTakeOverSuccess,
  theme = 'dark'
}: RecoveryPoolTabProps) => {
  const [subTab, setSubTab] = useState<'pool' | 'my_batch'>('pool');
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, boolean>>({});
  const [teamOperators, setTeamOperators] = useState<UserProfile[]>([]);
  
  // Perfil de Gestão
  const isManager = profile.role !== 'member';

  // Filtros
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Trava para que perfis de gestão que não fazem atendimento fiquem estritamente no Pool
  useEffect(() => {
    if (profile.role !== 'member' && subTab === 'my_batch') {
      setSubTab('pool');
    }
  }, [profile.role, subTab]);

  // Modal de Exportação CPF
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExcelExportModalOpen, setIsExcelExportModalOpen] = useState(false);

  // Lista de todos os acordos da organização para identificar resgatados e calcular valor recuperado R$
  const [allOrgAgreements, setAllOrgAgreements] = useState<Agreement[]>([]);

  // Carrega operadores da equipe/organização para atribuição do supervisor
  useEffect(() => {
    if (!profile.organizationId) return;
    const qUsers = query(
      collection(db, 'users'),
      where('organizationId', '==', profile.organizationId)
    );
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setTeamOperators(usersData);
    });
    return () => unsubUsers();
  }, [profile.organizationId]);

  // Cópia automática de CPF em 1 clique
  const handleCopyCpf = (cpf: string) => {
    if (!cpf) return;
    const clean = cpf.replace(/\D/g, '');
    navigator.clipboard.writeText(clean);
    showToast(`CPF ${cpf} copiado para a área de transferência!`, 'success');
  };

  // Tempo relativo desde a quebra
  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Quebrado recentemente';
    const now = new Date();
    const past = new Date(dateStr);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffDays >= 1) {
      return `Quebrado há ${diffDays}d`;
    } else if (diffHours >= 1) {
      return `Quebrado há ${diffHours}h`;
    } else {
      return 'Quebrado há <1h';
    }
  };

  // Escuta em tempo real dos acordos quebrados da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    setLoading(true);

    if (profile.organizationId === 'sandbox-test') {
      const syncSandbox = () => {
        const list = sandboxService.getAllAgreements(profile.organizationId);
        setAllOrgAgreements(list);
        const brokenOrWaiting = list.filter(a => a.status === AgreementStatus.BROKEN || (a.status === AgreementStatus.WAITING && a.notes?.includes('[Recuperação]')));
        brokenOrWaiting.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAgreements(brokenOrWaiting);
        setLoading(false);
      };
      syncSandbox();
      return sandboxService.subscribe(syncSandbox);
    }

    const q = query(
      collection(db, 'agreements'),
      where('organizationId', '==', profile.organizationId),
      where('status', 'in', [AgreementStatus.BROKEN, AgreementStatus.WAITING])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAgreements(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar acordos do balcão:", error);
      setLoading(false);
      showToast('Erro ao carregar acordos do balcão.', 'error');
    });

    const qAll = query(
      collection(db, 'agreements'),
      where('organizationId', '==', profile.organizationId)
    );
    const unSubAll = onSnapshot(qAll, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      setAllOrgAgreements(data);
    });

    return () => {
      unsubscribe();
      unSubAll();
    };
  }, [profile.organizationId]);

  // Baixa automática por coincidência de CPF quando um novo acordo é cadastrado no sistema
  useEffect(() => {
    if (agreements.length === 0 || allOrgAgreements.length === 0) return;

    const activeOrPaidCpfs = new Set(
      allOrgAgreements
        .filter(a => a.status !== AgreementStatus.BROKEN && a.clientCpf)
        .map(a => (a.clientCpf || '').replace(/\D/g, ''))
    );

    const matches = agreements.filter(broken => {
      if (!broken.clientCpf) return false;
      const clean = broken.clientCpf.replace(/\D/g, '');
      return activeOrPaidCpfs.has(clean);
    });

    if (matches.length > 0) {
      matches.forEach(async (broken) => {
        if (profile.organizationId === 'sandbox-test') {
          sandboxService.resolveBrokenAgreements(profile.organizationId, broken.clientCpf);
        } else {
          await updateDoc(doc(db, 'agreements', broken.id), {
            status: AgreementStatus.RECOVERED,
            updatedAt: new Date().toISOString()
          });
        }
      });
    }
  }, [agreements, allOrgAgreements, profile.organizationId]);

  // Contadores para as sub-abas
  const poolCount = useMemo(() => {
    return agreements.filter(a => (!a.operatorId || a.operatorId !== profile.uid) && a.status === AgreementStatus.BROKEN).length;
  }, [agreements, profile.uid]);

  const myBatchCount = useMemo(() => {
    return agreements.filter(a => a.operatorId === profile.uid).length;
  }, [agreements, profile.uid]);

  // Filtragem dos acordos por sub-aba e campos
  const filteredAgreements = useMemo(() => {
    return agreements.filter(a => {
      const matchTeam = filterTeam === 'all' || a.teamId === filterTeam;
      const matchType = filterType === 'all' || a.type === filterType;
      const matchCategory = filterCategory === 'all' || a.category === filterCategory;

      if (subTab === 'my_batch') {
        const isMine = a.operatorId === profile.uid;
        return isMine && matchTeam && matchType && matchCategory;
      } else {
        const isPool = (!a.operatorId || a.operatorId !== profile.uid) && a.status === AgreementStatus.BROKEN;
        return isPool && matchTeam && matchType && matchCategory;
      }
    });
  }, [agreements, subTab, profile.uid, filterTeam, filterType, filterCategory]);

  const isMember = profile.role === 'member';

  // Regra de Segurança RBAC / Fila Cega: Operador só pode exportar CPF completo se já assumiu o cliente
  const hasUnassumedClients = useMemo(() => {
    if (!isMember) return false;
    return filteredAgreements.some(a => a.operatorId !== profile.uid);
  }, [isMember, filteredAgreements, profile.uid]);

  const forceCpfMasked = isMember && hasUnassumedClients;
  const cpfMaskReason = "🔒 Como operador, você só tem acesso ao CPF completo de clientes que já assumiu em sua carteira ativa. Os clientes da fila geral são exportados com CPF mascarado por segurança.";

  const recoveryExportColumns: ExcelExportColumn[] = [
    { key: 'id', label: 'ID do Acordo', type: 'text' },
    { key: 'clientCpf', label: 'CPF / CNPJ do Cliente', type: 'cpf' },
    { key: 'clientName', label: 'Nome do Cliente', type: 'text' },
    { key: 'phone', label: 'Telefone de Contato', type: 'text' },
    { key: 'value', label: 'Valor do Acordo (R$)', type: 'currency' },
    { key: 'dueDate', label: 'Vencimento', type: 'date' },
    { key: 'status', label: 'Status do Acordo', type: 'text' },
    { key: 'origin', label: 'Origem', type: 'text' },
    { key: 'createdAt', label: 'Data de Criação', type: 'date' }
  ];

  const recoveryExportData = useMemo(() => {
    return filteredAgreements.map(a => {
      // Se for operador comum e o cliente ainda não foi assumido por ele, mascara o CPF na fonte
      const canSeeFullCpf = !isMember || a.operatorId === profile.uid;
      const formattedCpf = canSeeFullCpf ? a.clientCpf : blindMaskCPF(a.clientCpf);

      return {
        ...a,
        clientCpf: formattedCpf,
        phone: a.phone || '-',
        dueDate: a.dueDate ? a.dueDate.split('-').reverse().join('/') : '-'
      };
    });
  }, [filteredAgreements, isMember, profile.uid]);

  // Selecionar / Deselecionar todos
  const handleSelectAll = () => {
    if (selectedIds.length === filteredAgreements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgreements.map(a => a.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Revelar CPF com auditoria (Supervisor/Gerente)
  const handleRevealCpf = (agreement: Agreement) => {
    const isRevealed = revealedCpfs[agreement.id];
    if (!isRevealed) {
      logAudit('REVEAL_CPF', { cpf: agreement.clientCpf, context: 'RecoveryPool' }, profile.displayName || '', profile.organizationId);
    }
    setRevealedCpfs(prev => ({ ...prev, [agreement.id]: !isRevealed }));
  };

  // Assumir Cliente Individual (Fila Cega)
  const handleTakeOverSingle = async (agreement: Agreement) => {
    if (!profile.teamId) {
      showToast('Você precisa estar associado a uma equipe para assumir o acordo.', 'error');
      return;
    }

    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateAgreement(agreement.id, {
          operatorId: profile.uid,
          teamId: profile.teamId,
          status: AgreementStatus.WAITING,
          notes: `[Fila Cega] Acordo assumido da Fila por ${profile.displayName || 'Operador'}.`
        });
      } else {
        await updateDoc(doc(db, 'agreements', agreement.id), {
          operatorId: profile.uid,
          teamId: profile.teamId,
          status: AgreementStatus.WAITING,
          notes: `[Fila Cega] Acordo assumido da Fila por ${profile.displayName}.`
        });
      }
      showToast(`Cliente ${agreement.clientName || ''} assumido com sucesso! Dados revelados.`, 'success');
      if (onTakeOverSuccess) onTakeOverSuccess();
    } catch (error) {
      console.error("Erro ao assumir cliente:", error);
      showToast('Erro ao assumir cliente.', 'error');
    }
  };

  // Atribuição Direta pelo Supervisor
  const handleAssignSingle = async (agreementId: string, targetOperatorId: string) => {
    if (!targetOperatorId) return;
    const targetOp = teamOperators.find(u => u.uid === targetOperatorId);
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateAgreement(agreementId, {
          operatorId: targetOperatorId,
          teamId: targetOp?.teamId || profile.teamId || '',
          status: AgreementStatus.WAITING,
          notes: `[Governança] Acordo atribuído diretamente para ${targetOp?.displayName || 'Operador'} por ${profile.displayName}.`
        });
      } else {
        await updateDoc(doc(db, 'agreements', agreementId), {
          operatorId: targetOperatorId,
          teamId: targetOp?.teamId || profile.teamId || '',
          status: AgreementStatus.WAITING,
          notes: `[Governança] Acordo atribuído diretamente para ${targetOp?.displayName || 'Operador'} por ${profile.displayName}.`
        });
      }
      showToast(`Acordo atribuído diretamente a ${targetOp?.displayName || 'Operador'}!`, 'success');
    } catch (error) {
      console.error("Erro ao atribuir acordo:", error);
      showToast('Erro ao atribuir acordo.', 'error');
    }
  };

  // Assumir Lote de acordos
  const handleTakeOver = async () => {
    if (selectedIds.length === 0) return;
    if (!profile.teamId) {
      showToast('Você precisa estar associado a uma equipe para assumir acordos.', 'error');
      return;
    }

    try {
      if (profile.organizationId === 'sandbox-test') {
        selectedIds.forEach(id => {
          sandboxService.updateAgreement(id, {
            operatorId: profile.uid,
            teamId: profile.teamId,
            status: AgreementStatus.WAITING,
            notes: `[Recuperação] Acordo assumido do balcão por ${profile.displayName || 'Operador'}.`
          });
        });
        showToast(`${selectedIds.length} acordo(s) assumido(s) com sucesso! Adicionado(s) à sua lista de Entrar em Contato.`, 'success');
        setSelectedIds([]);
        if (onTakeOverSuccess) {
          onTakeOverSuccess();
        }
        return;
      }

      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const agreementRef = doc(db, 'agreements', id);
        batch.update(agreementRef, {
          operatorId: profile.uid,
          teamId: profile.teamId,
          status: AgreementStatus.WAITING,
          notes: `[Recuperação] Acordo assumido do balcão por ${profile.displayName}.`
        });
      });

      await batch.commit();
      showToast(`${selectedIds.length} acordo(s) assumido(s) com sucesso! Adicionado(s) à sua lista de Entrar em Contato.`, 'success');
      setSelectedIds([]);
      if (onTakeOverSuccess) {
        onTakeOverSuccess();
      }
    } catch (error) {
      console.error("Erro ao assumir lote:", error);
      showToast('Erro ao assumir acordos.', 'error');
    }
  };

  // Exportação CSV de acordo com a LGPD
  const handleExport = (complete: boolean) => {
    const targets = selectedIds.length > 0 
      ? filteredAgreements.filter(a => selectedIds.includes(a.id))
      : filteredAgreements;

    if (targets.length === 0) {
      showToast('Nenhum registro para exportar.', 'warning');
      return;
    }

    try {
      const headers = ['Cliente', 'CPF', 'Valor (R$)', 'Vencimento Original', 'Origem', 'Tipo', 'Categoria', 'Data Registro'];
      const rows = targets.map(a => [
        a.clientName || 'Sem nome',
        complete ? a.clientCpf : maskCPF(a.clientCpf),
        formatCurrency(a.value),
        a.dueDate ? a.dueDate.split('-').reverse().join('/') : '',
        a.origin || '',
        a.type ? a.type.replace('_', ' ') : '',
        a.category || '',
        new Date(a.createdAt).toLocaleDateString('pt-BR')
      ]);

      exportToCsv({
        filename: `balcao_recuperacao_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      });

      logAudit('EXPORT_CSV', { count: targets.length, type: complete ? 'complete' : 'masked', context: 'RecoveryPool' }, profile.displayName || '', profile.organizationId);
      showToast('Planilha de recuperação exportada com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar CSV.', 'error');
    }
  };

  // Métricas do Balcão de Recuperação e Valor Recuperado R$
  const recoveryKPIs = useMemo(() => {
    let totalRecoveredValue = 0;
    let recoveredCount = 0;

    allOrgAgreements.forEach(ag => {
      if (ag.status === AgreementStatus.RECOVERED) {
        recoveredCount++;
        totalRecoveredValue += ag.value || 0;
      } else if (ag.status === AgreementStatus.PAID && ag.clientCpf) {
        const cleanCpf = ag.clientCpf.replace(/\D/g, '');
        const isFromBroken = allOrgAgreements.some(other => other.clientCpf && other.clientCpf.replace(/\D/g, '') === cleanCpf && (other.status === AgreementStatus.BROKEN || other.status === AgreementStatus.RECOVERED));
        if (isFromBroken) {
          recoveredCount++;
          totalRecoveredValue += ag.value || 0;
        }
      }
    });

    const pendingBrokenValue = filteredAgreements.reduce((acc, curr) => acc + curr.value, 0);

    return {
      totalRecoveredValue,
      recoveredCount,
      pendingBrokenCount: filteredAgreements.length,
      pendingBrokenValue
    };
  }, [allOrgAgreements, filteredAgreements]);

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Header de Oportunidades do Pool (Transparência Coletiva) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 border border-sky-500/20 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase tracking-widest animate-pulse flex items-center gap-1">
                🎯 Pool de Oportunidades Coletivo
              </span>
              <span className="text-xs text-slate-400 font-medium">Urgência na Sala</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Soma Total em R$ da Fila de Recuperação
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Fila Cega com governança LGPD e combate ao garimpo de contas. Assuma contratos para desbloquear os dados completos.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Valor Total do Pool</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {formatCurrency(recoveryKPIs.pendingBrokenValue)}
              </span>
            </div>
            <div className="h-10 w-[1px] bg-white/10"></div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Contratos Pendentes</span>
              <span className="text-2xl md:text-3xl font-black text-sky-400 font-mono tracking-tight">
                {recoveryKPIs.pendingBrokenCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quadro de Resumo e KPIs de Recuperação */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Valor Recuperado */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-emerald-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Valor Recuperado</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Pago</span>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {formatCurrency(recoveryKPIs.totalRecoveredValue)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Acordos pagos de leads resgatados</span>
        </div>

        {/* Card 2: Acordos Resgatados */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-sky-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acordos Resgatados</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">Salvos</span>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {recoveryKPIs.recoveredCount} resgatados
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Acordos salvos por CPF</span>
        </div>

        {/* Card 3: Em Recuperação */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-rose-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Em Recuperação</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Fila Ativa</span>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {recoveryKPIs.pendingBrokenCount} leads
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Fila de acordos quebrados</span>
        </div>

        {/* Card 4: Volume em Risco */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-amber-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Volume em Risco</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Em Aberto</span>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {formatCurrency(recoveryKPIs.pendingBrokenValue)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Total em aberto na fila</span>
        </div>
      </div>

      {/* Barra Integrada Unificada de 1 Linha (Sub-abas, Filtros e Ações) */}
      <div className={`p-3.5 rounded-2xl border flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Esquerda: Sub-abas Fila Cega vs Meu Lote */}
        <div className={`flex items-center p-1 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => { setSubTab('pool'); setSelectedIds([]); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'pool'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock size={14} />
            <span>🔒 Fila Cega Geral</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              subTab === 'pool' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {poolCount}
            </span>
          </button>

          {profile.role === 'member' && (
            <button
              onClick={() => { setSubTab('my_batch'); setSelectedIds([]); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                subTab === 'my_batch'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🎒 Carteira Ativa</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                subTab === 'my_batch' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {myBatchCount}
              </span>
            </button>
          )}
        </div>

        {/* Centro & Direita: Filtros Dropdown + Ações */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Equipe */}
          <div className="w-40">
            <CustomSelect 
              value={filterTeam}
              onChange={(val) => setFilterTeam(val)}
              placeholder="Todas as Equipes"
              options={[
                { value: "all", label: "Todas as Equipes" },
                ...managedTeamsData.map(t => ({ value: t.id, label: t.name }))
              ]}
            />
          </div>

          {/* Dropdown Tipo */}
          <div className="w-40">
            <CustomSelect 
              value={filterType}
              onChange={(val) => setFilterType(val)}
              placeholder="Todos os Tipos"
              options={[
                { value: "all", label: "Todos os Tipos" },
                { value: "quitacao", label: "Quitação" },
                { value: "parcelamento", label: "Parcelamento" },
                { value: "parcela_atrasada", label: "Parcela Atrasada" },
                { value: "antecipacao", label: "Antecipação" }
              ]}
            />
          </div>

          {/* Dropdown Categoria */}
          <div className="w-40">
            <CustomSelect 
              value={filterCategory}
              onChange={(val) => setFilterCategory(val)}
              placeholder="Todas as Categorias"
              options={[
                { value: "all", label: "Todas as Categorias" },
                { value: "fixa", label: "Fixa" },
                { value: "variavel", label: "Variável" }
              ]}
            />
          </div>

          {/* Botão Exportar CPF (Original) */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className={`px-3 py-1.5 font-bold rounded-xl text-xs uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-250 shadow-sm'
            }`}
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          {/* Botão Exportar Excel Formatado (ExcelJS) */}
          <button
            onClick={() => setIsExcelExportModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-500/30 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <Download size={14} />
            <span>Exportar Excel Formatado</span>
          </button>

          {/* Botão Assumir Lote (Apenas Operador) */}
          {subTab === 'pool' && profile.role === 'member' && (
            <button
              onClick={handleTakeOver}
              disabled={selectedIds.length === 0}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer transition-all"
            >
              <Users size={14} />
              <span>Assumir Lote{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className={`rounded-[2rem] border overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="animate-spin text-sky-500" size={28} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sincronizando Balcão...</span>
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm italic">
            {subTab === 'my_batch' 
              ? 'Você ainda não assumiu nenhum contrato para sua carteira.' 
              : 'Nenhum lead quebrado disponível na Fila Cega.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className={`border-b text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ${
                  theme === 'dark' ? 'border-white/5 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="px-6 py-4 w-12 text-center">
                    <button onClick={handleSelectAll} className={`transition-colors cursor-pointer ${
                      theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}>
                      {selectedIds.length === filteredAgreements.length ? (
                        <CheckSquare size={16} className="text-sky-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">CPF (LGPD)</th>
                  <th className="px-6 py-4">Valor Original</th>
                  <th className="px-6 py-4">Tempo de Quebra</th>
                  <th className="px-6 py-4">Origem / Tipo</th>
                  {isManager && subTab === 'pool' && <th className="px-6 py-4">Atribuir Operador</th>}
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className={`text-xs divide-y ${
                theme === 'dark' ? 'text-slate-300 divide-white/[0.02]' : 'text-slate-700 divide-slate-100'
              }`}>
                {filteredAgreements.map(a => {
                  const isSelected = selectedIds.includes(a.id);
                  const isRevealed = !!revealedCpfs[a.id];
                  const isBlindInPool = !isManager && subTab === 'pool';

                  return (
                    <tr 
                      key={a.id} 
                      className={`transition-colors border-b ${
                        theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
                      } ${
                        isSelected 
                          ? theme === 'dark' ? 'bg-sky-500/5 hover:bg-sky-500/10' : 'bg-sky-50/50 hover:bg-sky-50' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleSelectOne(a.id)} className={`transition-colors cursor-pointer ${
                          theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                        }`}>
                          {isSelected ? (
                            <CheckSquare size={16} className="text-sky-500" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                      <td className={`px-6 py-4 font-bold max-w-[180px] truncate ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`} title={a.clientName}>
                        {a.clientName || 'Sem nome'}
                      </td>

                      {/* Coluna CPF */}
                      <td className="px-6 py-4 font-mono select-none">
                        {isBlindInPool ? (
                          <div className="flex items-center gap-1.5 text-slate-500 select-none cursor-not-allowed">
                            <Lock size={12} className="text-amber-400" />
                            <span className="font-bold tracking-widest">{blindMaskCPF(a.clientCpf)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="underline decoration-dashed decoration-sky-500/40 underline-offset-4 font-bold cursor-pointer hover:text-sky-400"
                              onClick={() => handleCopyCpf(a.clientCpf)}
                              title="Clique para copiar o CPF"
                            >
                              {isRevealed ? a.clientCpf : maskCPF(a.clientCpf)}
                            </span>
                            {isManager && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRevealCpf(a); }}
                                className="text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 p-0.5 rounded transition-colors cursor-pointer"
                              >
                                {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Coluna Valor */}
                      <td className={`px-6 py-4 font-black ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>
                        {isBlindInPool ? (
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 font-mono text-[11px] select-none">
                            R$ ***,**
                          </span>
                        ) : (
                          formatCurrency(a.value)
                        )}
                      </td>

                      {/* Coluna Tempo de Quebra */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock size={11} />
                          {getTimeAgo(a.createdAt || a.dueDate)}
                        </span>
                      </td>

                      {/* Coluna Origem / Tipo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <OriginBadge origin={a.origin} />
                          <span className={`font-bold capitalize text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                            {a.type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Atribuição pelo Supervisor */}
                      {isManager && subTab === 'pool' && (
                        <td className="px-6 py-4">
                          <select
                            onChange={(e) => handleAssignSingle(a.id, e.target.value)}
                            defaultValue=""
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                              theme === 'dark' ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="" disabled>Atribuir a...</option>
                            {teamOperators.map(op => (
                              <option key={op.uid} value={op.uid}>
                                {op.displayName} ({op.role})
                              </option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Coluna de Ação */}
                      <td className="px-6 py-4 text-right">
                        {subTab === 'pool' ? (
                          profile.role === 'member' ? (
                            <button
                              onClick={() => handleTakeOverSingle(a)}
                              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-500/20 inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                              <UserPlus size={12} />
                              Assumir Cliente
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500 italic">Disponível no Pool</span>
                          )
                        ) : profile.role === 'member' ? (
                          <button
                            onClick={() => onAttend(a)}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <Play size={10} fill="currentColor" />
                            Registrar Acordo
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 italic">Carteira Ativa</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExportCpfModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />

      {/* MODAL DE EXPORTAÇÃO EXCEL CONFIGURÁVEL DA ABA BALCÃO DE RECUPERAÇÃO */}
      <ExcelExportModal
        isOpen={isExcelExportModalOpen}
        onClose={() => setIsExcelExportModalOpen(false)}
        title="Relatório do Balcão de Recuperação de Acordos"
        defaultFilename={`Relatorio_Recuperacao_${new Date().toISOString().split('T')[0]}.xlsx`}
        availableColumns={recoveryExportColumns}
        data={recoveryExportData}
        forceCpfMasked={forceCpfMasked}
        cpfMaskReason={cpfMaskReason}
        showToast={showToast}
        theme={theme}
      />
    </div>
  );
};
