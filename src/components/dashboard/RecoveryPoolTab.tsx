import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Agreement, AgreementStatus, Team, UserProfile } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { OriginBadge } from './OriginBadge';
import { ShieldWarning as ShieldAlert, Download, CheckSquare, Square, Eye, EyeClosed as EyeOff, Play, Users, Calendar, Question as HelpCircle, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { ExportCpfModal } from '../modals/ExportCpfModal';
import { logAudit } from '../../lib/audit';

interface RecoveryPoolTabProps {
  profile: UserProfile;
  managedTeamsData: Team[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onAttend: (agreement: Agreement) => void;
  onTakeOverSuccess?: () => void;
}

export const RecoveryPoolTab = ({
  profile,
  managedTeamsData,
  showToast,
  onAttend,
  onTakeOverSuccess
}: RecoveryPoolTabProps) => {
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

  // Escuta em tempo real dos acordos quebrados da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    setLoading(true);
    const q = query(
      collection(db, 'agreements'),
      where('organizationId', '==', profile.organizationId),
      where('status', '==', AgreementStatus.BROKEN)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agreement));
      // Ordena por data de criação decrescente
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAgreements(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar acordos do balcão:", error);
      setLoading(false);
      showToast('Erro ao carregar acordos do balcão.', 'error');
    });

    return () => unsubscribe();
  }, [profile.organizationId]);

  // Filtragem dos acordos
  const filteredAgreements = useMemo(() => {
    return agreements.filter(a => {
      const matchTeam = filterTeam === 'all' || a.teamId === filterTeam;
      const matchType = filterType === 'all' || a.type === filterType;
      const matchCategory = filterCategory === 'all' || a.category === filterCategory;
      return matchTeam && matchType && matchCategory;
    });
  }, [agreements, filterTeam, filterType, filterCategory]);

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
      showToast(`${selectedIds.length} acordos assumidos com sucesso!`, 'success');
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
      const headers = ['Cliente', 'CPF', 'Valor', 'Vencimento Original', 'Origem', 'Tipo', 'Categoria', 'Data Registro'];
      const rows = targets.map(a => [
        a.clientName || 'Sem nome',
        complete ? a.clientCpf : maskCPF(a.clientCpf),
        a.value,
        a.dueDate,
        a.origin,
        a.type,
        a.category,
        new Date(a.createdAt).toLocaleDateString('pt-BR')
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `balcao_recuperacao_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logAudit('EXPORT_CSV', { count: targets.length, type: complete ? 'complete' : 'masked', context: 'RecoveryPool' }, profile.displayName || '', profile.organizationId);
      showToast('Relatório exportado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar CSV.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Quadro de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total em Recuperação</p>
            <h3 className="text-2xl font-black text-white mt-1">{filteredAgreements.length} leads</h3>
          </div>
          <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume Financeiro</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              {formatCurrency(filteredAgreements.reduce((acc, curr) => acc + curr.value, 0))}
            </h3>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
            <Calendar size={22} />
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selecionados</p>
            <h3 className="text-2xl font-black text-sky-400 mt-1">{selectedIds.length} leads</h3>
          </div>
          <div className="p-3.5 bg-sky-500/10 text-sky-500 rounded-2xl border border-sky-500/20">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Ações e Filtros */}
      <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {/* Equipe */}
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl outline-none"
            >
              <option value="all">Todas as Equipes</option>
              {managedTeamsData.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Tipo de Acordo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl outline-none"
            >
              <option value="all">Todos os Tipos</option>
              <option value="quitacao">Quitação</option>
              <option value="parcelamento">Parcelamento</option>
              <option value="parcela_atrasada">Parcela Atrasada</option>
              <option value="antecipacao">Antecipação</option>
            </select>

            {/* Categoria */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl outline-none"
            >
              <option value="all">Todas as Categorias</option>
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-700/50 flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Exportar
            </button>

            <button
              onClick={handleTakeOver}
              disabled={selectedIds.length === 0}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <Users size={14} />
              Assumir Lote
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="animate-spin text-sky-500" size={28} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sincronizando Balcão...</span>
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm italic">
            Nenhum lead quebrado disponível no balcão com as filtragens selecionadas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/40">
                  <th className="px-6 py-4 w-12 text-center">
                    <button onClick={handleSelectAll} className="text-slate-500 hover:text-white transition-colors">
                      {selectedIds.length === filteredAgreements.length ? (
                        <CheckSquare size={16} className="text-sky-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">CPF</th>
                  <th className="px-6 py-4">Valor Original</th>
                  <th className="px-6 py-4">Origem</th>
                  <th className="px-6 py-4">Tipo / Cat.</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-300 divide-y divide-white/[0.02]">
                {filteredAgreements.map(a => {
                  const isSelected = selectedIds.includes(a.id);
                  const isRevealed = !!revealedCpfs[a.id];

                  return (
                    <tr 
                      key={a.id} 
                      className={`hover:bg-white/5 transition-colors border-b border-white/5 ${
                        isSelected ? 'bg-sky-500/5 hover:bg-sky-500/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleSelectOne(a.id)} className="text-slate-500 hover:text-white transition-colors">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-sky-500" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-bold text-white max-w-[180px] truncate" title={a.clientName}>
                        {a.clientName || 'Sem nome'}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{isRevealed ? a.clientCpf : maskCPF(a.clientCpf)}</span>
                          <button
                            onClick={() => handleRevealCpf(a)}
                            className="text-slate-500 hover:text-sky-400 p-0.5 rounded transition-colors"
                          >
                            {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-rose-400">
                        {formatCurrency(a.value)}
                      </td>
                      <td className="px-6 py-4">
                        <OriginBadge origin={a.origin} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-400 capitalize">{a.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-500 block uppercase font-mono mt-0.5">{a.category}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {a.dueDate.split('-').reverse().join('/')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onAttend(a)}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-500/10 inline-flex items-center gap-1 active:scale-95"
                        >
                          <Play size={10} fill="currentColor" />
                          Atender
                        </button>
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
    </div>
  );
};
