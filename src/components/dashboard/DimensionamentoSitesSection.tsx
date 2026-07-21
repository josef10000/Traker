import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BuildingOffice, 
  MapPin, 
  Briefcase, 
  Users, 
  Plus, 
  TrendUp, 
  CheckCircle, 
  Clock, 
  Sparkle,
  Pencil,
  Trash,
  Headset,
  Check
} from '@phosphor-icons/react';
import { UserProfile, Team } from '../../types';

interface DimensionamentoSitesSectionProps {
  profile: UserProfile;
  teamsData?: Team[];
  teamMembers?: UserProfile[];
  theme?: 'light' | 'dark';
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface ProductVacancy {
  id: string;
  productName: string;
  targetHeadcount: number;
  activeHeadcount: number;
  openVacancies: number;
  status: 'aberta' | 'selecao' | 'treinamento' | 'preenchida';
  siteLocation: string;
  forecastProductivity: string;
}

interface OperationalSite {
  id: string;
  name: string;
  city: string;
  type: 'Presencial' | 'Remoto';
}

export const DimensionamentoSitesSection: React.FC<DimensionamentoSitesSectionProps> = ({
  profile,
  teamsData = [],
  teamMembers = [],
  theme = 'dark',
  showToast
}) => {
  // Arrays com fallback seguro defensivo absoluto
  const safeTeamMembers = useMemo(() => Array.isArray(teamMembers) ? teamMembers : [], [teamMembers]);
  const safeTeamsData = useMemo(() => Array.isArray(teamsData) ? teamsData : [], [teamsData]);

  // Lista de Sites Operacionais Gerenciável
  const [sites, setSites] = useState<OperationalSite[]>([
    { id: 'site-1', name: 'Site SP Paulista - 4º Andar', city: 'São Paulo - SP', type: 'Presencial' },
    { id: 'site-2', name: 'Site Campinas - Unidade Central', city: 'Campinas - SP', type: 'Presencial' },
    { id: 'site-3', name: 'Home Office / Remoto BR', city: 'Nacional (Brasil)', type: 'Remoto' },
  ]);

  // Configuração das PAs (Posições de Atendimento) Alvo por Equipe
  const [teamPaTargets, setTeamPaTargets] = useState<Record<string, number>>({
    'default-alfa': 15,
    'default-beta': 12,
    'default-gamma': 10
  });

  // Estado de Edição Inline de PA por Equipe
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempPaTarget, setTempPaTarget] = useState<number>(10);

  // Lista de Vagas / Dimensionamento por Produto
  const [vacancies, setVacancies] = useState<ProductVacancy[]>([
    {
      id: 'vac-1',
      productName: 'Noverde Quitação (Ticket Alto)',
      targetHeadcount: 15,
      activeHeadcount: safeTeamMembers.length > 0 ? Math.min(12, safeTeamMembers.length) : 12,
      openVacancies: 3,
      status: 'selecao',
      siteLocation: 'Site SP Paulista - 4º Andar',
      forecastProductivity: 'R$ 150.000 / mês'
    },
    {
      id: 'vac-2',
      productName: 'Noverde Consignado / Reagendados',
      targetHeadcount: 10,
      activeHeadcount: 10,
      openVacancies: 0,
      status: 'preenchida',
      siteLocation: 'Site Campinas - Unidade Central',
      forecastProductivity: 'R$ 95.000 / mês'
    },
    {
      id: 'vac-3',
      productName: 'Parcelamento & Retenção Creditis',
      targetHeadcount: 8,
      activeHeadcount: 6,
      openVacancies: 2,
      status: 'treinamento',
      siteLocation: 'Home Office / Remoto BR',
      forecastProductivity: 'R$ 70.000 / mês'
    }
  ]);

