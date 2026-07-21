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
  Check,
  ChartPie,
  Scales,
  Info,
  ShieldCheck,
  Funnel
} from '@phosphor-icons/react';
import { UserProfile, Team } from '../../types';

interface DimensionamentoSitesSectionProps {
  profile: UserProfile;
  teamsData?: Team[];
  teamMembers?: UserProfile[];
  theme?: 'light' | 'dark';
  showToast: (message: string, type: 'success' | 'error') => void;
}

export interface ProductVacancy {
  id: string;
  productName: string;
  requestedHeadcount: number; // Demanda Solicitada pelo Produto (Forecast PAA)
  approvedHeadcount: number;  // Capacidade Aprovada Estratégica (Empresa)
  siteLocation: string;
  forecastProductivity: string;
  linkedTeamIds: string[];    // IDs dos times sob este guarda-chuva de produto/carteira
  statusNote?: string;
}

export interface OperationalSite {
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
  const isDark = theme === 'dark';

  // Alternador de Sub-Aba: Dimensionamento & Presença vs Forecast Estratégico
  const [activeTab, setActiveTab] = useState<'dimensioning' | 'forecast'>('dimensioning');

  // Arrays com fallback seguro defensivo absoluto
  const safeTeamMembers = useMemo(() => Array.isArray(teamMembers) ? teamMembers : [], [teamMembers]);
  const safeTeamsData = useMemo(() => Array.isArray(teamsData) ? teamsData : [], [teamsData]);

  // Lista de Sites Operacionais Gerenciável
  const [sites, setSites] = useState<OperationalSite[]>([
    { id: 'site-1', name: 'Site SP Paulista - 4º Andar', city: 'São Paulo - SP', type: 'Presencial' },
    { id: 'site-2', name: 'Site Campinas - Unidade Central', city: 'Campinas - SP', type: 'Presencial' },
    { id: 'site-3', name: 'Home Office / Remoto BR', city: 'Nacional (Brasil)', type: 'Remoto' },
  ]);

  // Lista de Produtos / Carteiras Guarda-Chuva com Vínculo de Times
  const [products, setProducts] = useState<ProductVacancy[]>([
    {
      id: 'prod-1',
      productName: 'Noverde Quitação (Ticket Alto)',
      requestedHeadcount: 15,
      approvedHeadcount: 12,
      siteLocation: 'Site SP Paulista - 4º Andar',
      forecastProductivity: 'R$ 150.000 / mês',
      linkedTeamIds: safeTeamsData.length > 0 ? [safeTeamsData[0]?.id || 'default-alfa'] : ['default-alfa'],
      statusNote: 'Aprovado 12 PAs por decisão estratégica da diretoria'
    },
    {
      id: 'prod-2',
      productName: 'Noverde Consignado / Reagendados',
      requestedHeadcount: 10,
      approvedHeadcount: 10,
      siteLocation: 'Site Campinas - Unidade Central',
      forecastProductivity: 'R$ 95.000 / mês',
      linkedTeamIds: safeTeamsData.length > 1 ? [safeTeamsData[1]?.id || 'default-beta'] : ['default-beta'],
      statusNote: '100% alinhado com a demanda do produto'
    },
    {
      id: 'prod-3',
      productName: 'Parcelamento & Retenção Creditis',
      requestedHeadcount: 10,
      approvedHeadcount: 8,
      siteLocation: 'Home Office / Remoto BR',
      forecastProductivity: 'R$ 70.000 / mês',
      linkedTeamIds: safeTeamsData.length > 2 ? [safeTeamsData[2]?.id || 'default-gamma'] : ['default-gamma'],
      statusNote: 'Capacidade ajustada para 8 PAs (Empresa)'
    }
  ]);

  // Modais de Cadastro / Edição
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Formulário do Modal de Produto / Carteira
  const [prodName, setProdName] = useState('');
  const [prodRequested, setProdRequested] = useState(10);
  const [prodApproved, setProdApproved] = useState(8);
  const [prodSite, setProdSite] = useState('Site SP Paulista - 4º Andar');
  const [prodForecastVal, setProdForecastVal] = useState('R$ 100.000 / mês');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [prodStatusNote, setProdStatusNote] = useState('');

