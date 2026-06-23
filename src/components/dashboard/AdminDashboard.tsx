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
  Sparkle
} from '@phosphor-icons/react';
import { useDesignMode } from '../../hooks/useDesignMode';
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

import { ToastType } from '../ui/Toast';

interface AdminDashboardProps {
  profile: UserProfile;
  onLogoutSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
  onStartSimulation: (role: 'manager' | 'supervisor' | 'member' | 'monitor') => void;
}

export const AdminDashboard = ({ profile, onLogoutSuccess, showToast, onStartSimulation }: AdminDashboardProps) => {
  const [designMode, setDesignMode] = useDesignMode();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deletingProgress, setDeletingProgress] = useState('');
  const [isProvisioningSandbox, setIsProvisioningSandbox] = useState(false);
  
  // Modais de edição
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editPlan, setEditPlan] = useState<Organization['plan']>('free');
  const [editStatus, setEditStatus] = useState<Organization['status']>('active');
  const [editMaxUsers, setEditMaxUsers] = useState(5);
  const [editMaxTeams, setEditMaxTeams] = useState(1);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal de criação de organização
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCnpj, setNewOrgCnpj] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<Organization['plan']>('free');
  const [newOrgMaxUsers, setNewOrgMaxUsers] = useState(5);
  const [newOrgMaxTeams, setNewOrgMaxTeams] = useState(1);

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

  const handleSimulateRole = async (role: 'manager' | 'supervisor' | 'member' | 'monitor', forceProvision = false) => {
    setIsProvisioningSandbox(true);
    try {
      const sandboxOrgId = 'sandbox-test';
      const orgRef = doc(db, 'organizations', sandboxOrgId);
      const orgSnap = await getDoc(orgRef);

      if (!orgSnap.exists() || forceProvision) {
        showToast(forceProvision ? 'Reiniciando ambiente Sandbox...' : 'Provisionando ambiente Sandbox fictício...', 'info');
        
        // 1. Criar organização sandbox-test
        await setDoc(orgRef, {
          id: sandboxOrgId,
          name: 'Empresa de Teste (Sandbox)',
          status: 'active',
          plan: 'enterprise',
          maxUsers: 100,
          maxTeams: 20,
          createdAt: new Date().toISOString()
        });

        // 2. Criar duas equipes fictícias
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

        // 3. Criar perfis de usuários simulados
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

        // 3.1. Criar perfil de monitor simulado para o QA
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

        // 4. Criar acordos fictícios iniciais para gráficos/tabelas funcionarem de imediato
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
          },
          {
            id: 'sandbox-agree-3',
            clientName: 'Antônio Oliveira (Fictício)',
            clientCpf: '45678912322',
            value: 3000,
            status: 'quebrado',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            createdBy: 'sandbox-user-operator',
            teamId: 'sandbox-team-beta',
            organizationId: sandboxOrgId
          }
        ];

        for (const arg of agreements) {
          await setDoc(doc(db, 'agreements', arg.id), arg);
        }

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
        planExpiresAt: editExpiresAt || undefined
      };
      await updateDoc(orgRef, updateData);
      
      await logAudit('ACCEPT_TERMS', { 
        action: 'UPDATE_ORG_PLAN', 
        targetOrgId: selectedOrg.id,
        plan: editPlan,
        status: editStatus
      }, profile.displayName);

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
        status: 'active',
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
      }, profile.displayName);

      showToast('Empresa criada com sucesso!', 'success');
      
      // Reset form & close
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
    if (!window.confirm(`ATENÇÃO MASTER: Você está prestes a excluir permanentemente a empresa "${orgName}".\n\nIsso apagará TODOS os acordos, equipes, usuários, configurações, conciliações e logs de auditoria vinculados a este tenant.\n\nEsta ação é irreversível. Deseja continuar?`)) {
      return;
    }
    
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

      // 1. Apagar acordos (agreements)
      await deleteInBatches('agreements', 'Apagando acordos da empresa...');

      // 2. Apagar times (teams)
      await deleteInBatches('teams', 'Apagando equipes...');

      // 3. Apagar conciliações (reconciliations)
      await deleteInBatches('reconciliations', 'Apagando conciliações...');

      // 4. Apagar configurações (settings)
      await deleteInBatches('settings', 'Apagando configurações...');

      // 5. Apagar logs de auditoria (audit_logs)
      await deleteInBatches('audit_logs', 'Apagando logs de auditoria...');

      // 6. Apagar perfis de usuários
      await deleteInBatches('users', 'Apagando perfis de usuários...');

      // 7. Apagar a organização
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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans pb-20 bg-slate-950 text-slate-100">
      <header className="glass-card sticky top-0 z-30 px-6 py-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1.5">
              <img 
                src="/logo.png" 
                alt="Tracker Logo" 
                className="w-14 h-14 drop-shadow-md object-contain" 
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">Painel SaaS Master</h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Administrador: {profile.displayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Alternador de Layout Clássico vs Premium no Admin */}
            <button
              onClick={() => setDesignMode(designMode === 'classic' ? 'premium' : 'classic')}
              className={`p-2 rounded-xl transition-all border flex items-center justify-center ${
                designMode === 'premium'
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border-amber-500/20 shadow-lg shadow-amber-500/5'
                  : 'text-slate-500 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              title={designMode === 'premium' ? "Mudar para Modo Clássico" : "Mudar para Modo Premium"}
            >
              {designMode === 'premium' ? <Sparkle size={16} weight="duotone" /> : <Palette size={16} weight="duotone" />}
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/30 transition-all active:scale-95"
            >
              <LogOut size={14} />
              Sair do Painel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Indicadores Globais */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/20 relative overflow-hidden flex items-center gap-4">
            <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl">
              <Building2 size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Total de Empresas</span>
              <span className="text-3xl font-black text-white">{stats.totalOrgs}</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/20 relative overflow-hidden flex items-center gap-4">
            <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl">
              <Activity size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Empresas Ativas</span>
              <span className="text-3xl font-black text-white">{stats.activeOrgs}</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/20 relative overflow-hidden flex items-center gap-4">
            <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Total de Usuários</span>
              <span className="text-3xl font-black text-white">{stats.totalUsers}</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/20 relative overflow-hidden flex items-center gap-4">
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl">
              <Layers size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">Planos Ativos</span>
              <div className="text-[10px] text-slate-300 font-medium flex gap-2 flex-wrap mt-0.5">
                <span>Free: {stats.planCounts.free || 0}</span>
                <span>Starter: {stats.planCounts.starter || 0}</span>
                <span>Pro: {stats.planCounts.pro || 0}</span>
                <span>Ent.: {stats.planCounts.enterprise || 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ambiente de Teste Sandbox */}
        <section className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck2 className="text-purple-400 animate-pulse" size={20} />
                Ambiente de Teste Sandbox
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Simule cargos (Gerente, Supervisor, Operador) na empresa fictícia isolada de testes (`sandbox-test`). Os dados simulados não afetam as estatísticas master.
              </p>
              {hasSandbox && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md mt-2">
                  <Check size={10} strokeWidth={3} /> Sandbox Inicializado no Firestore
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
              {hasSandbox ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSimulateRole('manager', false)}
                      disabled={isProvisioningSandbox}
                      className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold hover:bg-purple-500/20 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      title="Entrar como Gerente (Modo Simulação)"
                    >
                      Entrar como Gerente
                    </button>
                    <button
                      onClick={() => handleSimulateRole('supervisor', false)}
                      disabled={isProvisioningSandbox}
                      className="px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold hover:bg-indigo-500/20 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      title="Entrar como Supervisor (Modo Simulação)"
                    >
                      Entrar como Supervisor
                    </button>
                    <button
                      onClick={() => handleSimulateRole('member', false)}
                      disabled={isProvisioningSandbox}
                      className="px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold hover:bg-sky-500/20 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      title="Entrar como Operador (Modo Simulação)"
                    >
                      Entrar como Operador
                    </button>
                    <button
                      onClick={() => handleSimulateRole('monitor', false)}
                      disabled={isProvisioningSandbox}
                      className="px-4 py-2.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 font-bold hover:bg-fuchsia-500/20 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      title="Entrar como Monitor (Modo Simulação)"
                    >
                      Entrar como Monitor
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Isso apagará e recriará todos os dados (acordos, equipes, usuários) da empresa fictícia sandbox-test. Deseja continuar?")) {
                        handleSimulateRole('manager', true);
                      }
                    }}
                    disabled={isProvisioningSandbox}
                    className="px-3 py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all text-xs uppercase font-bold active:scale-95 disabled:opacity-50"
                    title="Recriar Banco de Dados Fictício Sandbox"
                  >
                    Resetar Sandbox
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleSimulateRole('manager', true)}
                  disabled={isProvisioningSandbox}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95"
                >
                  {isProvisioningSandbox ? <Loader2 className="animate-spin" size={14} /> : <UserCheck size={14} />}
                  Inicializar Ambiente Sandbox
                </button>
              )}
            </div>
          </div>
        </section>


        {/* Lista de Empresas */}
        <section className="glass-card rounded-3xl border border-white/5 bg-slate-900/10 overflow-hidden shadow-xl">
          <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Organizações / Clientes Contratantes</h2>
              <p className="text-xs text-slate-400 mt-1">Gerencie licenças de cargos, expiração de planos e exclusão de dados.</p>
            </div>
            <button 
              onClick={() => setIsCreateOrgOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-teal-500 transition-colors shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <Plus size={14} />
              Nova Organização
            </button>
          </div>

          {organizations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                    <th className="px-8 py-4">Nome da Empresa / CNPJ</th>
                    <th className="px-6 py-4">Plano</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Usuários Limite</th>
                    <th className="px-6 py-4">Equipes Limite</th>
                    <th className="px-6 py-4">Convite Gerente</th>
                    <th className="px-6 py-4">Expiração</th>
                    <th className="px-8 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {organizations.filter(org => org.id !== 'sandbox-test').map((org) => (
                    <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-semibold text-slate-100">{org.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{org.cnpj || 'Sem CNPJ informado'}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          org.plan === 'enterprise' ? 'bg-purple-500 text-white' :
                          org.plan === 'pro' ? 'bg-sky-500 text-white' :
                          org.plan === 'starter' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                          org.status === 'active' ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            org.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                          }`} />
                          {org.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-300">
                        {users.filter(u => u.organizationId === org.id).length} / {org.maxUsers || 5}
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-300">
                        {teams.filter(t => t.organizationId === org.id).length} / {org.maxTeams || 1}
                      </td>
                      <td className="px-6 py-5 font-mono text-xs">
                        {org.managerInviteToken ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{org.managerInviteToken}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(org.managerInviteToken || '');
                                showToast('Token copiado!', 'success');
                              }}
                              className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white"
                              title="Copiar Código de Convite de Gerente"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                const token = await regenerateManagerInviteToken(org.id);
                                showToast('Novo token gerado: ' + token, 'success');
                              } catch (e) {
                                showToast('Erro ao gerar token', 'error');
                              }
                            }}
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <RefreshCw size={10} />
                            Gerar Código
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-slate-400">
                        {org.planExpiresAt ? new Date(org.planExpiresAt).toLocaleDateString('pt-BR') : 'Sem expiração'}
                      </td>
                      <td className="px-8 py-5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(org)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
                          title="Editar limites da empresa"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(org)}
                          className={`p-2 rounded-xl transition-all ${
                            org.status === 'active' 
                              ? 'hover:bg-rose-500/10 text-rose-400 hover:text-rose-300' 
                              : 'hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300'
                          }`}
                          title={org.status === 'active' ? 'Bloquear Empresa' : 'Liberar Empresa'}
                        >
                          {org.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteOrganization(org.id, org.name)}
                          disabled={isDeleting !== null}
                          className="p-2 hover:bg-rose-500/10 rounded-xl transition-all text-rose-500 hover:text-rose-400 disabled:opacity-30"
                          title="Excluir Empresa (Exclusão Total)"
                        >
                          {isDeleting === org.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 italic">
              Nenhuma organização cadastrada.
            </div>
          )}
        </section>
      </main>

      {/* Modal de Progresso de Exclusão */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm text-center space-y-6 shadow-2xl"
            >
              <Loader2 className="animate-spin text-rose-500 mx-auto" size={36} />
              <div className="space-y-1">
                <h4 className="text-white font-bold text-base">Realizando Exclusão Total</h4>
                <p className="text-slate-400 text-xs font-mono">{deletingProgress}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Configuração de Plano / Limites */}
      <AnimatePresence>
        {selectedOrg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrg(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Plano & Limites</h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">{selectedOrg.name}</span>
                </div>
                <button 
                  onClick={() => setSelectedOrg(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plano SaaS</label>
                  <select 
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as Organization['plan'])}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none appearance-none select-custom-arrow"
                  >
                    <option value="free">Plano Free</option>
                    <option value="starter">Plano Starter</option>
                    <option value="pro">Plano Pro</option>
                    <option value="enterprise">Plano Enterprise</option>
                    <option value="custom">Plano Customizado</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Limite Usuários</label>
                    <input 
                      type="number"
                      min={1}
                      value={editMaxUsers}
                      onChange={(e) => setEditMaxUsers(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Limite Equipes</label>
                    <input 
                      type="number"
                      min={1}
                      value={editMaxTeams}
                      onChange={(e) => setEditMaxTeams(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Expiração do Plano</label>
                  <input 
                    type="date"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none color-scheme-dark"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Organization['status'])}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-white outline-none appearance-none select-custom-arrow"
                  >
                    <option value="active">Empresa Ativa</option>
                    <option value="inactive">Empresa Suspensa/Inativa</option>
                  </select>
                </div>
              </div>

              <div className="p-8 pt-4 border-t border-white/5 bg-white/5 backdrop-blur-xl flex gap-4 shrink-0">
                <button 
                  onClick={() => setSelectedOrg(null)}
                  className="flex-1 px-5 py-4 rounded-xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveLimits}
                  disabled={isSaving}
                  className="flex-1 px-5 py-4 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Salvar Ajustes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Criação de Organização */}
      <AnimatePresence>
        {isCreateOrgOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOrgOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <form onSubmit={handleCreateOrganization} className="flex flex-col h-full">
                <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-white">Nova Organização</h3>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Cadastrar Empresa & Gerar Códigos</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsCreateOrgOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome da Empresa</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Noverde Soluções"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">CNPJ (Opcional)</label>
                    <input 
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={newOrgCnpj}
                      onChange={(e) => setNewOrgCnpj(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plano SaaS</label>
                    <select 
                      value={newOrgPlan}
                      onChange={(e) => handlePlanChange(e.target.value as Organization['plan'])}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white outline-none appearance-none select-custom-arrow"
                    >
                      <option value="free">Plano Free</option>
                      <option value="starter">Plano Starter</option>
                      <option value="pro">Plano Pro</option>
                      <option value="enterprise">Plano Enterprise</option>
                      <option value="custom">Plano Customizado</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Limite Usuários</label>
                      <input 
                        type="number"
                        min={1}
                        value={newOrgMaxUsers}
                        onChange={(e) => setNewOrgMaxUsers(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Limite Equipes</label>
                      <input 
                        type="number"
                        min={1}
                        value={newOrgMaxTeams}
                        onChange={(e) => setNewOrgMaxTeams(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 pt-4 border-t border-white/5 bg-white/5 backdrop-blur-xl flex gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsCreateOrgOpen(false)}
                    className="flex-1 px-5 py-4 rounded-xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-400 hover:to-teal-500 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    Criar Empresa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
