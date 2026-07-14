import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Agreement, AgreementStatus, Team, UserProfile } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { OriginBadge } from './OriginBadge';
import { CustomSelect } from '../ui/CustomSelect';
import { ShieldWarning as ShieldAlert, Download, CheckSquare, Square, Eye, EyeClosed as EyeOff, Play, Users, Calendar, Question as HelpCircle, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { ExportCpfModal } from '../modals/ExportCpfModal';
import { logAudit } from '../../lib/audit';

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
        <div className={`p-6 rounded-3xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total em Recuperação</p>
            <h3 className={`text-2xl font-black mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{filteredAgreements.length} leads</h3>
          </div>
          <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-455 rounded-2xl border border-rose-500/20">
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume Financeiro</p>
            <h3 className={`text-2xl font-black mt-1 ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              {formatCurrency(filteredAgreements.reduce((acc, curr) => acc + curr.value, 0))}
            </h3>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 rounded-2xl border border-emerald-500/20">
            <Calendar size={22} />
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Selecionados</p>
            <h3 className={`text-2xl font-black mt-1 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>{selectedIds.length} leads</h3>
          </div>
          <div className="p-3.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-500/20">
            <Users size={22} />
          </div>
        </div>
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

            <button
              onClick={handleTakeOver}
              disabled={selectedIds.length === 0}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-555/10 active:scale-95 cursor-pointer"
            >
              <Users size={14} />
              Assumir Lote
            </button>
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
            Nenhum lead quebrado disponível no balcão com as filtragens selecionadas.
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
                  <th className="px-6 py-4">CPF</th>
                  <th className="px-6 py-4">Valor Original</th>
                  <th className="px-6 py-4">Origem</th>
                  <th className="px-6 py-4">Tipo / Cat.</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4 text-right">Ação</th>
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
                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{isRevealed ? a.clientCpf : maskCPF(a.clientCpf)}</span>
                          <button
                            onClick={() => handleRevealCpf(a)}
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
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onAttend(a)}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-555/10 inline-flex items-center gap-1 active:scale-95 cursor-pointer"
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
