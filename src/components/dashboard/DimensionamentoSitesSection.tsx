import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Funnel,
  Lightbulb
} from '@phosphor-icons/react';
import { UserProfile, Team } from '../../types';
import { db } from '../../lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';

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

// Dados padrão para sandbox (in-memory, sem persistência)
const DEFAULT_SITES: OperationalSite[] = [
  { id: 'site-1', name: 'Site SP Paulista - 4º Andar', city: 'São Paulo - SP', type: 'Presencial' },
  { id: 'site-2', name: 'Site Campinas - Unidade Central', city: 'Campinas - SP', type: 'Presencial' },
  { id: 'site-3', name: 'Home Office / Remoto BR', city: 'Nacional (Brasil)', type: 'Remoto' },
];

const SANDBOX_ORG_ID = 'sandbox-test';

const isSandbox = (orgId: string | undefined) =>
  !orgId || orgId === SANDBOX_ORG_ID;

export const DimensionamentoSitesSection: React.FC<DimensionamentoSitesSectionProps> = ({
  profile,
  teamsData = [],
  teamMembers = [],
  theme = 'dark',
  showToast
}) => {
  const isDark = theme === 'dark';
  const organizationId = profile.organizationId;
  const sandbox = isSandbox(organizationId);

  // Alternador de Sub-Aba: Dimensionamento & Presença vs Forecast Estratégico
  const [activeTab, setActiveTab] = useState<'dimensioning' | 'forecast'>('dimensioning');

  // Arrays com fallback seguro defensivo absoluto
  const safeTeamMembers = useMemo(() => Array.isArray(teamMembers) ? teamMembers : [], [teamMembers]);
  const safeTeamsData = useMemo(() => Array.isArray(teamsData) ? teamsData : [], [teamsData]);

  // ── SITES OPERACIONAIS ──────────────────────────────────────────────────────
  const [sites, setSites] = useState<OperationalSite[]>(DEFAULT_SITES);
  const [sitesLoading, setSitesLoading] = useState(!sandbox);

  useEffect(() => {
    if (sandbox) {
      setSites(DEFAULT_SITES);
      setSitesLoading(false);
      return;
    }

    const sitesCol = collection(db, 'organizations', organizationId!, 'operational_sites');
    const q = query(sitesCol, orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          // Primeira vez: inicializa com os sites padrão no Firestore
          DEFAULT_SITES.forEach(async (s) => {
            await setDoc(doc(db, 'organizations', organizationId!, 'operational_sites', s.id), s);
          });
          setSites(DEFAULT_SITES);
        } else {
          setSites(snap.docs.map(d => ({ id: d.id, ...d.data() } as OperationalSite)));
        }
        setSitesLoading(false);
      },
      (err) => {
        console.error('[DimensionamentoSites] sites onSnapshot error:', err);
        setSitesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId, sandbox]);

  // ── PRODUTOS / CARTEIRAS ────────────────────────────────────────────────────
  const getDefaultProducts = useCallback((): ProductVacancy[] => [
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
  ], [safeTeamsData]);

  const [products, setProducts] = useState<ProductVacancy[]>([]);
  const [productsLoading, setProductsLoading] = useState(!sandbox);

  useEffect(() => {
    if (sandbox) {
      setProducts(getDefaultProducts());
      setProductsLoading(false);
      return;
    }

    const productsCol = collection(db, 'organizations', organizationId!, 'operational_products');
    const q = query(productsCol, orderBy('productName'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          // Primeira vez: inicializa com os produtos padrão no Firestore
          const defaults = getDefaultProducts();
          defaults.forEach(async (p) => {
            await setDoc(doc(db, 'organizations', organizationId!, 'operational_products', p.id), p);
          });
          setProducts(defaults);
        } else {
          setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductVacancy)));
        }
        setProductsLoading(false);
      },
      (err) => {
        console.error('[DimensionamentoSites] products onSnapshot error:', err);
        setProductsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId, sandbox, getDefaultProducts]);

  // ── MODAIS DE PRODUTO / CARTEIRA ────────────────────────────────────────────
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [prodName, setProdName] = useState('');
  const [prodRequested, setProdRequested] = useState(10);
  const [prodApproved, setProdApproved] = useState(8);
  const [prodSite, setProdSite] = useState('');
  const [prodForecastVal, setProdForecastVal] = useState('R$ 100.000 / mês');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [prodStatusNote, setProdStatusNote] = useState('');

  const handleOpenNewProdModal = () => {
    setEditingProductId(null);
    setProdName('');
    setProdRequested(10);
    setProdApproved(8);
    setProdSite(sites[0]?.name || '');
    setProdForecastVal('R$ 100.000 / mês');
    setSelectedTeams([]);
    setProdStatusNote('');
    setIsProdModalOpen(true);
  };

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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const id = editingProductId || `prod-${Date.now()}`;
    const payload: ProductVacancy = {
      id,
      productName: prodName,
      requestedHeadcount: Number(prodRequested),
      approvedHeadcount: Number(prodApproved),
      siteLocation: prodSite,
      forecastProductivity: prodForecastVal,
      linkedTeamIds: selectedTeams,
      statusNote: prodStatusNote
    };

    if (sandbox) {
      setProducts(prev =>
        editingProductId
          ? prev.map(p => p.id === editingProductId ? payload : p)
          : [...prev, payload]
      );
    } else {
      try {
        await setDoc(
          doc(db, 'organizations', organizationId!, 'operational_products', id),
          payload
        );
      } catch (err) {
        console.error('[DimensionamentoSites] saveProduct error:', err);
        showToast('Erro ao salvar no banco de dados.', 'error');
        return;
      }
    }

    showToast(editingProductId ? 'Produto/Carteira atualizada com sucesso!' : 'Novo Produto/Carteira cadastrado com sucesso!', 'success');
    setIsProdModalOpen(false);
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este Produto/Carteira?')) return;

    if (sandbox) {
      setProducts(prev => prev.filter(p => p.id !== prodId));
    } else {
      try {
        await deleteDoc(doc(db, 'organizations', organizationId!, 'operational_products', prodId));
      } catch (err) {
        console.error('[DimensionamentoSites] deleteProduct error:', err);
        showToast('Erro ao excluir do banco de dados.', 'error');
        return;
      }
    }
    showToast('Produto/Carteira removido.', 'success');
  };

  // ── MODAL DE SITE OPERACIONAL ───────────────────────────────────────────────
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteType, setSiteType] = useState<'Presencial' | 'Remoto'>('Presencial');
  const [autoSelectForProdModal, setAutoSelectForProdModal] = useState(false);

  const handleOpenNewSiteModal = (fromProdModal = false) => {
    setEditingSiteId(null);
    setSiteName('');
    setSiteCity('');
    setSiteType('Presencial');
    setAutoSelectForProdModal(fromProdModal);
    setIsSiteModalOpen(true);
  };

  const handleOpenEditSiteModal = (site: OperationalSite) => {
    setEditingSiteId(site.id);
    setSiteName(site.name);
    setSiteCity(site.city);
    setSiteType(site.type);
    setAutoSelectForProdModal(false);
    setIsSiteModalOpen(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    const id = editingSiteId || `site-${Date.now()}`;
    const siteData: OperationalSite = {
      id,
      name: siteName,
      city: siteCity || 'Brasil',
      type: siteType
    };

    if (sandbox) {
      setSites(prev =>
        editingSiteId
          ? prev.map(s => s.id === editingSiteId ? siteData : s)
          : [...prev, siteData]
      );
    } else {
      try {
        await setDoc(
          doc(db, 'organizations', organizationId!, 'operational_sites', id),
          siteData
        );
      } catch (err) {
        console.error('[DimensionamentoSites] saveSite error:', err);
        showToast('Erro ao salvar site no banco de dados.', 'error');
        return;
      }
    }

    if (autoSelectForProdModal || !prodSite) {
      setProdSite(siteName);
    }

    setIsSiteModalOpen(false);
    setSiteName('');
    setSiteCity('');
    setEditingSiteId(null);
    setAutoSelectForProdModal(false);
    showToast(editingSiteId ? 'Site Operacional atualizado!' : 'Novo Site Operacional cadastrado!', 'success');
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este Site Operacional?')) return;

    if (sandbox) {
      setSites(prev => prev.filter(s => s.id !== siteId));
    } else {
      try {
        await deleteDoc(doc(db, 'organizations', organizationId!, 'operational_sites', siteId));
      } catch (err) {
        console.error('[DimensionamentoSites] deleteSite error:', err);
        showToast('Erro ao excluir site do banco de dados.', 'error');
        return;
      }
    }
    showToast('Site Operacional removido.', 'success');
  };

  // ── CÁLCULOS CONSOLIDADOS ───────────────────────────────────────────────────
  const productCalculatedData = useMemo(() => {
    return products.map(prod => {
      const linkedOps = safeTeamMembers.filter(m => 
        prod.linkedTeamIds.includes(m.teamId || '') || 
        (prod.linkedTeamIds.length === 0 && (m.role === 'member' || !m.role))
      );

      const activeHeadcount = linkedOps.length;
      const loggedOps = linkedOps.filter(m => m.absenteeismRate === undefined || m.absenteeismRate < 50);
      const loggedCount = loggedOps.length;
      const openVacancies = Math.max(0, prod.approvedHeadcount - activeHeadcount);
      const strategicGap = prod.approvedHeadcount - prod.requestedHeadcount;
      const linkedTeamNames = prod.linkedTeamIds.map(tId => {
        const found = safeTeamsData.find(t => t.id === tId);
        return found ? found.name : tId;
      });

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

  const totalRequested = productCalculatedData.reduce((acc, p) => acc + p.requestedHeadcount, 0);
  const totalApproved = productCalculatedData.reduce((acc, p) => acc + p.approvedHeadcount, 0);
  const totalActive = productCalculatedData.reduce((acc, p) => acc + p.activeHeadcount, 0);
  const totalLogged = productCalculatedData.reduce((acc, p) => acc + p.loggedCount, 0);
  const totalOpenVacancies = productCalculatedData.reduce((acc, p) => acc + p.openVacancies, 0);
  const totalStrategicGap = totalApproved - totalRequested;

  const isLoading = sitesLoading || productsLoading;

  return (
    <div className="space-y-5">
      {/* BARRA SUPERIOR COMPACTA DE NAVEGAÇÃO & AÇÕES */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDark 
          ? 'bg-[#161b22] border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            isDark
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            <BuildingOffice size={22} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">Dimensionamento & Sites</h2>
              {!sandbox && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  Firestore Sync
                </span>
              )}
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Gestão estratégica de PAs, carteiras e capacidade operacional
            </p>
          </div>
        </div>

        {/* CONTROLE DE SUB-ABAS + BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('dimensioning')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dimensioning'
                  ? 'bg-[#4f46e5] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headset size={15} />
              Dimensionamento & Presença
            </button>
            <div className="relative flex items-center group">
              <button
                onClick={() => setActiveTab('forecast')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'forecast'
                    ? 'bg-[#4f46e5] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ChartPie size={15} />
                Forecast
              </button>
              <button
                type="button"
                className="p-1 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer ml-1"
                title="Como funciona o Forecast de Demanda"
              >
                <Lightbulb size={15} weight="fill" />
              </button>
              {/* Tooltip ao passar o mouse */}
              <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 z-50 hidden group-hover:block space-y-1">
                <strong className="text-amber-400 font-bold block flex items-center gap-1">
                  💡 Como Funciona o Forecast:
                </strong>
                <p className="leading-relaxed text-slate-300 font-normal">
                  O Produto solicita PAs (demanda). A empresa aprova um limite por orçamento. A diferença reflete a <span className="text-amber-300 font-bold">Repressão Estratégica de Demanda</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenNewSiteModal(false)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#1f2937] hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              <MapPin size={14} />
              + Novo Site
            </button>
            <button
              onClick={handleOpenNewProdModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} weight="bold" />
              Novo Produto / Carteira
            </button>
          </div>
        </div>
      </div>

      {/* CARDS RESUMO DE CAPACIDADE & PRESENÇA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Solicitado pelo Produto */}
        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
          isDark ? 'bg-[#161b22] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            📋 Solicitado (Demanda)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {totalRequested} <span className="text-xs font-normal text-slate-400">PAs</span>
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              isDark ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
            }`}>
              Produto
            </span>
          </div>
        </div>

        {/* Aprovado pela Empresa */}
        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
          isDark ? 'bg-[#161b22] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            🛡️ Aprovado (Empresa)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {totalApproved} <span className="text-xs font-normal text-slate-400">PAs</span>
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              totalStrategicGap < 0 
                ? isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                : isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {totalStrategicGap < 0 ? `${totalStrategicGap} PAs` : '100%'}
            </span>
          </div>
        </div>

        {/* Contratados Ativos */}
        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
          isDark ? 'bg-[#161b22] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            👥 Contratados (Ativos)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {totalActive} <span className="text-xs font-normal text-slate-400">PAs</span>
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-700'
            }`}>
              Quadro Efetivo
            </span>
          </div>
        </div>

        {/* Logados / Presentes no Dia */}
        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
          isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200 shadow-xs'
        }`}>
          <span className={`text-[11px] font-medium block ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
            🟢 Presentes Hoje
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {totalLogged} <span className="text-xs font-normal text-emerald-300">Ops</span>
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {totalActive > 0 ? `${Math.round((totalLogged / totalActive) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Vagas Abertas Reais */}
        <div className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
          isDark ? 'bg-[#161b22] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            ⚡ Vagas Abertas Reais
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {totalOpenVacancies} <span className="text-xs font-normal text-slate-400">Vagas</span>
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              totalOpenVacancies > 0 
                ? isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200' 
                : isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {totalOpenVacancies > 0 ? 'Em Seleção' : 'Preenchida'}
            </span>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: DIMENSIONAMENTO & PRESENÇA EM TEMPO REAL */}
      {activeTab === 'dimensioning' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border overflow-hidden transition-all ${
            isDark 
              ? 'bg-[#161b22] border-slate-800 text-white' 
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className={`px-5 py-3 border-b flex items-center justify-between gap-4 ${
              isDark ? 'border-slate-800' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Headset size={16} className="text-indigo-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Dimensionamento por Carteira & Presença em Tempo Real
                </h3>
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center gap-2 p-6 text-xs text-slate-400">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                Carregando produtos...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b font-semibold uppercase tracking-wider text-[11px] ${
                      isDark ? 'border-slate-800 text-slate-300 bg-[#0d1117]' : 'border-slate-200 text-slate-600 bg-slate-100/70'
                    }`}>
                      <th className="py-3 px-4">Carteira / Produto</th>
                      <th className="py-3 px-4">Times Vinculados (Guarda-Chuva)</th>
                      <th className="py-3 px-4 text-center">Meta (PAs)</th>
                      <th className="py-3 px-4 text-center">Ativos</th>
                      <th className="py-3 px-4 text-center">🟢 Logados Hoje</th>
                      <th className="py-3 px-4 text-center">Vagas Abertas</th>
                      <th className="py-3 px-4 text-left">Local / Site</th>
                      <th className="py-3 px-4 text-right">Forecast Prod.</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                    {productCalculatedData.map(prod => (
                      <tr key={prod.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="py-3.5 px-4 font-sans font-semibold text-white">
                          {prod.productName}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex flex-wrap gap-1">
                            {prod.linkedTeamNames.length > 0 ? (
                              prod.linkedTeamNames.map((tName, i) => (
                                <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                                  isDark ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                }`}>
                                  👥 {tName}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] italic text-slate-400">
                                Sem times vinculados
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-xs text-white">
                          {prod.approvedHeadcount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-xs text-white">
                          {prod.activeHeadcount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1 border ${
                            isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            🟢 {prod.loggedCount} Presente(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-white">
                          {prod.openVacancies}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-200">
                          <div className="flex items-center gap-1">
                            <MapPin size={13} className="text-indigo-400" />
                            {prod.siteLocation}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {prod.forecastProductivity}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap inline-flex items-center justify-center border ${
                            prod.status === 'preenchida' 
                              ? isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : prod.status === 'selecao' 
                                ? isDark ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                                : prod.status === 'treinamento' 
                                  ? isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200' 
                                  : isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {prod.status === 'preenchida' ? 'Preenchida' : prod.status === 'selecao' ? 'Em Seleção' : prod.status === 'treinamento' ? 'Em Treinamento' : 'Aberta'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => handleOpenEditProdModal(prod)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                              title="Editar Produto / Carteira"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                              title="Excluir Produto"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {productCalculatedData.length === 0 && (
                      <tr>
                        <td colSpan={10} className={`py-8 text-center text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Nenhum produto/carteira cadastrado. Clique em "Novo Produto / Carteira" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: FORECAST & AJUSTE ESTRATÉGICO DE DEMANDA */}
      {activeTab === 'forecast' && (
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
                <ChartPie size={18} className={isDark ? 'text-sky-400' : 'text-sky-800'} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>
                  Comparativo: Demanda Solicitada (Produto) vs Capacidade Aprovada (Empresa)
                </h3>
                <div className="relative group ml-1">
                  <button
                    type="button"
                    className="p-1 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    title="Como funciona o Forecast de Demanda"
                  >
                    <Lightbulb size={16} weight="fill" />
                  </button>
                  <div className="absolute left-0 top-full mt-2 w-80 p-3.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 z-50 hidden group-hover:block space-y-1.5">
                    <strong className="text-amber-400 font-bold block flex items-center gap-1">
                      💡 Como Funciona o Forecast:
                    </strong>
                    <p className="leading-relaxed text-slate-300 font-normal">
                      O Produto pode solicitar uma quantidade inicial de PAs (ex: 10 PAs). A Diretoria aprova um limite por orçamento (ex: 8 PAs). Mesmo com 100% dos PAs contratados, a diferença reflete a <span className="text-amber-300 font-bold">Repressão Estratégica de Demanda</span>.
                    </p>
                  </div>
                </div>
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

      {/* MODAL: NOVO SITE OPERACIONAL */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm p-5 rounded-2xl border space-y-4 shadow-xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-indigo-400" />
                <h3 className="text-sm font-semibold">
                  {editingSiteId ? 'Editar Site Operacional' : 'Novo Site Operacional'}
                </h3>
              </div>
              <button
                onClick={() => setIsSiteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSite} className="space-y-3.5 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-semibold block uppercase text-[10px] text-slate-400">Nome do Site *</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Ex: Site Rio de Janeiro - Centro"
                  required
                  autoFocus
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block uppercase text-[10px] text-slate-400">Cidade / Estado</label>
                <input
                  type="text"
                  value={siteCity}
                  onChange={(e) => setSiteCity(e.target.value)}
                  placeholder="Ex: Rio de Janeiro - RJ"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block uppercase text-[10px] text-slate-400">Tipo</label>
                <div className="flex gap-2">
                  {(['Presencial', 'Remoto'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSiteType(t)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        siteType === t
                          ? 'bg-indigo-600 text-white border-indigo-500/30'
                          : isDark
                            ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {t === 'Presencial' ? '🏢' : '🏠'} {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-sm"
                >
                  {editingSiteId ? 'Atualizar Site' : 'Salvar Site'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: CADASTRAR OU EDITAR PRODUTO / CARTEIRA E VÍNCULO DE TIMES */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-5 rounded-2xl border space-y-4 shadow-xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <BuildingOffice size={20} className="text-indigo-400" />
                <h3 className="text-sm font-semibold">
                  {editingProductId ? 'Editar Produto & Vínculo de Times' : 'Cadastrar Novo Produto / Carteira'}
                </h3>
              </div>
              <button
                onClick={() => setIsProdModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-semibold block uppercase text-[10px] text-slate-400">Nome do Produto / Carteira Guarda-Chuva</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Noverde Consignado / Reagendados"
                  required
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold block uppercase text-[10px] text-indigo-400">Solicitado (Produto)</label>
                  <input
                    type="number"
                    min={1}
                    value={prodRequested}
                    onChange={(e) => setProdRequested(Number(e.target.value))}
                    required
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-medium ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block uppercase text-[10px] text-slate-300">Aprovado (Empresa)</label>
                  <input
                    type="number"
                    min={1}
                    value={prodApproved}
                    onChange={(e) => setProdApproved(Number(e.target.value))}
                    required
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-medium ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold block uppercase text-[10px] text-slate-400">Local / Site Operacional</label>
                  <button
                    type="button"
                    onClick={() => handleOpenNewSiteModal(true)}
                    className="text-[10px] font-semibold text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    + Cadastrar Novo Site
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={prodSite}
                    onChange={(e) => setProdSite(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                    }`}
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                  {prodSite && (() => {
                    const selectedSiteObj = sites.find(s => s.name === prodSite);
                    if (!selectedSiteObj) return null;
                    return (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSiteModal(selectedSiteObj)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                          }`}
                          title="Editar este site"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSite(selectedSiteObj.id)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isDark ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          }`}
                          title="Excluir este site"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block uppercase text-[10px] text-slate-400">Forecast de Produtividade</label>
                <input
                  type="text"
                  value={prodForecastVal}
                  onChange={(e) => setProdForecastVal(e.target.value)}
                  placeholder="Ex: R$ 120.000 / mês"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* SELEÇÃO DE TIMES VINCULADOS (GUARDA-CHUVA) */}
              <div className="space-y-1">
                <label className="font-semibold block uppercase text-[10px] text-indigo-400">
                  👥 Times Vinculados a este Guarda-Chuva:
                </label>
                <div className={`p-2.5 rounded-xl border max-h-36 overflow-y-auto space-y-1.5 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  {safeTeamsData.length > 0 ? (
                    safeTeamsData.map(team => {
                      const isChecked = selectedTeams.includes(team.id);
                      return (
                        <label key={team.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium">
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
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
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
                <label className="font-semibold block uppercase text-[10px] text-slate-400">Nota / Justificativa Estratégica</label>
                <input
                  type="text"
                  value={prodStatusNote}
                  onChange={(e) => setProdStatusNote(e.target.value)}
                  placeholder="Ex: Capacidade ajustada para 8 PAs por decisão da diretoria"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-sm"
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
