import React, { useState, useEffect, useMemo } from 'react';
import { 
  Buildings as Building2, 
  Users, 
  Stack as Layers, 
  SignOut as LogOut, 
  UserCheck, 
  Globe, 
  Clock, 
  Gear as Settings, 
  Trash as Trash2, 
  UserMinus, 
  Power, 
  Power as PowerOff, 
  Check, 
  X, 
  CircleNotch as Loader2, 
  Calendar as CalendarDays,
  Pulse as Activity,
  UserCheck as UserCheck2,
  Copy,
  Plus,
  Key,
  ArrowsCounterClockwise as RefreshCw,
  Palette,
  Sparkle,
  Sun,
  Moon,
  ShareNetwork,
  EnvelopeSimple,
  PaperPlaneRight,
  ShieldCheck,
  ChartLineUp
} from '@phosphor-icons/react';
import { useDesignMode } from '../../hooks/useDesignMode';
import { useTheme } from '../../hooks/useTheme';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { regenerateManagerInviteToken, generateSecureToken } from '../../lib/teams';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Organization, UserProfile, Team } from '../../types';
import { logAudit } from '../../lib/audit';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomConfirm } from '../ui/CustomConfirm';

import { ToastType } from '../ui/Toast';
import { CompanyUserSetupModal } from '../modals/CompanyUserSetupModal';
import { EmailTesterModal } from '../modals/EmailTesterModal';

interface AdminDashboardProps {
  profile: UserProfile;
  onLogoutSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
  onStartSimulation: (role: 'manager' | 'supervisor' | 'member' | 'monitor' | 'backoffice' | 'coordinator') => void;
}

