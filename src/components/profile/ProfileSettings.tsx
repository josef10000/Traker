import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Briefcase, 
  FloppyDisk as Save, 
  Plus, 
  ArrowLeft, 
  Trash as Trash2, 
  Users, 
  Palette, 
  Check, 
  X,
  ShieldCheck,
  Copy,
  PaperPlaneTilt,
  UserPlus,
  Globe,
  Target
} from '@phosphor-icons/react';
import { doc, updateDoc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Team, Organization, Invite, UserRole } from '../../types';
import { 
  getTeamData, 
  deleteTeam, 
  getTeamMembers, 
  removeTeamMember, 
  regenerateSupervisorInviteToken, 
  regenerateCoordinatorInviteToken, 
  regenerateMonitorInviteToken,
  createInvitesInBulk,
  getPendingInvites,
  revokeInvite
} from '../../lib/teams';
import { ToastType } from '../ui/Toast';
import { sandboxService } from '../../lib/sandboxService';


interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: (updatedData?: any) => void;
  onCreateTeam: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export function ProfileSettings({ isOpen, onClose, profile, onUpdate, onCreateTeam, showToast }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle || '');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'teams' | 'invites' | 'sandbox' | 'goals'>('profile');

  const [managedTeamsData, setManagedTeamsData] = useState<Team[]>([]);

  // Estados para configurar metas
  const [selectedGoalTeamId, setSelectedGoalTeamId] = useState<string>('');
  const [monthlyGoalInput, setMonthlyGoalInput] = useState<number>(0);
  const [effectivenessGoalInput, setEffectivenessGoalInput] = useState<number>(0);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.displayName || '');
      setJobTitle(profile.jobTitle || '');
      setActiveTab('profile');
      setSelectedTeamForMembers(null);
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (managedTeamsData.length > 0 && !selectedGoalTeamId) {
      const firstTeam = managedTeamsData[0];
      setSelectedGoalTeamId(firstTeam.id);
      setMonthlyGoalInput(firstTeam.monthlyGoal || 0);
      setEffectivenessGoalInput(firstTeam.effectivenessGoal || 85);
    }
  }, [managedTeamsData, selectedGoalTeamId]);

  const handleGoalTeamChange = (teamId: string) => {
    setSelectedGoalTeamId(teamId);
    const team = managedTeamsData.find(t => t.id === teamId);
    if (team) {
      setMonthlyGoalInput(team.monthlyGoal || 0);
      setEffectivenessGoalInput(team.effectivenessGoal || 85);
    }
  };

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalTeamId) return;

    setIsSavingGoals(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.setTeamGoal(selectedGoalTeamId, monthlyGoalInput, effectivenessGoalInput);
        setManagedTeamsData(prev => prev.map(t => {
          if (t.id === selectedGoalTeamId) {
            return {
              ...t,
              monthlyGoal: monthlyGoalInput,
              effectivenessGoal: effectivenessGoalInput
            };
          }
          return t;
        }));
        showToast('Metas do Sandbox atualizadas na memória!', 'success');
      } else {
        await setDoc(doc(db, 'settings', selectedGoalTeamId), { 
          monthlyGoal: monthlyGoalInput,
          effectivenessGoal: effectivenessGoalInput,
          organizationId: profile.organizationId,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await updateDoc(doc(db, 'teams', selectedGoalTeamId), {
          monthlyGoal: monthlyGoalInput,
          effectivenessGoal: effectivenessGoalInput
        });

        setManagedTeamsData(prev => prev.map(t => {
          if (t.id === selectedGoalTeamId) {
            return {
              ...t,
              monthlyGoal: monthlyGoalInput,
              effectivenessGoal: effectivenessGoalInput
            };
          }
          return t;
        }));
        showToast('Metas atualizadas com sucesso!', 'success');
      }
      onUpdate();
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar metas', 'error');
    } finally {
      setIsSavingGoals(false);
    }
  };

  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [supervisorInviteToken, setSupervisorInviteToken] = useState<string | null>(null);
  const [coordinatorInviteToken, setCoordinatorInviteToken] = useState<string | null>(null);
  const [monitorInviteToken, setMonitorInviteToken] = useState<string | null>(null);

  const [sandboxVersion, setSandboxVersion] = useState(0);

  // Estados de gerenciamento de convites
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteRows, setInviteRows] = useState<Array<{ email: string; role: UserRole; teamId: string }>>([
    { email: '', role: 'member', teamId: '' }
  ]);
  const [generatedInvites, setGeneratedInvites] = useState<Invite[] | null>(null);
  const [isGeneratingInvites, setIsGeneratingInvites] = useState(false);

  // Buscar convites pendentes
  const loadInvites = async () => {
    if (!profile.organizationId) return;
    setLoadingInvites(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const list = sandboxService.getPendingInvites(profile.organizationId);
        setPendingInvites(list);
      } else {
        const list = await getPendingInvites(profile.organizationId);
        setPendingInvites(list);
      }
    } catch (e) {
      console.error('Erro ao carregar convites:', e);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [profile.organizationId, sandboxVersion]);


  useEffect(() => {
    if (profile.organizationId === 'sandbox-test') {
      const unsubscribe = sandboxService.subscribe(() => {
        setSandboxVersion(prev => prev + 1);
      });
      return () => unsubscribe();
    }
  }, [profile.organizationId]);

  useEffect(() => {
    const loadOrg = async () => {
      if (profile.organizationId === 'sandbox-test') {
        setOrgData({
          id: 'sandbox-test',
          name: 'Empresa Sandbox',
          createdAt: new Date().toISOString(),
          agreementLimit: 999999,
          supervisorInviteToken: 'sandbox-token-123',
          coordinatorInviteToken: 'sandbox-coord-123',
          monitorInviteToken: 'sandbox-mon-123'
        } as any);
        setSupervisorInviteToken('sandbox-token-123');
        setCoordinatorInviteToken('sandbox-coord-123');
        setMonitorInviteToken('sandbox-mon-123');
        return;
      }

      if (profile.organizationId) {
        try {
          const orgSnap = await getDoc(doc(db, 'organizations', profile.organizationId));
          if (orgSnap.exists()) {
            const org = orgSnap.data() as Organization;
            setOrgData(org);
            setSupervisorInviteToken(org.supervisorInviteToken || null);
            setCoordinatorInviteToken(org.coordinatorInviteToken || null);
            setMonitorInviteToken(org.monitorInviteToken || null);
          }
        } catch (error) {
          console.error('Erro ao carregar organização:', error);
        }
      }
    };
    loadOrg();
  }, [profile.organizationId]);

  useEffect(() => {
    const loadTeams = async () => {
      if (profile.organizationId === 'sandbox-test') {
        let teams: Team[] = [];
        if (profile.role === 'manager' || profile.role === 'coordinator') {
          teams = sandboxService.getTeams(profile.organizationId);
        } else if (profile.managedTeams && profile.managedTeams.length > 0) {
          teams = profile.managedTeams
            .map(id => sandboxService.getTeam(id))
            .filter((t): t is Team => t !== null);
        } else if (profile.role === 'supervisor') {
          teams = sandboxService.getTeams(profile.organizationId).filter(t => t.supervisorId === profile.uid);
        }
        setManagedTeamsData(teams);
        return;
      }

      if ((profile.role === 'manager' || profile.role === 'coordinator') && profile.organizationId) {
        try {
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('organizationId', '==', profile.organizationId));
          const querySnapshot = await getDocs(q);
          const teams = querySnapshot.docs.map(doc => doc.data() as Team);
          setManagedTeamsData(teams);
        } catch (error) {
          console.error('Erro ao carregar equipes da empresa:', error);
        }
      } else if (profile.managedTeams && profile.managedTeams.length > 0) {
        const teams = await Promise.all(
          profile.managedTeams.map(id => getTeamData(id))
        );
        setManagedTeamsData(teams.filter((t): t is Team => t !== null));
      } else if (profile.role === 'supervisor') {
        try {
          const teamsRef = collection(db, 'teams');
          const q = query(teamsRef, where('supervisorId', '==', profile.uid));
          const querySnapshot = await getDocs(q);
          const teams = querySnapshot.docs.map(doc => doc.data() as Team);
          setManagedTeamsData(teams);
        } catch (error) {
          console.error('Erro ao carregar equipes do supervisor:', error);
        }
      }
    };
    loadTeams();
  }, [profile.managedTeams, profile.role, profile.organizationId, profile.uid, sandboxVersion]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.setProfile({
          ...profile,
          displayName,
          jobTitle
        });
        showToast('Perfil simulado atualizado com sucesso!', 'success');
        onUpdate({
          displayName,
          jobTitle
        });
        return;
      }

      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName,
        jobTitle
      });
      showToast('Perfil atualizado com sucesso!', 'success');
      onUpdate({
        displayName,
        jobTitle
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showToast('Erro ao salvar as alterações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (confirm(`Tem certeza que deseja excluir a equipe "${teamName}"? Esta ação não pode ser desfeita.`)) {
      try {
        if (profile.organizationId === 'sandbox-test') {
          // No Sandbox, apenas deletar em memória
          sandboxService.deleteTeam(teamId);
          setManagedTeamsData(prev => prev.filter(t => t.id !== teamId));
          showToast('Equipe excluída do Sandbox com sucesso!', 'success');
          onUpdate({});
          return;
        }
        await deleteTeam(profile.uid, teamId);
        setManagedTeamsData(prev => prev.filter(t => t.id !== teamId));
        showToast('Equipe excluída com sucesso!', 'success');
        onUpdate({});
      } catch (error) {
        showToast('Erro ao excluir equipe.', 'error');
      }
    }
  };

  // --- AÇÕES DO FORMULÁRIO DINÂMICO DE CONVITES ---

  const handleAddInviteRow = () => {
    setInviteRows(prev => [...prev, { email: '', role: 'member', teamId: '' }]);
  };

  const handleRemoveInviteRow = (index: number) => {
    if (inviteRows.length === 1) return;
    setInviteRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleInviteRowChange = (index: number, field: 'email' | 'role' | 'teamId', value: string) => {
    setInviteRows(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const updatedRow = { ...row, [field]: value };
      
      // Se mudar a role para um cargo que não tem equipe (manager, coordinator, monitor), limpa o time
      if (field === 'role' && !['member', 'supervisor', 'backoffice'].includes(value)) {
        updatedRow.teamId = '';
      }
      return updatedRow;
    }));
  };

  const handleGenerateInvites = async () => {
    if (!profile.organizationId) return;

    const invalidRows = inviteRows.filter(row => !row.email.trim() || !row.email.includes('@'));
    if (invalidRows.length > 0) {
      showToast('Por favor, preencha todos os e-mails corretamente.', 'error');
      return;
    }

    setIsGeneratingInvites(true);
    try {
      const invitesPayload = inviteRows.map(row => ({
        email: row.email.trim().toLowerCase(),
        role: row.role,
        teamId: row.teamId || null
      }));

      let list: Invite[] = [];
      if (profile.organizationId === 'sandbox-test') {
        list = sandboxService.createInvitesInBulk(
          invitesPayload,
          profile.organizationId,
          profile.uid
        );
        showToast('Convites simulados criados no Sandbox!', 'success');
      } else {
        list = await createInvitesInBulk(
          invitesPayload,
          profile.organizationId,
          profile.uid
        );
        showToast('Convites gerados com sucesso!', 'success');
      }

      setGeneratedInvites(list);
      setInviteRows([{ email: '', role: 'member', teamId: '' }]);
      loadInvites();
      onUpdate({});
    } catch (e: any) {
      showToast(e.message || 'Erro ao gerar convites.', 'error');
    } finally {
      setIsGeneratingInvites(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (confirm('Deseja revogar e cancelar este convite? O link associado não funcionará mais.')) {
      try {
        if (profile.organizationId === 'sandbox-test') {
          sandboxService.revokeInvite(inviteId);
          showToast('Convite simulado revogado!', 'success');
        } else {
          await revokeInvite(inviteId);
          showToast('Convite revogado com sucesso!', 'success');
        }
        loadInvites();
        onUpdate({});
      } catch (e) {
        showToast('Erro ao revogar convite.', 'error');
      }
    }
  };

  const handleSimulateAccept = async (token: string, email: string) => {
    try {
      const simulatedUid = `sandbox-user-${Date.now()}`;
      sandboxService.acceptInvite(simulatedUid, token);
      showToast(`Simulação: ${email} aceitou o convite e se cadastrou!`, 'success');
      loadInvites();
      onUpdate({});
    } catch (e) {
      showToast('Erro ao simular aceitação.', 'error');
    }
  };

  const handleManageMembers = async (team: Team) => {
    setSelectedTeamForMembers(team);
    setLoadingMembers(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const members = sandboxService.getUsers(profile.organizationId).filter(u => u.teamId === team.id);
        setTeamMembers(members);
      } else {
        const members = await getTeamMembers(team.id);
        setTeamMembers(members);
      }
    } catch (error) {
      showToast('Erro ao carregar membros.', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (memberUid: string, memberName: string) => {
    if (confirm(`Remover ${memberName} desta equipe?`)) {
      try {
        if (profile.organizationId === 'sandbox-test') {
          const user = sandboxService.getUser(memberUid);
          if (user) {
            sandboxService.setProfile({ ...user, teamId: '' });
          }
          setTeamMembers(prev => prev.filter(m => m.uid !== memberUid));
          showToast('Membro removido no Sandbox com sucesso!', 'success');
          return;
        }
        await removeTeamMember(memberUid);
        setTeamMembers(prev => prev.filter(m => m.uid !== memberUid));
        showToast('Membro removido com sucesso!', 'success');
      } catch (error) {
        showToast('Erro ao remover membro.', 'error');
      }
    }
  };

  if (!isOpen) return null;

  const showAdminTabs = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'coordinator';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div 
        className="w-full max-w-5xl h-[85vh] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row bg-[#090d16] text-white relative"
        style={{ backgroundColor: '#090d16' }}
      >
        {/* Coluna da Esquerda (Menu de Abas) */}
        <div className="w-full md:w-64 border-r border-white/5 bg-slate-950/40 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
                {profile.displayName ? profile.displayName[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none truncate" title={profile.displayName}>
                  {profile.displayName}
                </h4>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1 block truncate">
                  {profile.role === 'member' ? 'Operador' : profile.role}
                </span>
              </div>
            </div>

            <nav className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-1 max-h-[45vh]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setSelectedTeamForMembers(null);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border border-transparent ${
                  activeTab === 'profile'
                    ? 'bg-primary/10 text-primary border-primary/25 shadow-md shadow-primary/5'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <UserIcon size={16} />
                Meu Perfil
              </button>

              {showAdminTabs && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('teams');
                      setSelectedTeamForMembers(null);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border border-transparent ${
                      activeTab === 'teams'
                        ? 'bg-primary/10 text-primary border-primary/25 shadow-md shadow-primary/5'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Users size={16} />
                    Gerenciar Equipes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('invites');
                      setSelectedTeamForMembers(null);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border border-transparent ${
                      activeTab === 'invites'
                        ? 'bg-primary/10 text-primary border-primary/25 shadow-md shadow-primary/5'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <PaperPlaneTilt size={16} />
                    Convites
                  </button>
                </>
              )}

              {profile.organizationId === 'sandbox-test' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('sandbox');
                    setSelectedTeamForMembers(null);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border border-transparent ${
                    activeTab === 'sandbox'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-md shadow-sky-500/5'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Globe size={16} />
                  Simulação Sandbox
                </button>
              )}

              {(profile.role === 'manager' || profile.role === 'supervisor') && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('goals');
                    setSelectedTeamForMembers(null);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border border-transparent ${
                    activeTab === 'goals'
                      ? 'bg-primary/10 text-primary border-primary/25 shadow-md shadow-primary/5'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Target size={16} />
                  Configurar Metas
                </button>
              )}
            </nav>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer"
          >
            <X size={16} />
            Fechar
          </button>
        </div>

        {/* Coluna da Direita (Conteúdo) */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-950/20 relative flex flex-col">
          {/* Botão de Fechar no topo superior direito */}
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer z-10"
            title="Fechar"
          >
            <X size={20} />
          </button>

          {/* ABA: MEU PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-xl font-bold text-white">Meu Perfil</h3>
                <p className="text-xs text-slate-400 mt-1">Gerencie suas informações cadastrais básicas.</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary/80 transition-colors" size={20} />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-white/20 backdrop-blur-sm"
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cargo / Função</label>
                    <div className="relative group">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary/80 transition-colors" size={20} />
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-white/20 backdrop-blur-sm"
                        placeholder="Ex: Gerente de Receptivo"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] cursor-pointer"
                >
                  <Save size={20} className="mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          )}

          {/* ABA: GERENCIAR EQUIPES */}
          {activeTab === 'teams' && showAdminTabs && (
            selectedTeamForMembers ? (
              // MEMBROS DA EQUIPE
              <div className="space-y-6 max-w-2xl">
                <button 
                  type="button"
                  onClick={() => setSelectedTeamForMembers(null)}
                  className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors group cursor-pointer"
                >
                  <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
                  Voltar para Equipes
                </button>

                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Equipe: {selectedTeamForMembers.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Gerencie os membros desta equipe</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-2xl text-primary/80">
                    <Users size={24} />
                  </div>
                </div>

                <div className="space-y-3">
                  {loadingMembers ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      Nenhum membro nesta equipe ainda.
                    </div>
                  ) : (
                    teamMembers.map(member => (
                      <div key={member.uid} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-primary/80 font-bold">
                            {member.displayName ? member.displayName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-sm">{member.displayName}</h4>
                            <p className="text-[10px] text-slate-500">{member.email}</p>
                          </div>
                        </div>
                        {member.uid !== profile.uid && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveMember(member.uid, member.displayName)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="Remover da equipe"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {member.uid === profile.uid && (
                          <span className="text-[9px] font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                            <ShieldCheck size={12} />
                            Supervisor
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // LISTA DE EQUIPES
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users size={22} className="text-primary" />
                      {(profile.role === 'manager' || profile.role === 'coordinator') ? 'Equipes da Empresa' : 'Minhas Equipes'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {(profile.role === 'manager' || profile.role === 'coordinator') 
                        ? 'Todas as equipes cadastradas sob a organização.' 
                        : 'Equipes atribuídas sob sua supervisão.'}
                    </p>
                  </div>
                  {(profile.role === 'manager' || profile.role === 'coordinator') && (
                    <button 
                      type="button"
                      onClick={onCreateTeam}
                      className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all cursor-pointer"
                      title="Nova Equipe"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {managedTeamsData.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                      {profile.role === 'manager' 
                        ? 'Nenhuma equipe cadastrada para a empresa. Crie a primeira clicando no botão +'
                        : 'Você ainda não gerencia nenhuma equipe.'}
                    </div>
                  ) : (
                    managedTeamsData.map(team => (
                      <div key={team.id} className="group flex items-center justify-between p-4 bg-slate-950 border border-slate-900 rounded-2xl hover:border-slate-700 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 text-primary/80 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                            <Users size={18} />
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm">{team.name}</h4>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mt-0.5">ID: {team.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleManageMembers(team)}
                            className="px-3 py-1.5 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Membros
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          )}

          {/* ABA: CONVIDAR COLABORADORES */}
          {activeTab === 'invites' && showAdminTabs && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <PaperPlaneTilt size={22} className="text-primary" />
                  Convidar Novos Colaboradores
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Gere links de convite dinâmicos e individuais atrelados ao e-mail corporativo.
                </p>
              </div>

              {/* Linhas Dinâmicas de Convites */}
              <div className="space-y-4 bg-slate-950/20 p-5 border border-white/5 rounded-2xl">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                  Colaboradores a Convidar
                </div>

                <div className="space-y-3">
                  {inviteRows.map((row, idx) => {
                    const showTeamSelector = ['member', 'supervisor', 'backoffice'].includes(row.role);
                    return (
                      <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl relative">
                        {/* E-mail */}
                        <div className="flex-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">E-mail</label>
                          <input
                            type="email"
                            placeholder="nome@empresa.com"
                            value={row.email}
                            onChange={(e) => handleInviteRowChange(idx, 'email', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all placeholder:text-white/10"
                          />
                        </div>

                        {/* Cargo (Role) */}
                        <div className="w-full md:w-44">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Cargo</label>
                          {profile.role === 'supervisor' ? (
                            <select
                              value={row.role}
                              onChange={(e) => handleInviteRowChange(idx, 'role', e.target.value as UserRole)}
                              className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all cursor-pointer"
                            >
                              <option value="member" className="bg-slate-950 text-white">Operador</option>
                              <option value="backoffice" className="bg-slate-950 text-white">BackOffice</option>
                            </select>
                          ) : (
                            <select
                              value={row.role}
                              onChange={(e) => handleInviteRowChange(idx, 'role', e.target.value as UserRole)}
                              className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all cursor-pointer"
                            >
                              <option value="member" className="bg-slate-950 text-white">Operador</option>
                              <option value="supervisor" className="bg-slate-950 text-white">Supervisor</option>
                              <option value="backoffice" className="bg-slate-950 text-white">BackOffice</option>
                              <option value="coordinator" className="bg-slate-950 text-white">Coordenador</option>
                              <option value="monitor" className="bg-slate-950 text-white">Monitor/QA</option>
                              <option value="manager" className="bg-slate-950 text-white">Gerente</option>
                            </select>
                          )}
                        </div>

                        {/* Equipe */}
                        <div className="w-full md:w-44">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Equipe</label>
                          <select
                            disabled={!showTeamSelector}
                            value={row.teamId}
                            onChange={(e) => handleInviteRowChange(idx, 'teamId', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-850 bg-slate-950 text-white rounded-xl text-xs outline-none focus:border-primary transition-all disabled:opacity-30 cursor-pointer"
                          >
                            <option value="" className="bg-slate-950 text-slate-500">Sem equipe</option>
                            {managedTeamsData.map(team => (
                              <option key={team.id} value={team.id} className="bg-slate-950 text-white">{team.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Ação de Remover */}
                        {inviteRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInviteRow(idx)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all self-end md:self-auto cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddInviteRow}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 border border-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    Adicionar outro
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateInvites}
                    disabled={isGeneratingInvites}
                    className="w-full sm:w-auto px-6 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isGeneratingInvites ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    Gerar Links de Convite
                  </button>
                </div>
              </div>

              {/* Tabela de Convites Pendentes */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                  Convites Pendentes ({pendingInvites.length})
                </div>

                {loadingInvites ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" />
                  </div>
                ) : pendingInvites.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    Nenhum convite pendente de aceitação.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-white/5 rounded-2xl bg-slate-950/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/40 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-3">E-mail</th>
                          <th className="p-3">Cargo</th>
                          <th className="p-3">Equipe</th>
                          <th className="p-3">Expira em</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {pendingInvites.map(inv => {
                          const teamName = managedTeamsData.find(t => t.id === inv.teamId)?.name || 'Sem Equipe';
                          const inviteLink = `${window.location.origin}/register?invite=${inv.token}`;
                          const expirationDate = new Date(inv.expiresAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <tr key={inv.id} className="hover:bg-white/[0.01]">
                              <td className="p-3 font-semibold text-white font-mono">{inv.email}</td>
                              <td className="p-3 capitalize text-slate-400">
                                {inv.role === 'member' ? 'Operador' : inv.role}
                              </td>
                              <td className="p-3 text-slate-400">{teamName}</td>
                              <td className="p-3 text-slate-500">{expirationDate}</td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(inviteLink);
                                      showToast('Link de convite copiado!', 'success');
                                    }}
                                    className="p-1.5 bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
                                    title="Copiar Link"
                                  >
                                    <Copy size={12} />
                                  </button>

                                  {profile.organizationId === 'sandbox-test' && (
                                    <button
                                      type="button"
                                      onClick={() => handleSimulateAccept(inv.token, inv.email)}
                                      className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 text-[9px] font-black rounded-lg transition-all cursor-pointer"
                                      title="Simular Aceite"
                                    >
                                      Simular Aceite
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                                    title="Revogar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: SIMULAÇÃO SANDBOX */}
          {activeTab === 'sandbox' && profile.organizationId === 'sandbox-test' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse" />
                  Simulação de Times (Sandbox)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mude operadores e supervisores de time em tempo real. Nada será persistido no Firebase.
                </p>
              </div>

              {/* Link de Demonstração */}
              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={14} className="text-primary" />
                    Visualizar Tela de Convite Aberto
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Copie o link de demonstração abaixo para visualizar exatamente a tela de cadastro que o colaborador convidado verá.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/register?invite=demo`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?invite=demo`);
                      showToast('Link de demonstração copiado!', 'success');
                    }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    Copiar
                  </button>
                </div>
              </div>

              {profile.role === 'supervisor' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300">Operadores das Minhas Equipes</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {sandboxService.getUsers(profile.organizationId)
                      .filter(u => u.role === 'member' && u.teamId && managedTeamsData.some(t => t.id === u.teamId))
                      .map(op => {
                        const currentTeam = managedTeamsData.find(t => t.id === op.teamId);
                        return (
                          <div key={op.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 border border-slate-900 rounded-2xl gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-primary font-bold text-sm">
                                {op.displayName ? op.displayName[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{op.displayName}</p>
                                <p className="text-[10px] text-slate-400">{op.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Equipe:</span>
                                <span className="text-xs text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/25">
                                  {currentTeam ? currentTeam.name : 'Sem Time'}
                                </span>
                              </div>
                              
                              <select
                                value={op.teamId || ''}
                                onChange={(e) => {
                                  const newTeamId = e.target.value;
                                  const updatedUser = { ...op, teamId: newTeamId };
                                  sandboxService.setProfile(updatedUser);
                                  showToast(`Operador ${op.displayName} movido para ${managedTeamsData.find(t => t.id === newTeamId)?.name}!`, 'success');
                                }}
                                className="bg-slate-900 border border-slate-850 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer hover:border-slate-700 transition-all"
                              >
                                {managedTeamsData.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {profile.role === 'manager' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300">Supervisores da Organização</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {sandboxService.getUsers(profile.organizationId)
                      .filter(u => u.role === 'supervisor')
                      .map(sup => {
                        const supervisorTeams = managedTeamsData.filter(t => t.supervisorId === sup.uid);
                        const allTeams = managedTeamsData;
                        return (
                          <div key={sup.uid} className="flex flex-col p-5 bg-slate-950 border border-slate-900 rounded-3xl gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-primary font-bold text-sm">
                                  {sup.displayName ? sup.displayName[0].toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{sup.displayName}</p>
                                  <p className="text-[10px] text-slate-400">{sup.email}</p>
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400">
                                <span className="font-bold">Equipes: </span>
                                {supervisorTeams.length > 0 
                                  ? supervisorTeams.map(t => t.name).join(', ') 
                                  : 'Nenhuma'}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vincular a Equipes:</span>
                              <div className="flex flex-wrap gap-2">
                                {allTeams.map(t => {
                                  const isLinked = t.supervisorId === sup.uid;
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        const updatedTeam = { ...t, supervisorId: isLinked ? '' : sup.uid };
                                        sandboxService.setTeam(updatedTeam);
                                        showToast(
                                          isLinked 
                                            ? `Supervisor desvinculado da equipe ${t.name}!` 
                                            : `Equipe ${t.name} agora está sob supervisão de ${sup.displayName}!`,
                                          'success'
                                        );
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                        isLinked 
                                          ? 'bg-primary/20 text-primary border-primary/30' 
                                          : 'bg-slate-900 text-slate-400 border-slate-850 hover:border-slate-700 hover:text-white'
                                      }`}
                                    >
                                      {t.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA: CONFIGURAR METAS */}
          {activeTab === 'goals' && (profile.role === 'manager' || profile.role === 'supervisor') && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target size={20} className="text-sky-400" />
                  Configurar Metas das Equipes
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure a meta mensal de recuperação financeira e a meta de efetividade de acordos da equipe selecionada.
                </p>
              </div>

              {managedTeamsData.length > 0 ? (
                <form onSubmit={handleSaveGoals} className="space-y-6">
                  <div className="space-y-4 bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                    {/* Seletor de Equipe */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Selecione a Equipe</label>
                      <select
                        value={selectedGoalTeamId}
                        onChange={(e) => handleGoalTeamChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-200"
                      >
                        {managedTeamsData.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cota Mensal */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cota Mensal de Recuperação (R$)</label>
                        <input
                          required
                          type="number"
                          value={monthlyGoalInput}
                          onChange={(e) => setMonthlyGoalInput(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-200"
                        />
                      </div>

                      {/* Meta Efetividade */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Meta de Efetividade de Acordos (%)</label>
                        <input
                          required
                          type="number"
                          value={effectivenessGoalInput}
                          onChange={(e) => setEffectivenessGoalInput(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingGoals}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 text-xs shadow-lg shadow-sky-500/15 cursor-pointer"
                  >
                    <Save size={16} />
                    {isSavingGoals ? 'Salvando...' : 'Salvar Metas da Equipe'}
                  </button>
                </form>
              ) : (
                <div className="glass-card p-8 text-center border border-white/5 rounded-2xl">
                  <p className="text-sm text-slate-400">Você não possui nenhuma equipe sob sua gerência direta para configurar metas.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Exibição dos Links Gerados */}
      {generatedInvites && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl bg-[#090d16] text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-black flex items-center gap-1.5">
                <Check size={18} className="text-emerald-400" />
                Convites Gerados com Sucesso!
              </h4>
              <button
                type="button"
                onClick={() => setGeneratedInvites(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copie os links individuais abaixo e envie para os colaboradores correspondentes para que possam se registrar:
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {generatedInvites.map(inv => {
                const inviteLink = `${window.location.origin}/register?invite=${inv.token}`;
                return (
                  <div key={inv.id} className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                      <span>{inv.email}</span>
                      <span className="text-primary capitalize">{inv.role === 'member' ? 'Operador' : inv.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          showToast(`Link de ${inv.email} copiado!`, 'success');
                        }}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={12} />
                        Copiar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setGeneratedInvites(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-850 cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