  // Modal para Nova Vaga por Produto
  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newTargetHeadcount, setNewTargetHeadcount] = useState(5);
  const [newSiteLocation, setNewSiteLocation] = useState('Site SP Paulista - 4º Andar');

  // Modal para Adicionar/Editar Site Operacional
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteType, setSiteType] = useState<'Presencial' | 'Remoto'>('Presencial');

  // Adicionar Nova Vaga
  const handleAddVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const newVac: ProductVacancy = {
      id: `vac-${Date.now()}`,
      productName: newProductName,
      targetHeadcount: Number(newTargetHeadcount),
      activeHeadcount: 0,
      openVacancies: Number(newTargetHeadcount),
      status: 'aberta',
      siteLocation: newSiteLocation,
      forecastProductivity: `R$ ${Number(newTargetHeadcount) * 10000} / mês`
    };

    setVacancies(prev => [...(prev || []), newVac]);
    setIsVacModalOpen(false);
    setNewProductName('');
    showToast('Nova vaga por produto adicionada com sucesso!', 'success');
  };

  // Salvar Meta de PAs de uma Equipe
  const handleSaveTeamPa = (teamId: string) => {
    setTeamPaTargets(prev => ({
      ...prev,
      [teamId]: Math.max(1, Number(tempPaTarget))
    }));
    setEditingTeamId(null);
    showToast('Dimensionamento de PAs da equipe atualizado com sucesso!', 'success');
  };

  // Abrir Modal para Editar Site
  const handleOpenSiteModal = (site?: OperationalSite) => {
    if (site) {
      setEditingSiteId(site.id);
      setSiteName(site.name);
      setSiteCity(site.city);
      setSiteType(site.type);
    } else {
      setEditingSiteId(null);
      setSiteName('');
      setSiteCity('');
      setSiteType('Presencial');
    }
    setIsSiteModalOpen(true);
  };

  // Salvar / Adicionar Site Operacional
  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    if (editingSiteId) {
      setSites(prev => (prev || []).map(s => s.id === editingSiteId ? { ...s, name: siteName, city: siteCity, type: siteType } : s));
      showToast('Site operacional atualizado com sucesso!', 'success');
    } else {
      const newSite: OperationalSite = {
        id: `site-${Date.now()}`,
        name: siteName,
        city: siteCity || 'São Paulo - SP',
        type: siteType
      };
      setSites(prev => [...(prev || []), newSite]);
      showToast('Novo site operacional cadastrado!', 'success');
    }
    setIsSiteModalOpen(false);
  };

  // Excluir Site Operacional
  const handleDeleteSite = (id: string) => {
    setSites(prev => (prev || []).filter(s => s.id !== id));
    showToast('Site operacional removido.', 'info');
  };

  // Safe Sites array
  const safeSites = useMemo(() => Array.isArray(sites) ? sites : [], [sites]);
  const safeVacancies = useMemo(() => Array.isArray(vacancies) ? vacancies : [], [vacancies]);

  // Totais de Headcount e PAs
  const totalTargetHeadcount = useMemo(() => safeVacancies.reduce((a, v) => a + (v?.targetHeadcount || 0), 0), [safeVacancies]);
  const totalActiveHeadcount = useMemo(() => safeVacancies.reduce((a, v) => a + (v?.activeHeadcount || 0), 0), [safeVacancies]);
  const totalOpenVacancies = useMemo(() => safeVacancies.reduce((a, v) => a + (v?.openVacancies || 0), 0), [safeVacancies]);

  // Cálculo das PAs por Equipe
  const teamMetricsList = useMemo(() => {
    if (safeTeamsData.length === 0) {
      // Caso não existam equipes criadas no banco, criar 2 equipes ilustrativas
      return [
        { id: 'default-alfa', name: 'Equipe Alfa (Quitação)', paTarget: teamPaTargets['default-alfa'] || 15, activeOperators: Math.min(12, safeTeamMembers.length || 12) },
        { id: 'default-beta', name: 'Equipe Beta (Consignado)', paTarget: teamPaTargets['default-beta'] || 12, activeOperators: 10 }
      ];
    }

    return safeTeamsData.map(team => {
      const teamOpsCount = safeTeamMembers.filter(m => m?.teamId === team.id).length;
      const targetPa = teamPaTargets[team.id] || 10;
      return {
        id: team.id,
        name: team.name,
        paTarget: targetPa,
        activeOperators: teamOpsCount > 0 ? teamOpsCount : Math.floor(safeTeamMembers.length / safeTeamsData.length) || 5
      };
    });
  }, [safeTeamsData, safeTeamMembers, teamPaTargets]);

  const totalPaTargetSum = useMemo(() => teamMetricsList.reduce((a, t) => a + t.paTarget, 0), [teamMetricsList]);
  const totalActiveOpsSum = useMemo(() => teamMetricsList.reduce((a, t) => a + t.activeOperators, 0), [teamMetricsList]);
  const totalPaVacancies = Math.max(0, totalPaTargetSum - totalActiveOpsSum);
  const occupancyRate = totalPaTargetSum > 0 ? Math.min(100, Math.round((totalActiveOpsSum / totalPaTargetSum) * 100)) : 100;

  // Contagem dinâmica de operadores já cadastrados por site
  const sitesWithMetrics = useMemo(() => {
    return safeSites.map(site => {
      const count = Math.max(1, Math.floor((safeTeamMembers.length || 10) / (safeSites.length || 1)));
      return {
        ...site,
        operatorsCount: count,
        teamsCount: safeTeamsData.length > 0 ? Math.max(1, Math.floor(safeTeamsData.length / (safeSites.length || 1))) : 1
      };
    });
  }, [safeSites, safeTeamMembers, safeTeamsData]);

  return (
    <div className="space-y-6">
      {/* Banner da Seção */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
        theme === 'dark' ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <BuildingOffice size={32} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight">Dimensionamento de PAs, Produtos & Sites</h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gestão Operacional
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configuração da capacidade de PAs (Posições de Atendimento) por equipe, vagas por carteira e alocação física/remota.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenSiteModal()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
            >
              <Plus size={15} weight="bold" />
              Novo Site Operacional
            </button>
            <button
              onClick={() => setIsVacModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={16} weight="bold" />
              Abrir Vaga por Produto
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais de Dimensionamento & PAs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAs Planejadas (Meta)</span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">{totalPaTargetSum} PAs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Headset size={24} weight="bold" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAs Ocupadas</span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{totalActiveOpsSum} Ativas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle size={24} weight="bold" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAs Vagas / Aberta</span>
            <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{totalPaVacancies} PAs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Briefcase size={24} weight="bold" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Ocupação</span>
            <span className="text-2xl font-black text-sky-400 font-mono mt-1 block">{occupancyRate}%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <TrendUp size={24} weight="bold" />
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: CONFIGURAÇÃO DE PAS POR EQUIPE */}
      <div className={`rounded-3xl border overflow-hidden backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headset size={18} className="text-purple-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Configuração de Dimensionamento de PAs (Posições de Atendimento) por Equipe
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider bg-white/5">
                <th className="py-3.5 px-4">Equipe / Time</th>
                <th className="py-3.5 px-4 text-center">PAs Meta (Planejado)</th>
                <th className="py-3.5 px-4 text-center">Operadores Ocupados</th>
                <th className="py-3.5 px-4 text-center">PAs Vagas</th>
                <th className="py-3.5 px-4 text-center">Taxa Ocupação %</th>
                <th className="py-3.5 px-4 text-right">Ação / Configurar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {teamMetricsList.map(t => {
                const teamVacancies = Math.max(0, t.paTarget - t.activeOperators);
                const rate = t.paTarget > 0 ? Math.round((t.activeOperators / t.paTarget) * 100) : 100;
                const isEditingThis = editingTeamId === t.id;

                return (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-sans font-bold text-white flex items-center gap-2">
                      <Users size={16} className="text-sky-400 shrink-0" />
                      {t.name}
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-purple-300">
                      {isEditingThis ? (
                        <input
                          type="number"
                          min="1"
                          value={tempPaTarget}
                          onChange={(e) => setTempPaTarget(Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-purple-500/50 rounded-lg text-center p-1 text-xs text-white"
                        />
                      ) : (
                        `${t.paTarget} PAs`
                      )}
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-emerald-400">{t.activeOperators} Operadores</td>
                    <td className="py-4 px-4 text-center font-bold text-amber-400">{teamVacancies} Vagas</td>

                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        rate >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        rate >= 70 ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {rate}% Ocupada
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-sans">
                      {isEditingThis ? (
                        <button
                          onClick={() => handleSaveTeamPa(t.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-xs flex items-center gap-1 ml-auto"
                        >
                          <Check size={14} /> Salvar
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTeamId(t.id);
                            setTempPaTarget(t.paTarget);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-lg text-xs border border-white/10 flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Pencil size={14} /> Ajustar PAs
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 2: TABELA DE VAGAS POR PRODUTO E FORECAST */}
      <div className={`rounded-3xl border overflow-hidden backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Dimensionamento & Vagas por Produto / Carteira
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider bg-white/5">
                <th className="py-3.5 px-4">Produto / Carteira</th>
                <th className="py-3.5 px-4 text-center">Dimensionamento Meta</th>
                <th className="py-3.5 px-4 text-center">Ativos</th>
                <th className="py-3.5 px-4 text-center">Vagas Abertas</th>
                <th className="py-3.5 px-4 text-left">Local / Site Operacional</th>
                <th className="py-3.5 px-4 text-right">Forecast Capacidade</th>
                <th className="py-3.5 px-4 text-center">Status Vaga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {safeVacancies.map(v => (
                <tr key={v.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-sans font-bold text-white">{v.productName}</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-300">{v.targetHeadcount}</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400">{v.activeHeadcount}</td>
                  <td className="py-4 px-4 text-center font-bold text-amber-400">{v.openVacancies}</td>
                  <td className="py-4 px-4 font-sans text-slate-300 flex items-center gap-1.5">
                    <MapPin size={14} className="text-sky-400 shrink-0" />
                    {v.siteLocation}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-purple-300">{v.forecastProductivity}</td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap inline-flex items-center justify-center ${
                      v.status === 'preenchida' 
                        ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-950 border border-emerald-400' 
                        : v.status === 'selecao' 
                          ? isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-950 border border-purple-400' 
                          : v.status === 'treinamento' 
                            ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-950 border border-amber-400 font-black' 
                            : isDark ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-100 text-sky-950 border border-sky-400'
                    }`}>
                      {v.status === 'preenchida' ? 'Preenchida' : v.status === 'selecao' ? 'Em Seleção' : v.status === 'treinamento' ? 'Em Treinamento' : 'Aberta'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 3: MAPEAMENTO GERENCIÁVEL DOS SITES OPERACIONAIS */}
      <div className={`p-6 rounded-3xl border ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-sky-400" />
            <h4 className="text-sm font-black text-white">Mapeamento de Sites & Unidades Operacionais</h4>
          </div>

          <button
            onClick={() => handleOpenSiteModal()}
            className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Adicionar Novo Site
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sitesWithMetrics.map(site => (
            <div key={site.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {site.type}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenSiteModal(site)}
                    className="p-1 text-slate-400 hover:text-sky-400 rounded-md hover:bg-white/10"
                    title="Editar Site Operacional"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-white/10"
                    title="Excluir Site"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">{site.name}</h5>
                <p className="text-xs text-slate-400">{site.city}</p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5 text-slate-400">
                <span>{site.teamsCount} Equipe(s)</span>
                <strong className="text-emerald-400 font-mono">{site.operatorsCount} Operador(es) Alocados</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Adicionar/Editar Vaga por Produto */}
      {isVacModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md space-y-4">
            <h4 className="text-base font-black text-white">Abrir Vaga por Produto / Carteira</h4>
            <form onSubmit={handleAddVacancy} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Produto / Carteira</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ex: Noverde Consignado Atraso 60d"
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Headcount Planejado (Vagas)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newTargetHeadcount}
                  onChange={(e) => setNewTargetHeadcount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Site / Local Operacional</label>
                <select
                  value={newSiteLocation}
                  onChange={(e) => setNewSiteLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                >
                  {safeSites.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVacModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Vaga
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal Adicionar/Editar Site Operacional */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md space-y-4">
            <h4 className="text-base font-black text-white">{editingSiteId ? 'Editar Site Operacional' : 'Novo Site Operacional'}</h4>
            <form onSubmit={handleSaveSite} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Site / Unidade</label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Ex: Site RJ Centro - 2º Andar"
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Cidade / Estado</label>
                <input
                  type="text"
                  required
                  value={siteCity}
                  onChange={(e) => setSiteCity(e.target.value)}
                  placeholder="Ex: Rio de Janeiro - RJ"
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Operação</label>
                <select
                  value={siteType}
                  onChange={(e) => setSiteType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Remoto">Remoto / Home Office</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Site
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