  // Abrir Modal para Criar Novo Produto
  const handleOpenNewProdModal = () => {
    setEditingProductId(null);
    setProdName('');
    setProdRequested(10);
    setProdApproved(8);
    setProdSite('Site SP Paulista - 4º Andar');
    setProdForecastVal('R$ 100.000 / mês');
    setSelectedTeams([]);
    setProdStatusNote('');
    setIsProdModalOpen(true);
  };

  // Abrir Modal para Editar Produto Existente
  const handleOpenEditProdModal = (prod: ProductVacancy) => {
    setEditingProductId(prod.id);
    setProdName(prod.productName);
    setProdRequested(prod.requestedHeadcount);
    setProdApproved(prod.approvedHeadcount);
    setProdSite(prod.siteLocation);
    setProdForecastVal(prod.forecastProductivity);
    setSelectedTeams(prod.linkedTeamIds || []);
    setProdStatusNote(prod.statusNote || '');
    setIsProdModalOpen(true);
  };

  // Salvar Produto (Novo ou Edição)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? {
        ...p,
        productName: prodName,
        requestedHeadcount: Number(prodRequested),
        approvedHeadcount: Number(prodApproved),
        siteLocation: prodSite,
        forecastProductivity: prodForecastVal,
        linkedTeamIds: selectedTeams,
        statusNote: prodStatusNote
      } : p));
      showToast('Produto/Carteira atualizada com sucesso!', 'success');
    } else {
      const newProd: ProductVacancy = {
        id: `prod-${Date.now()}`,
        productName: prodName,
        requestedHeadcount: Number(prodRequested),
        approvedHeadcount: Number(prodApproved),
        siteLocation: prodSite,
        forecastProductivity: prodForecastVal,
        linkedTeamIds: selectedTeams,
        statusNote: prodStatusNote
      };
      setProducts(prev => [...prev, newProd]);
      showToast('Novo Produto/Carteira cadastrado com sucesso!', 'success');
    }

    setIsProdModalOpen(false);
  };

  // Modal para Adicionar/Editar Site Operacional
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteType, setSiteType] = useState<'Presencial' | 'Remoto'>('Presencial');

  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    const newSite: OperationalSite = {
      id: `site-${Date.now()}`,
      name: siteName,
      city: siteCity || 'Brasil',
      type: siteType
    };
    setSites(prev => [...prev, newSite]);
    setIsSiteModalOpen(false);
    setSiteName('');
    setSiteCity('');
    showToast('Novo Site Operacional cadastrado!', 'success');
  };

  // Cálculos Consolidados Dinâmicos por Produto (Somando os Times Vinculados)
  const productCalculatedData = useMemo(() => {
    return products.map(prod => {
      // 1. Filtrar operadores que pertencem a qualquer um dos times vinculados a esta carteira
      const linkedOps = safeTeamMembers.filter(m => 
        prod.linkedTeamIds.includes(m.teamId || '') || 
        (prod.linkedTeamIds.length === 0 && (m.role === 'member' || !m.role))
      );

      // 2. Headcount Ativo Contratado
      const activeHeadcount = linkedOps.length;

      // 3. Logados / Presentes no Dia (Descontando Faltas)
      const loggedOps = linkedOps.filter(m => m.absenteeismRate === undefined || m.absenteeismRate < 50);
      const loggedCount = loggedOps.length;

      // 4. Vagas Abertas Reais (Baseado na Capacidade Aprovada pela Empresa)
      const openVacancies = Math.max(0, prod.approvedHeadcount - activeHeadcount);

      // 5. Ajuste / Repressão Estratégica (Solicitado pelo Produto vs Aprovado pela Empresa)
      const strategicGap = prod.approvedHeadcount - prod.requestedHeadcount; // ex: 8 - 10 = -2 PAs

      // 6. Nomes dos Times Vinculados
      const linkedTeamNames = prod.linkedTeamIds.map(tId => {
        const found = safeTeamsData.find(t => t.id === tId);
        return found ? found.name : tId;
      });

      // 7. Status da Vaga
      let status: 'preenchida' | 'selecao' | 'treinamento' | 'aberta' = 'aberta';
      if (openVacancies === 0) status = 'preenchida';
      else if (openVacancies <= 2) status = 'treinamento';
      else status = 'selecao';

      return {
        ...prod,
        activeHeadcount,
        loggedCount,
        openVacancies,
        strategicGap,
        linkedTeamNames,
        status
      };
    });
  }, [products, safeTeamMembers, safeTeamsData]);

  // Totais Gerais para os Cards do Topo
  const totalRequested = productCalculatedData.reduce((acc, p) => acc + p.requestedHeadcount, 0);
  const totalApproved = productCalculatedData.reduce((acc, p) => acc + p.approvedHeadcount, 0);
  const totalActive = productCalculatedData.reduce((acc, p) => acc + p.activeHeadcount, 0);
  const totalLogged = productCalculatedData.reduce((acc, p) => acc + p.loggedCount, 0);
  const totalOpenVacancies = productCalculatedData.reduce((acc, p) => acc + p.openVacancies, 0);
  const totalStrategicGap = totalApproved - totalRequested;

  return (
    <div className="space-y-8">
      {/* Banner Principal & Controle de Abas */}
      <div className={`p-6 rounded-3xl border-2 relative overflow-hidden backdrop-blur-xl transition-all ${
        isDark 
          ? 'bg-slate-900/60 border-white/10 text-white' 
          : 'bg-white border-slate-900 text-slate-950 shadow-md'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${
              isDark
                ? 'bg-gradient-to-br from-purple-500/20 to-sky-500/20 border-purple-500/30 text-purple-400'
                : 'bg-purple-100 border-purple-900 text-purple-950 font-black'
            }`}>
              <BuildingOffice size={32} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Dimensionamento de PAs, Produtos & Sites
                </h2>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-2 ${
                  isDark
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-purple-100 text-purple-950 border-purple-900 font-black'
                }`}>
                  Gestão Integrada
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-900 font-extrabold'}`}>
                Associe os times às suas respectivas carteiras guarda-chuva, monitore presentes em tempo real e compare a demanda solicitada x capacidade aprovada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenNewProdModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer border-2 border-purple-950"
            >
              <Plus size={16} weight="bold" />
              Novo Produto / Carteira
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS DE DIMENSIONAMENTO */}
        <div className={`mt-6 pt-4 border-t-2 flex items-center gap-3 ${
          isDark ? 'border-white/10' : 'border-slate-900'
        }`}>
          <button
            onClick={() => setActiveTab('dimensioning')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer border-2 ${
              activeTab === 'dimensioning'
                ? 'bg-purple-600 text-white border-slate-900 shadow-md'
                : isDark
                  ? 'bg-slate-950/60 text-slate-400 border-white/10 hover:text-white'
                  : 'bg-slate-100 text-slate-950 border-slate-900 hover:bg-slate-200'
            }`}
          >
            <Headset size={18} weight="bold" />
            🏢 Dimensionamento & Presença (Tempo Real)
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer border-2 ${
              activeTab === 'forecast'
                ? 'bg-sky-600 text-white border-slate-900 shadow-md'
                : isDark
                  ? 'bg-slate-950/60 text-slate-400 border-white/10 hover:text-white'
                  : 'bg-slate-100 text-slate-950 border-slate-900 hover:bg-slate-200'
            }`}
          >
            <ChartPie size={18} weight="bold" />
            📈 Forecast & Ajuste Estratégico de Demanda
          </button>
        </div>
      </div>

      {/* CARDS RESUMO DE CAPACIDADE & PRESENÇA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Solicitado pelo Produto */}
        <div className={`p-4 rounded-3xl border-2 space-y-1 transition-all ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-900 shadow-xs'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-950'}`}>
            📋 Solicitado (Forecast PAA)
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${isDark ? 'text-purple-400' : 'text-purple-950'}`}>
              {totalRequested} PAs
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              isDark ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-100 text-purple-950 font-black'
            }`}>
              Demanda Produto
            </span>
          </div>
        </div>

        {/* Aprovado pela Empresa */}
        <div className={`p-4 rounded-3xl border-2 space-y-1 transition-all ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-900 shadow-xs'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-950'}`}>
            🛡️ Aprovado (Empresa)
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${isDark ? 'text-sky-400' : 'text-sky-950'}`}>
              {totalApproved} PAs
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              totalStrategicGap < 0 
                ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-950 font-black'
                : isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-950 font-black'
            }`}>
              {totalStrategicGap < 0 ? `${totalStrategicGap} PAs Ajustados` : '100% Atendido'}
            </span>
          </div>
        </div>

        {/* Contratados Ativos */}
        <div className={`p-4 rounded-3xl border-2 space-y-1 transition-all ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-900 shadow-xs'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-950'}`}>
            👥 Contratados (Ativos)
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-950'}`}>
              {totalActive} PAs
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-950 font-black'
            }`}>
              Quadro Efetivo
            </span>
          </div>
        </div>

        {/* Logados / Presentes no Dia */}
        <div className={`p-4 rounded-3xl border-2 space-y-1 transition-all ${
          isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-slate-900 shadow-xs'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
            🟢 Presentes / Logados Hoje
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
              {totalLogged} Ops
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-600 text-white font-black'
            }`}>
              {totalActive > 0 ? `${Math.round((totalLogged / totalActive) * 100)}% Presença` : '0%'}
            </span>
          </div>
        </div>

        {/* Vagas Abertas Reais */}
        <div className={`p-4 rounded-3xl border-2 space-y-1 transition-all ${
          isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-900 shadow-xs'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-950'}`}>
            ⚡ Vagas Abertas Reais
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${
              totalOpenVacancies > 0 
                ? isDark ? 'text-amber-400' : 'text-amber-950 font-black' 
                : isDark ? 'text-emerald-400' : 'text-emerald-950 font-black'
            }`}>
              {totalOpenVacancies} Vagas
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
              totalOpenVacancies > 0 
                ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-950 font-black' 
                : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-950 font-black'
            }`}>
              {totalOpenVacancies > 0 ? 'Em Seleção' : 'Preenchida'}
            </span>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: DIMENSIONAMENTO & PRESENÇA EM TEMPO REAL */}
      {activeTab === 'dimensioning' && (
        <div className="space-y-6">
          <div className={`rounded-3xl border-2 overflow-hidden transition-all ${
            isDark 
              ? 'bg-slate-900/40 border-white/10 text-white' 
              : 'bg-white border-slate-900 text-slate-950 shadow-sm'
          }`}>
            <div className={`px-6 py-4 border-b-2 flex items-center justify-between gap-4 ${
              isDark ? 'border-white/10' : 'border-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                <Headset size={18} className={isDark ? 'text-purple-400' : 'text-purple-800'} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>
                  Dimensionamento por Carteira Guarda-Chuva & Presença em Tempo Real
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b-2 font-black uppercase tracking-wider ${
                    isDark ? 'border-white/10 text-slate-400 bg-white/5' : 'border-slate-900 text-slate-950 bg-slate-200'
                  }`}>
                    <th className="py-3.5 px-4">Carteira / Produto</th>
                    <th className="py-3.5 px-4">Times Vinculados (Guarda-Chuva)</th>
                    <th className="py-3.5 px-4 text-center">Meta Aprovada (PAs)</th>
                    <th className="py-3.5 px-4 text-center">Ativos (Contratados)</th>
                    <th className="py-3.5 px-4 text-center">🟢 Logados / Presentes (Hoje)</th>
                    <th className="py-3.5 px-4 text-center">Vagas Abertas Reais</th>
                    <th className="py-3.5 px-4 text-left">Local / Site Operacional</th>
                    <th className="py-3.5 px-4 text-right">Forecast Produtividade</th>
                    <th className="py-3.5 px-4 text-center">Status Vaga</th>
                    <th className="py-3.5 px-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className={`divide-y-2 font-mono ${isDark ? 'divide-white/5' : 'divide-slate-300'}`}>
                  {productCalculatedData.map(prod => (
                    <tr key={prod.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-purple-100/70'}`}>
                      <td className={`py-4 px-4 font-sans font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        {prod.productName}
                      </td>
                      <td className="py-4 px-4 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {prod.linkedTeamNames.length > 0 ? (
                            prod.linkedTeamNames.map((tName, i) => (
                              <span key={i} className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                isDark ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-purple-100 text-purple-950 border-purple-900'
                              }`}>
                                👥 {tName}
                              </span>
                            ))
                          ) : (
                            <span className={`text-[10px] italic ${isDark ? 'text-slate-500' : 'text-slate-900 font-extrabold'}`}>
                              Sem times vinculados
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-4 px-4 text-center font-black text-sm ${isDark ? 'text-white font-black' : 'text-slate-950'}`}>
                        {prod.approvedHeadcount}
                      </td>
                      <td className={`py-4 px-4 text-center font-black text-sm ${isDark ? 'text-sky-300 font-black' : 'text-sky-950'}`}>
                        {prod.activeHeadcount}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 border ${
                          isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-600 text-white border-slate-950'
                        }`}>
                          🟢 {prod.loggedCount} Presente(s)
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-center font-black ${
                        prod.openVacancies > 0 ? (isDark ? 'text-amber-400' : 'text-amber-950') : (isDark ? 'text-emerald-400' : 'text-emerald-950')
                      }`}>
                        {prod.openVacancies}
                      </td>
                      <td className={`py-4 px-4 font-sans ${isDark ? 'text-slate-300' : 'text-slate-950 font-bold'}`}>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className={isDark ? 'text-sky-400' : 'text-sky-800'} />
                          {prod.siteLocation}
                        </div>
                      </td>
                      <td className={`py-4 px-4 text-right font-black ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>
                        {prod.forecastProductivity}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap inline-flex items-center justify-center ${
                          prod.status === 'preenchida' 
                            ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-950 border border-emerald-400' 
                            : prod.status === 'selecao' 
                              ? isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-950 border border-purple-400' 
                              : prod.status === 'treinamento' 
                                ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-950 border border-amber-400 font-black' 
                                : isDark ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-100 text-sky-950 border border-sky-400'
                        }`}>
                          {prod.status === 'preenchida' ? 'Preenchida' : prod.status === 'selecao' ? 'Em Seleção' : prod.status === 'treinamento' ? 'Em Treinamento' : 'Aberta'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenEditProdModal(prod)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-950 border-slate-900'
                          }`}
                          title="Editar Dimensionamento / Vínculo de Times"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: FORECAST & AJUSTE ESTRATÉGICO DE DEMANDA */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className={`p-5 rounded-3xl border-2 flex items-start gap-4 transition-all ${
            isDark 
              ? 'bg-slate-900 border-sky-500/50 text-sky-400 shadow-lg' 
              : 'bg-sky-50 border-slate-900 text-slate-950 font-extrabold shadow-sm'
          }`}>
            <div className={`p-2.5 rounded-2xl border ${
              isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-sky-200 text-sky-950 border-sky-900'
            }`}>
              <Info size={24} weight="bold" />
            </div>
            <div className="space-y-1.5 text-xs leading-relaxed">
              <h4 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-sky-400' : 'text-sky-950'}`}>
                <span>💡 Como Funciona o Forecast de Demanda:</span>
              </h4>
              <p className={isDark ? 'text-sky-400 font-bold' : 'text-slate-900 font-extrabold'}>
                O Produto pode solicitar uma quantidade inicial de PAs (ex: <strong className={isDark ? 'text-white font-black underline' : 'text-purple-950 font-black'}>10 PAs</strong>). A Diretoria/Empresa aprova uma capacidade limite por decisão estratégica de orçamento (ex: <strong className={isDark ? 'text-white font-black underline' : 'text-sky-950 font-black'}>8 PAs</strong>). Mesmo quando 100% dos 8 PAs aprovados estiverem contratados (<strong className={isDark ? 'text-emerald-300 font-black' : 'text-emerald-950 font-black'}>0 Vagas Abertas</strong>), a diferença de -2 PAs reflete a <strong className={isDark ? 'text-amber-300 font-black' : 'text-amber-950 font-black'}>Repressão Estratégica de Demanda</strong>.
              </p>
            </div>
          </div>

          <div className={`rounded-3xl border-2 overflow-hidden transition-all ${
            isDark 
              ? 'bg-slate-900/40 border-white/10 text-white' 
              : 'bg-white border-slate-900 text-slate-950 shadow-sm'
          }`}>
            <div className={`px-6 py-4 border-b-2 flex items-center justify-between gap-4 ${
              isDark ? 'border-white/10' : 'border-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                <ChartPie size={18} className={isDark ? 'text-sky-400' : 'text-sky-800'} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>
                  Comparativo: Demanda Solicitada (Produto) vs Capacidade Aprovada (Empresa)
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b-2 font-black uppercase tracking-wider ${
                    isDark ? 'border-white/10 text-slate-400 bg-white/5' : 'border-slate-900 text-slate-950 bg-slate-200'
                  }`}>
                    <th className="py-3.5 px-4">Carteira / Produto</th>
                    <th className="py-3.5 px-4 text-center">Demanda Solicitada (Produto)</th>
                    <th className="py-3.5 px-4 text-center">Capacidade Aprovada (Empresa)</th>
                    <th className="py-3.5 px-4 text-center">Headcount Ativo Efetivo</th>
                    <th className="py-3.5 px-4 text-center">Vagas Abertas Reais</th>
                    <th className="py-3.5 px-4 text-center">Ajuste / Repressão Estratégica</th>
                    <th className="py-3.5 px-4 text-center">Taxa Atendimento</th>
                    <th className="py-3.5 px-4 text-left">Diagnóstico Estratégico & Observações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y-2 font-mono ${isDark ? 'divide-white/5' : 'divide-slate-300'}`}>
                  {productCalculatedData.map(prod => {
                    const coverageRate = Math.min(100, Math.round((prod.approvedHeadcount / (prod.requestedHeadcount || 1)) * 100));

                    return (
                      <tr key={prod.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-purple-100/70'}`}>
                        <td className={`py-4 px-4 font-sans font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {prod.productName}
                        </td>
                        <td className={`py-4 px-4 text-center font-black text-sm ${isDark ? 'text-purple-300 font-black' : 'text-purple-950'}`}>
                          {prod.requestedHeadcount} PAs
                        </td>
                        <td className={`py-4 px-4 text-center font-black text-sm ${isDark ? 'text-white font-black' : 'text-slate-950'}`}>
                          {prod.approvedHeadcount} PAs
                        </td>
                        <td className={`py-4 px-4 text-center font-black text-sm ${isDark ? 'text-sky-300 font-black' : 'text-slate-950'}`}>
                          {prod.activeHeadcount} PAs
                        </td>
                        <td className={`py-4 px-4 text-center font-black ${
                          prod.openVacancies > 0 ? (isDark ? 'text-amber-400' : 'text-amber-950') : (isDark ? 'text-emerald-400' : 'text-emerald-950')
                        }`}>
                          {prod.openVacancies} Vagas
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                            prod.strategicGap < 0 
                              ? isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-950 border-amber-400'
                              : isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-950 border-emerald-400'
                          }`}>
                            {prod.strategicGap === 0 ? 'Sem Ajustes' : `${prod.strategicGap} PAs`}
                          </span>
                        </td>
                        <td className={`py-4 px-4 text-center font-black ${
                          coverageRate >= 100 ? (isDark ? 'text-emerald-400' : 'text-emerald-950') : (isDark ? 'text-amber-400' : 'text-amber-950')
                        }`}>
                          {coverageRate}%
                        </td>
                        <td className="py-4 px-4 font-sans text-xs">
                          <div className={`p-2 rounded-xl border ${
                            isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-900 text-slate-950 font-bold'
                          }`}>
                            {prod.openVacancies === 0 ? (
                              <span className={isDark ? 'text-emerald-300 font-bold' : 'text-emerald-950 font-black'}>
                                🟢 100% Preenchido ({prod.approvedHeadcount} PAs Operando)
                              </span>
                            ) : (
                              <span className={isDark ? 'text-amber-300 font-bold' : 'text-amber-950 font-black'}>
                                ⚠️ {prod.openVacancies} Vaga(s) Abertas em Seleção
                              </span>
                            )}
                            {prod.statusNote && (
                              <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-900 font-extrabold'}`}>
                                📝 Nota: {prod.statusNote}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR OU EDITAR PRODUTO / CARTEIRA E VÍNCULO DE TIMES */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-6 rounded-3xl border-2 space-y-6 shadow-2xl ${
              isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-900 text-slate-950'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <BuildingOffice size={22} className="text-purple-500" />
                <h3 className="text-base font-black">
                  {editingProductId ? 'Editar Produto & Vínculo de Times' : 'Cadastrar Novo Produto / Carteira'}
                </h3>
              </div>
              <button
                onClick={() => setIsProdModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-black block uppercase text-[10px] text-slate-400">Nome do Produto / Carteira Guarda-Chuva</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Noverde Consignado / Reagendados"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold ${
                    isDark ? 'bg-slate-950 border border-white/10 text-white' : 'bg-slate-100 border-2 border-slate-900 text-slate-950'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-black block uppercase text-[10px] text-purple-400">Solicitado (Produto)</label>
                  <input
                    type="number"
                    min={1}
                    value={prodRequested}
                    onChange={(e) => setProdRequested(Number(e.target.value))}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-950 border border-white/10 text-white' : 'bg-slate-100 border-2 border-slate-900 text-slate-950'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-black block uppercase text-[10px] text-sky-400">Aprovado (Empresa)</label>
                  <input
                    type="number"
                    min={1}
                    value={prodApproved}
                    onChange={(e) => setProdApproved(Number(e.target.value))}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-950 border border-white/10 text-white' : 'bg-slate-100 border-2 border-slate-900 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-black block uppercase text-[10px] text-slate-400">Local / Site Operacional</label>
                <select
                  value={prodSite}
                  onChange={(e) => setProdSite(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold ${
                    isDark ? 'bg-slate-950 border border-white/10 text-white' : 'bg-slate-100 border-2 border-slate-900 text-slate-950'
                  }`}
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              {/* SELEÇÃO DE TIMES VINCULADOS (GUARDA-CHUVA) */}
              <div className="space-y-1">
                <label className="font-black block uppercase text-[10px] text-purple-400">
                  👥 Times Vinculados a este Guarda-Chuva:
                </label>
                <div className={`p-3 rounded-2xl border max-h-36 overflow-y-auto space-y-2 ${
                  isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-2 border-slate-900'
                }`}>
                  {safeTeamsData.length > 0 ? (
                    safeTeamsData.map(team => {
                      const isChecked = selectedTeams.includes(team.id);
                      return (
                        <label key={team.id} className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeams(prev => [...prev, team.id]);
                              } else {
                                setSelectedTeams(prev => prev.filter(id => id !== team.id));
                              }
                            }}
                            className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                          />
                          <span>👥 {team.name} ({team.supervisorName || 'Supervisor'})</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-[11px] italic text-slate-400">Nenhum time cadastrado no sistema.</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-black block uppercase text-[10px] text-slate-400">Nota / Justificativa Estratégica</label>
                <input
                  type="text"
                  value={prodStatusNote}
                  onChange={(e) => setProdStatusNote(e.target.value)}
                  placeholder="Ex: Capacidade ajustada para 8 PAs por decisão da diretoria"
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold ${
                    isDark ? 'bg-slate-950 border border-white/10 text-white' : 'bg-slate-100 border-2 border-slate-900 text-slate-950'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs cursor-pointer shadow-md border-2 border-purple-950"
                >
                  Salvar Produto / Guarda-Chuva
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
