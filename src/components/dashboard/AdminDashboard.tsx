import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Layers, 
  ShieldAlert, 
  LogOut, 
  UserCheck, 
  Globe, 
  Clock, 
  Settings, 
  Trash2, 
  UserMinus, 
  Power, 
  PowerOff, 
  Check, 
  X, 
  Loader2, 
  CalendarDays,
  Activity,
  UserCheck2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
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
import { Organization, UserProfile } from '../../types';
import { logAudit } from '../../lib/audit';

interface AdminDashboardProps {
  profile: UserProfile;
  onLogoutSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

export const AdminDashboard = ({ profile, onLogoutSuccess, showToast }: AdminDashboardProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deletingProgress, setDeletingProgress] = useState('');
  
  // Modais de edição
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editPlan, setEditPlan] = useState<Organization['plan']>('free');
  const [editStatus, setEditStatus] = useState<Organization['status']>('active');
  const [editMaxUsers, setEditMaxUsers] = useState(5);
  const [editMaxTeams, setEditMaxTeams] = useState(1);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

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
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      showToast('Erro ao carregar usuários.', 'error');
    });

    return () => {
      unsubscribeOrgs();
      unsubscribeUsers();
    };
  }, []);

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
    if (!window.confirm(`ATENÇÃO MASTER: Você está prestes a excluir permanentemente a empresa "${orgName}".\n\nIsso apagará TODOS os acordos, equipes, usuários e logs vinculados a este tenant.\n\nEsta ação é irreversível. Deseja continuar?`)) {
      return;
    }
    
    setIsDeleting(orgId);
    try {
      const batchLimit = 500;
      
      // 1. Apagar acordos (agreements)
      setDeletingProgress('Apagando acordos da empresa...');
      const agreementsRef = collection(db, 'agreements');
      const qAgreements = query(agreementsRef, where('organizationId', '==', orgId));
      const agreementsSnap = await getDocs(qAgreements);
      if (!agreementsSnap.empty) {
        const batch = writeBatch(db);
        agreementsSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // 2. Apagar times (teams)
      setDeletingProgress('Apagando equipes...');
      const teamsRef = collection(db, 'teams');
      const qTeams = query(teamsRef, where('organizationId', '==', orgId));
      const teamsSnap = await getDocs(qTeams);
      if (!teamsSnap.empty) {
        const batch = writeBatch(db);
        teamsSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // 3. Apagar conciliações (reconciliations)
      setDeletingProgress('Apagando conciliações...');
      const reconRef = collection(db, 'reconciliations');
      const qRecon = query(reconRef, where('organizationId', '==', orgId));
      const reconSnap = await getDocs(qRecon);
      if (!reconSnap.empty) {
        const batch = writeBatch(db);
        reconSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // 4. Desvincular / Apagar perfis de usuários
      setDeletingProgress('Apagando perfis de usuários...');
      const usersRef = collection(db, 'users');
      const qUsers = query(usersRef, where('organizationId', '==', orgId));
      const usersSnap = await getDocs(qUsers);
      if (!usersSnap.empty) {
        const batch = writeBatch(db);
        usersSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // 5. Apagar a organização
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

  const handleMigrateLegacyData = async () => {
    if (!window.confirm("Deseja realmente iniciar a migração dos dados legados? Isso adicionará a organização 'rnv-gestao' em todos os documentos sem tenant definido. Recomendamos fazer um backup das coleções antes.")) {
      return;
    }
    
    setIsMigrating(true);
    setMigrationLog([]);
    const log = (msg: string) => setMigrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    
    try {
      // 1. Criar organização padrão se não existir
      log("Verificando organização padrão 'rnv-gestao'...");
      const defaultOrgId = 'rnv-gestao';
      const orgRef = doc(db, 'organizations', defaultOrgId);
      const orgSnap = await getDoc(orgRef);
      
      if (!orgSnap.exists()) {
        log("Criando organização padrão 'rnv-gestao'...");
        await setDoc(orgRef, {
          id: defaultOrgId,
          name: 'RNV Gestão',
          status: 'active',
          plan: 'pro',
          maxUsers: 100,
          maxTeams: 20,
          createdAt: new Date().toISOString()
        });
        log("Organização padrão criada com sucesso.");
      } else {
        log("Organização padrão 'rnv-gestao' já existe.");
      }

      // 2. Migrar usuários
      log("Buscando usuários sem organização...");
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      let usersMigrated = 0;
      const userBatch = writeBatch(db);
      
      usersSnap.docs.forEach(d => {
        const data = d.data();
        if (data.role !== 'super_admin' && !data.organizationId) {
          userBatch.update(d.ref, { organizationId: defaultOrgId });
          usersMigrated++;
        }
      });
      if (usersMigrated > 0) {
        await userBatch.commit();
        log(`Migrados ${usersMigrated} usuários.`);
      } else {
        log("Nenhum usuário pendente de migração.");
      }

      // 3. Migrar equipes (teams)
      log("Buscando equipes sem organização...");
      const teamsRef = collection(db, 'teams');
      const teamsSnap = await getDocs(teamsRef);
      let teamsMigrated = 0;
      const teamBatch = writeBatch(db);
      
      teamsSnap.docs.forEach(d => {
        const data = d.data();
        if (!data.organizationId) {
          teamBatch.update(d.ref, { organizationId: defaultOrgId });
          teamsMigrated++;
        }
      });
      if (teamsMigrated > 0) {
        await teamBatch.commit();
        log(`Migradas ${teamsMigrated} equipes.`);
      } else {
        log("Nenhuma equipe pendente de migração.");
      }

      // 4. Migrar acordos (agreements)
      log("Buscando acordos sem organização...");
      const agreementsRef = collection(db, 'agreements');
      const agreementsSnap = await getDocs(agreementsRef);
      let agreementsMigrated = 0;
      
      // Acordos podem passar de 500 itens, vamos fazer batches divididos
      let batch = writeBatch(db);
      let count = 0;
      for (const d of agreementsSnap.docs) {
        const data = d.data();
        if (!data.organizationId) {
          batch.update(d.ref, { organizationId: defaultOrgId });
          agreementsMigrated++;
          count++;
          if (count === 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      log(`Migrados ${agreementsMigrated} acordos.`);

      // 5. Migrar conciliações (reconciliations)
      log("Buscando conciliações sem organização...");
      const reconciliationsRef = collection(db, 'reconciliations');
      const reconciliationsSnap = await getDocs(reconciliationsRef);
      let reconciliationsMigrated = 0;
      const reconBatch = writeBatch(db);
      
      reconciliationsSnap.docs.forEach(d => {
        const data = d.data();
        if (!data.organizationId) {
          reconBatch.update(d.ref, { organizationId: defaultOrgId });
          reconciliationsMigrated++;
        }
      });
      if (reconciliationsMigrated > 0) {
        await reconBatch.commit();
        log(`Migradas ${reconciliationsMigrated} conciliações.`);
      } else {
        log("Nenhuma conciliação pendente de migração.");
      }

      // 6. Migrar configurações (settings)
      log("Buscando configurações sem organização...");
      const settingsRef = collection(db, 'settings');
      const settingsSnap = await getDocs(settingsRef);
      let settingsMigrated = 0;
      const settingsBatch = writeBatch(db);
      
      settingsSnap.docs.forEach(d => {
        const data = d.data();
        if (!data.organizationId) {
          settingsBatch.update(d.ref, { organizationId: defaultOrgId });
          settingsMigrated++;
        }
      });
      if (settingsMigrated > 0) {
        await settingsBatch.commit();
        log(`Migradas ${settingsMigrated} configurações.`);
      } else {
        log("Nenhuma configuração pendente de migração.");
      }

      log("🎉 MIGRACAO CONCLUÍDA COM SUCESSO!");
      showToast("Dados legados migrados para 'rnv-gestao'!", "success");
    } catch (e: any) {
      log(`Erro na migração: ${e.message}`);
      showToast("Ocorreu um erro na migração.", "error");
    } finally {
      setIsMigrating(false);
    }
  };

  const stats = useMemo(() => {
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter(o => o.status === 'active').length;
    const totalUsers = users.length;
    const planCounts = organizations.reduce((acc, curr) => {
      acc[curr.plan] = (acc[curr.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalOrgs, activeOrgs, totalUsers, planCounts };
  }, [organizations, users]);

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
            <div className="p-2.5 bg-gradient-to-tr from-sky-500/20 to-sky-400/10 rounded-2xl border border-sky-500/30">
              <ShieldAlert className="text-sky-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">Painel SaaS Master</h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Administrador: {profile.displayName}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/30 transition-all active:scale-95"
          >
            <LogOut size={14} />
            Sair do Painel
          </button>
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

        {/* Ferramentas de Suporte */}
        <section className="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/10 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Ferramentas de Suporte e Migração</h2>
              <p className="text-xs text-slate-400 mt-0.5">Use para migrar dados de bancos legados para a organização padrão 'rnv-gestao'.</p>
            </div>
            <button 
              onClick={handleMigrateLegacyData}
              disabled={isMigrating}
              className="px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 active:scale-95 disabled:opacity-50 flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              {isMigrating ? <Loader2 className="animate-spin" size={14} /> : <Activity size={14} />}
              Migrar Dados Legados (SaaS)
            </button>
          </div>
          
          {migrationLog.length > 0 && (
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl max-h-48 overflow-y-auto font-mono text-xs text-amber-400/90 space-y-1">
              {migrationLog.map((logLine, idx) => (
                <div key={idx}>{logLine}</div>
              ))}
            </div>
          )}
        </section>

        {/* Lista de Empresas */}
        <section className="glass-card rounded-3xl border border-white/5 bg-slate-900/10 overflow-hidden shadow-xl">
          <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Organizações / Clientes Contratantes</h2>
              <p className="text-xs text-slate-400 mt-1">Gerencie licenças de cargos, expiração de planos e exclusão de dados.</p>
            </div>
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
                    <th className="px-6 py-4">Times Limite</th>
                    <th className="px-6 py-4">Expiração</th>
                    <th className="px-8 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {organizations.map((org) => (
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
                        {org.maxTeams || 1}
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
    </div>
  );
};