export const AdminDashboard = ({ profile, onLogoutSuccess, showToast, onStartSimulation }: AdminDashboardProps) => {
  const { theme, toggleTheme } = useTheme();
  const [designMode, setDesignMode] = useDesignMode();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<'companies' | 'metrics' | 'email'>('companies');

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deletingProgress, setDeletingProgress] = useState('');
  const [isProvisioningSandbox, setIsProvisioningSandbox] = useState(false);
  
  // Modais de edição de empresas
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editPlan, setEditPlan] = useState<Organization['plan']>('free');
  const [editStatus, setEditStatus] = useState<Organization['status']>('active');
  const [editMaxUsers, setEditMaxUsers] = useState(5);
  const [editMaxTeams, setEditMaxTeams] = useState(1);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editCrmOrgId, setEditCrmOrgId] = useState('');
  const [editCrmClientId, setEditCrmClientId] = useState('');
  const [editCrmPublicToken, setEditCrmPublicToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal de criação de organização
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCnpj, setNewOrgCnpj] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<Organization['plan']>('free');
  const [newOrgMaxUsers, setNewOrgMaxUsers] = useState(5);
  const [newOrgMaxTeams, setNewOrgMaxTeams] = useState(1);
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);

  // Modal de Setup de Usuários e Convites da Empresa
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupOrg, setSetupOrg] = useState<{ id: string; name: string; maxUsers?: number } | null>(null);

  // Modal de Teste de E-mail do Resend (SuperAdmin)
  const [isEmailTesterOpen, setIsEmailTesterOpen] = useState(false);

  const handleOpenUserSetup = (org: Organization) => {
    setSetupOrg({ id: org.id, name: org.name, maxUsers: org.maxUsers });
    setIsSetupModalOpen(true);
  };

  const handleCopyDemoLink = () => {
    const demoUrl = `${window.location.origin}/demo`;
    navigator.clipboard.writeText(demoUrl);
    setCopiedDemo(true);
    showToast('Link de Demonstração (/demo) copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedDemo(false), 3000);
  };

  useEffect(() => {
    // Carregar todas as organizações
    const unsubscribeOrgs = onSnapshot(collection(db, 'organizations'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
      setOrganizations(data);
    }, (error) => {
      console.error(error);
      showToast('Erro ao carregar organizações.', 'error');
    });

    // Carregar todos os usuários do sistema
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(data);
    }, (error) => {
      console.error(error);
      showToast('Erro ao carregar usuários.', 'error');
    });

    // Carregar todos os times do sistema
    const unsubscribeTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
      setTeams(data);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      showToast('Erro ao carregar equipes.', 'error');
    });

    return () => {
      unsubscribeOrgs();
      unsubscribeUsers();
      unsubscribeTeams();
    };
  }, []);

  const handleSimulateRole = async (role: 'manager' | 'supervisor' | 'member' | 'monitor' | 'backoffice' | 'coordinator', forceProvision = false) => {
    setIsProvisioningSandbox(true);
    try {
      const sandboxOrgId = 'sandbox-test';
      const orgRef = doc(db, 'organizations', sandboxOrgId);
      const orgSnap = await getDoc(orgRef);

      if (!orgSnap.exists() || forceProvision) {
        showToast(forceProvision ? 'Reiniciando ambiente Sandbox...' : 'Provisionando ambiente Sandbox fictício...', 'info');
        
        await setDoc(orgRef, {
          id: sandboxOrgId,
          name: 'Empresa de Teste (Sandbox)',
          status: 'active',
          plan: 'enterprise',
          maxUsers: 100,
          maxTeams: 20,
          createdAt: new Date().toISOString()
        });

        const teamAlphaRef = doc(db, 'teams', 'sandbox-team-alpha');
        await setDoc(teamAlphaRef, {
          id: 'sandbox-team-alpha',
          name: 'Equipe Alpha (Testes)',
          supervisorId: 'sandbox-user-supervisor',
          inviteToken: 'sandbox-token-alpha',
          organizationId: sandboxOrgId,
          monthlyGoal: 100000,
          effectivenessGoal: 85,
          createdAt: new Date().toISOString()
        });

        const teamBetaRef = doc(db, 'teams', 'sandbox-team-beta');
        await setDoc(teamBetaRef, {
          id: 'sandbox-team-beta',
          name: 'Equipe Beta (Testes)',
          supervisorId: 'sandbox-user-manager',
          inviteToken: 'sandbox-token-beta',
          organizationId: sandboxOrgId,
          monthlyGoal: 150000,
          effectivenessGoal: 90,
          createdAt: new Date().toISOString()
        });

        const managerProfileRef = doc(db, 'users', 'sandbox-user-manager');
        await setDoc(managerProfileRef, {
          uid: 'sandbox-user-manager',
          email: 'gerente@sandbox.local',
          displayName: 'Gerente de Testes',
          role: 'manager',
          organizationId: sandboxOrgId,
          createdAt: new Date().toISOString(),
          acceptedTermsAt: new Date().toISOString(),
          termsAccepted: true
        });

        const supervisorProfileRef = doc(db, 'users', 'sandbox-user-supervisor');
        await setDoc(supervisorProfileRef, {
          uid: 'sandbox-user-supervisor',
          email: 'supervisor@sandbox.local',
          displayName: 'Supervisor de Testes',
          role: 'supervisor',
          organizationId: sandboxOrgId,
          teamId: 'sandbox-team-alpha',
          managedTeams: ['sandbox-team-alpha'],
          createdAt: new Date().toISOString(),
          acceptedTermsAt: new Date().toISOString(),
          termsAccepted: true
        });

        const operatorProfileRef = doc(db, 'users', 'sandbox-user-operator');
        await setDoc(operatorProfileRef, {
          uid: 'sandbox-user-operator',
          email: 'operador@sandbox.local',
          displayName: 'Operador de Testes',
          role: 'member',
          organizationId: sandboxOrgId,
          teamId: 'sandbox-team-alpha',
          createdAt: new Date().toISOString(),
          acceptedTermsAt: new Date().toISOString(),
          termsAccepted: true
        });

        const monitorProfileRef = doc(db, 'users', 'sandbox-user-monitor');
        await setDoc(monitorProfileRef, {
          uid: 'sandbox-user-monitor',
          email: 'monitor@sandbox.local',
          displayName: 'Monitor de Testes',
          role: 'monitor',
          organizationId: sandboxOrgId,
          createdAt: new Date().toISOString(),
          acceptedTermsAt: new Date().toISOString(),
          termsAccepted: true
        });

        const backofficeProfileRef = doc(db, 'users', 'sandbox-user-backoffice');
        await setDoc(backofficeProfileRef, {
          uid: 'sandbox-user-backoffice',
          email: 'backoffice@sandbox.local',
          displayName: 'Back Office de Testes',
          role: 'backoffice',
          jobTitle: 'Back Office',
          organizationId: sandboxOrgId,
          teamId: 'sandbox-team-alpha',
          createdAt: new Date().toISOString(),
          acceptedTermsAt: new Date().toISOString(),
          termsAccepted: true
        });

        const agreements = [
          {
            id: 'sandbox-agree-1',
            clientName: 'José Silva (Fictício)',
            clientCpf: '12345678900',
            value: 1500,
            status: 'pago',
            createdAt: new Date().toISOString(),
            createdBy: 'sandbox-user-operator',
            teamId: 'sandbox-team-alpha',
            organizationId: sandboxOrgId
          },
          {
            id: 'sandbox-agree-2',
            clientName: 'Maria Souza (Fictício)',
            clientCpf: '98765432111',
            value: 2500,
            status: 'aguardando',
            createdAt: new Date().toISOString(),
            createdBy: 'sandbox-user-operator',
            teamId: 'sandbox-team-alpha',
            organizationId: sandboxOrgId
          }
        ];

        await Promise.all(
          agreements.map(arg => setDoc(doc(db, 'agreements', arg.id), arg))
        );

        showToast('Ambiente Sandbox provisionado com sucesso!', 'success');
      }

      onStartSimulation(role);
    } catch (error: any) {
      console.error(error);
      showToast(`Erro ao iniciar simulação: ${error.message}`, 'error');
    } finally {
      setIsProvisioningSandbox(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogoutSuccess();
    } catch (e) {
      showToast('Erro ao sair do sistema.', 'error');
    }
  };

  const openEditModal = (org: Organization) => {
    setSelectedOrg(org);
    setEditPlan(org.plan);
    setEditStatus(org.status);
    setEditMaxUsers(org.maxUsers || 5);
    setEditMaxTeams(org.maxTeams || 1);
    setEditExpiresAt(org.planExpiresAt || '');
    setEditCrmOrgId(org.crmOrgId || '');
    setEditCrmClientId(org.crmClientId || '');
    setEditCrmPublicToken(org.crmPublicToken || '');
  };

  const handleSaveLimits = async () => {
    if (!selectedOrg) return;
    setIsSaving(true);
    try {
      const orgRef = doc(db, 'organizations', selectedOrg.id);
      const updateData: Partial<Organization> = {
        plan: editPlan,
        status: editStatus,
        maxUsers: Number(editMaxUsers),
        maxTeams: Number(editMaxTeams),
        planExpiresAt: editExpiresAt || undefined,
        crmOrgId: editCrmOrgId.trim() || undefined,
        crmClientId: editCrmClientId.trim() || undefined,
        crmPublicToken: editCrmPublicToken.trim() || undefined
      };
      await updateDoc(orgRef, updateData);
      
      await logAudit('ACCEPT_TERMS', { 
        action: 'UPDATE_ORG_PLAN', 
        targetOrgId: selectedOrg.id,
        plan: editPlan,
        status: editStatus
      }, profile.displayName, profile.organizationId);

      showToast('Empresa atualizada com sucesso!', 'success');
      setSelectedOrg(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar empresa.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlanChange = (plan: Organization['plan']) => {
    setNewOrgPlan(plan);
    if (plan === 'free') {
      setNewOrgMaxUsers(5);
      setNewOrgMaxTeams(1);
    } else if (plan === 'starter') {
      setNewOrgMaxUsers(15);
      setNewOrgMaxTeams(3);
    } else if (plan === 'pro') {
      setNewOrgMaxUsers(40);
      setNewOrgMaxTeams(8);
    } else if (plan === 'enterprise') {
      setNewOrgMaxUsers(150);
      setNewOrgMaxTeams(30);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      showToast('Nome da empresa é obrigatório.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const orgId = `org-${generateSecureToken(6).toLowerCase()}`;
      const managerToken = `MGR-${generateSecureToken(6).toUpperCase()}`;
      const supervisorToken = `SUP-${generateSecureToken(6).toUpperCase()}`;
      const now = new Date().toISOString();

      const newOrg: Organization = {
        id: orgId,
        name: newOrgName.trim(),
        cnpj: newOrgCnpj.trim() || undefined,
        status: 'pending',
        plan: newOrgPlan,
        maxUsers: Number(newOrgMaxUsers),
        maxTeams: Number(newOrgMaxTeams),
        managerInviteToken: managerToken,
        supervisorInviteToken: supervisorToken,
        createdAt: now
      };

      await setDoc(doc(db, 'organizations', orgId), newOrg);
      
      await logAudit('CREATE_ORGANIZATION', {
        orgId,
        name: newOrgName,
        plan: newOrgPlan
      }, profile.displayName, profile.organizationId);

      showToast('Empresa criada com sucesso!', 'success');
      
      setNewOrgName('');
      setNewOrgCnpj('');
      setNewOrgPlan('free');
      setNewOrgMaxUsers(5);
      setNewOrgMaxTeams(1);
      setIsCreateOrgOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Erro ao criar empresa.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (org: Organization) => {
    try {
      const newStatus = org.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'organizations', org.id), { status: newStatus });
      showToast(`Empresa ${org.name} foi ${newStatus === 'active' ? 'ativada' : 'inativada'}!`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao alterar status da empresa.', 'error');
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    setIsDeleting(orgId);
    try {
      const deleteInBatches = async (collectionName: string, progressMessage: string) => {
        setDeletingProgress(progressMessage);
        const ref = collection(db, collectionName);
        const q = query(ref, where('organizationId', '==', orgId));
        const snap = await getDocs(q);
        
        if (snap.empty) return;
        
        const docs = snap.docs;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      };

      await deleteInBatches('agreements', 'Apagando acordos da empresa...');
      await deleteInBatches('teams', 'Apagando equipes...');
      await deleteInBatches('reconciliations', 'Apagando conciliações...');
      await deleteInBatches('settings', 'Apagando configurações...');
      await deleteInBatches('audit_logs', 'Apagando logs de auditoria...');
      await deleteInBatches('users', 'Apagando perfis de usuários...');

      setDeletingProgress('Finalizando exclusão da empresa...');
      await deleteDoc(doc(db, 'organizations', orgId));

      showToast(`Empresa "${orgName}" excluída permanentemente com sucesso.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao realizar a exclusão do tenant.', 'error');
    } finally {
      setIsDeleting(null);
      setDeletingProgress('');
    }
  };

  const stats = useMemo(() => {
    const filteredOrgs = organizations.filter(o => o.id !== 'sandbox-test');
    const filteredUsers = users.filter(u => u.organizationId !== 'sandbox-test');

    const totalOrgs = filteredOrgs.length;
    const activeOrgs = filteredOrgs.filter(o => o.status === 'active').length;
    const totalUsers = filteredUsers.length;
    const planCounts = filteredOrgs.reduce((acc, curr) => {
      acc[curr.plan] = (acc[curr.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalOrgs, activeOrgs, totalUsers, planCounts };
  }, [organizations, users]);

  const hasSandbox = useMemo(() => organizations.some(o => o.id === 'sandbox-test'), [organizations]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Loader2 className="animate-spin text-sky-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans pb-20 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* CABEÇALHO MASTER */}
      <header className={`sticky top-0 z-30 px-6 py-4 border-b ${
        theme === 'dark' ? 'bg-slate-900/60 backdrop-blur-xl border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm text-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldCheck size={28} weight="bold" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>Painel SaaS Master (SuperAdmin)</span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sistema Ativo
                </span>
              </h1>
              <span className="text-xs text-slate-400 font-semibold block mt-0.5">
                Bem-vindo, <strong>{profile.displayName}</strong> • Gestão de Inquilinos, Licenças e Demonstrações
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* BOTÃO PARA COPIAR LINK DE DEMONSTRAÇÃO /demo */}
            <button
              onClick={handleCopyDemoLink}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              title="Copiar link publico da rota /demo para enviar a clientes"
            >
              {copiedDemo ? <Check size={16} className="text-emerald-300" /> : <ShareNetwork size={16} weight="bold" />}
              {copiedDemo ? 'Link /demo Copiado!' : 'Copiar Link de Demonstração (/demo)'}
            </button>

            {/* BOTÃO TESTAR E-MAIL RESEND */}
            <button
              onClick={() => setIsEmailTesterOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/30 font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <EnvelopeSimple size={16} weight="bold" />
              Testar E-mail Resend
            </button>

            {/* TOGGLE TEMA */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all border cursor-pointer active:scale-95 ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              {theme === 'dark' ? <Sun size={16} weight="duotone" /> : <Moon size={16} weight="duotone" />}
            </button>

            {/* SAIR */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* CARDS DE INDICADORES EXECUTIVOS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl border bg-slate-900/40 border-white/10 relative overflow-hidden flex items-center gap-4 shadow-xl">
            <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
              <Building2 size={28} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Total de Empresas</span>
              <span className="text-3xl font-black text-white">{stats.totalOrgs}</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl border bg-slate-900/40 border-white/10 relative overflow-hidden flex items-center gap-4 shadow-xl">
            <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Activity size={28} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Empresas Ativas</span>
              <span className="text-3xl font-black text-emerald-400">{stats.activeOrgs}</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl border bg-slate-900/40 border-white/10 relative overflow-hidden flex items-center gap-4 shadow-xl">
            <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
              <Users size={28} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Total de Usuários</span>
              <span className="text-3xl font-black text-purple-300">{stats.totalUsers}</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl border bg-slate-900/40 border-white/10 relative overflow-hidden flex items-center gap-4 shadow-xl">
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Layers size={28} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Planos Ativos</span>
              <div className="text-[11px] font-bold text-slate-300 flex gap-2 flex-wrap mt-1">
                <span>Free: {stats.planCounts.free || 0}</span>
                <span>Pro: {stats.planCounts.pro || 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ABAS DO PAINEL MASTER */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'companies'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Building2 size={18} />
            Empresas & Setup de Usuários ({organizations.length})
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <ChartLineUp size={18} />
            Indicadores Globais do SaaS
          </button>
        </div>

        {/* ABAS CONTEÚDO */}
        {activeTab === 'companies' ? (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Inquilinos & Empresas Cadastradas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gerencie permissões, limites de usuários, planos e acione o setup inicial de convites para a liderança.
                </p>
              </div>

              <button
                onClick={() => setIsCreateOrgOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Plus size={18} weight="bold" />
                Criar Nova Empresa
              </button>
            </div>

            {/* TABELA DE EMPRESAS */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 uppercase font-black tracking-wider border-b border-white/10 text-[10px]">
                      <th className="p-4">Empresa</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Plano</th>
                      <th className="p-4">Limites</th>
                      <th className="p-4 text-right">Ações Principais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {organizations.map(org => {
                      const isSandbox = org.id === 'sandbox-test';
                      const activeUsersCount = users.filter(u => u.organizationId === org.id).length;
                      const activeTeamsCount = teams.filter(t => t.organizationId === org.id).length;

                      return (
                        <tr key={org.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <strong className="text-white text-sm font-bold block">{org.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono block">ID: {org.id}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                              org.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {org.status === 'active' ? 'Ativa' : 'Pendente / Suspensa'}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-slate-200 uppercase text-[11px]">
                              {org.plan}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <span className="text-slate-300 block">Usuários: <strong>{activeUsersCount}</strong> / {org.maxUsers || 5}</span>
                              <span className="text-slate-400 block">Times: <strong>{activeTeamsCount}</strong> / {org.maxTeams || 1}</span>
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* BOTÃO SETUP DE USUÁRIOS E CONVITES */}
                              <button
                                onClick={() => handleOpenUserSetup(org)}
                                disabled={org.status !== 'active'}
                                className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                                title="Gerar e Enviar Convites de Usuários para a Empresa"
                              >
                                <UserCheck size={14} />
                                Setup Usuários
                              </button>

                              <button
                                onClick={() => openEditModal(org)}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                                title="Editar Limites e CRM da Empresa"
                              >
                                <Settings size={14} />
                              </button>

                              {!isSandbox && (
                                <button
                                  onClick={() => handleToggleStatus(org)}
                                  className={`p-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                    org.status === 'active'
                                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                  }`}
                                  title={org.status === 'active' ? 'Suspender Empresa' : 'Ativar Empresa'}
                                >
                                  <Power size={14} />
                                </button>
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
          </section>
        ) : (
          <section className="p-8 rounded-3xl border border-white/10 bg-slate-900/40 space-y-6">
            <h2 className="text-lg font-black text-white">Resumo Executivo do SaaS</h2>
            <p className="text-xs text-slate-400">
              Métricas detalhadas do uso da plataforma Tracker.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400 font-bold uppercase block">Empresas no Banco</span>
                <span className="text-2xl font-black text-sky-400">{organizations.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400 font-bold uppercase block">Usuários Cadastrados</span>
                <span className="text-2xl font-black text-purple-400">{users.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400 font-bold uppercase block">Equipes Formadas</span>
                <span className="text-2xl font-black text-emerald-400">{teams.length}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODAL DE SETUP DE USUÁRIOS E CONVITES DA EMPRESA */}
      {setupOrg && (
        <CompanyUserSetupModal
          isOpen={isSetupModalOpen}
          onClose={() => {
            setIsSetupModalOpen(false);
            setSetupOrg(null);
          }}
          orgId={setupOrg.id}
          orgName={setupOrg.name}
          maxUsers={setupOrg.maxUsers}
          showToast={showToast}
        />
      )}

      {/* MODAL DE TESTE DE E-MAIL DO RESEND */}
      <EmailTesterModal
        isOpen={isEmailTesterOpen}
        onClose={() => setIsEmailTesterOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};
