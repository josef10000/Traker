import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { Agreement, AgreementStatus, Team, UserProfile } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { OriginBadge } from './OriginBadge';
import { CustomSelect } from '../ui/CustomSelect';
import { ShieldWarning as ShieldAlert, Download, CheckSquare, Square, Eye, EyeClosed as EyeOff, Play, Users, Calendar, Question as HelpCircle, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { ExportCpfModal } from '../modals/ExportCpfModal';
import { logAudit } from '../../lib/audit';
import { exportToCsv } from '../../utils/csvExporter';

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
  
  // Filtros
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modal de Exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Lista de todos os acordos da organização para identificar resgatados e calcular valor recuperado R$
  const [allOrgAgreements, setAllOrgAgreements] = useState<Agreement[]>([]);

  // Cópia automática de CPF em 1 clique
  const handleCopyCpf = (cpf: string) => {
    if (!cpf) return;
    const clean = cpf.replace(/\D/g, '');
    navigator.clipboard.writeText(clean);
    showToast(`CPF ${cpf} copiado para a área de transferência!`, 'success');
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

  // Revelar CPF com auditoria
  const handleRevealCpf = (agreement: Agreement) => {
    const isRevealed = revealedCpfs[agreement.id];
    if (!isRevealed) {
      logAudit('REVEAL_CPF', { cpf: agreement.clientCpf, context: 'RecoveryPool' }, profile.displayName || '', profile.organizationId);
    }
    setRevealedCpfs(prev => ({ ...prev, [agreement.id]: !isRevealed }));
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
          status: AgreementStatus.WAITING, // Retorna para pendente para o novo operador cobrar
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
      {/* Quadro de Resumo e KPIs de Recuperação */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-emerald-500/30' : 'bg-white border-emerald-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">💰 Valor Recuperado (Pago)</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {formatCurrency(recoveryKPIs.totalRecoveredValue)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Acordos pagos de leads resgatados</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-lg">
            R$
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-sky-500/30' : 'bg-white border-sky-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block">🎯 Acordos Resgatados</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {recoveryKPIs.recoveredCount} resgatados
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Acordos salvos por CPF</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 font-bold text-lg">
            ✓
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-rose-500/20' : 'bg-white border-rose-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">🚨 Em Recuperação (Pendente)</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {recoveryKPIs.pendingBrokenCount} leads
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Fila de acordos quebrados</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0 font-bold text-lg">
            ⚠️
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg ${
          theme === 'dark' ? 'bg-slate-900/60 border-amber-500/20' : 'bg-white border-amber-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">💵 Volume em Risco</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {formatCurrency(recoveryKPIs.pendingBrokenValue)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Total em aberto na fila</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 font-bold text-lg">
            📊
          </div>
        </div>
      </div>

      {/* Sub-abas de Navegação */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-white/5 w-fit">
        <button
          onClick={() => { setSubTab('pool'); setSelectedIds([]); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'pool'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🌐 Balcão Geral</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            subTab === 'pool' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {poolCount}
          </span>
        </button>

        <button
          onClick={() => { setSubTab('my_batch'); setSelectedIds([]); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'my_batch'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🎒 Meu Lote</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            subTab === 'my_batch' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {myBatchCount}
          </span>
        </button>
      </div>

      {/* Ações e Filtros */}
      <div className={`p-6 rounded-3xl border space-y-4 ${
        theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {/* Equipe */}
            <div className="w-44">
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

            <div className="w-44">
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

            <div className="w-44">
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
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className={`px-4 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider border flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-250 shadow-sm'
              }`}
            >
              <Download size={14} />
              Exportar
            </button>

            {subTab === 'pool' && (
              <button
                onClick={handleTakeOver}
                disabled={selectedIds.length === 0}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-555/10 active:scale-95 cursor-pointer"
              >
                <Users size={14} />
                Assumir Lote
              </button>
            )}
          </div>
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
              ? 'Você ainda não assumiu nenhum lote de recuperação.' 
              : 'Nenhum lead quebrado disponível no balcão geral.'}
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
                  <th className="px-6 py-4">CPF (Clique p/ copiar)</th>
                  <th className="px-6 py-4">Valor Original</th>
                  <th className="px-6 py-4">Origem</th>
                  <th className="px-6 py-4">Tipo / Cat.</th>
                  <th className="px-6 py-4">Vencimento</th>
                  {subTab === 'my_batch' && <th className="px-6 py-4 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className={`text-xs divide-y ${
                theme === 'dark' ? 'text-slate-300 divide-white/[0.02]' : 'text-slate-700 divide-slate-100'
              }`}>
                {filteredAgreements.map(a => {
                  const isSelected = selectedIds.includes(a.id);
                  const isRevealed = !!revealedCpfs[a.id];

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
                      <td 
                        className="px-6 py-4 font-mono cursor-pointer hover:text-sky-400 transition-colors"
                        onClick={() => handleCopyCpf(a.clientCpf)}
                        title="Clique para copiar o CPF"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="underline decoration-dashed decoration-sky-500/40 underline-offset-4 font-bold">{isRevealed ? a.clientCpf : maskCPF(a.clientCpf)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRevealCpf(a); }}
                            className="text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 p-0.5 rounded transition-colors cursor-pointer"
                          >
                            {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-black ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>
                        {formatCurrency(a.value)}
                      </td>
                      <td className="px-6 py-4">
                        <OriginBadge origin={a.origin} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold capitalize ${theme === 'dark' ? 'text-slate-400' : 'text-slate-655'}`}>{a.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono mt-0.5">{a.category}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-medium">
                        {a.dueDate.split('-').reverse().join('/')}
                      </td>
                      {subTab === 'my_batch' && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onAttend(a)}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <Play size={10} fill="currentColor" />
                            Registrar Acordo
                          </button>
                        </td>
                      )}
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
    </div>
  );
};
