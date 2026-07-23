import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trash, 
  Plus, 
  ArrowLeft, 
  MagnifyingGlass, 
  ShieldCheck 
} from '@phosphor-icons/react';
import { UserProfile, Team } from '../../types';
import { removeTeamMember, getTeamMembers, deleteTeam } from '../../lib/teams';
import { sandboxService } from '../../lib/sandboxService';
import { Avatar } from '../ui/Avatar';
import { ConfirmModal } from '../modals/ConfirmModal';

interface TeamsManagementSectionProps {
  profile: UserProfile;
  managedTeamsData: Team[];
  setManagedTeamsData?: React.Dispatch<React.SetStateAction<Team[]>>;
  supervisors: UserProfile[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onCreateTeam: () => void;
  theme: 'dark' | 'light';
  onRefreshData?: () => void;
}

export const TeamsManagementSection: React.FC<TeamsManagementSectionProps> = ({
  profile,
  managedTeamsData,
  setManagedTeamsData,
  supervisors,
  showToast,
  onCreateTeam,
  theme,
  onRefreshData
}) => {
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);
  const membersPerPage = 5;

  const loadTeamMembers = async (teamId: string) => {
    setLoadingMembers(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const members = sandboxService.getUsers('sandbox-test').filter(u => u.teamId === teamId);
        setTeamMembers(members);
        return;
      }
      const members = await getTeamMembers(teamId);
      setTeamMembers(members);
    } catch (error) {
      showToast('Erro ao carregar membros.', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (selectedTeamForMembers) {
      loadTeamMembers(selectedTeamForMembers.id);
    }
  }, [selectedTeamForMembers]);

  const handleManageMembers = (team: Team) => {
    setSelectedTeamForMembers(team);
    setMemberSearchQuery('');
    setMemberCurrentPage(1);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleRemoveMember = (memberUid: string, memberName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Membro',
      message: `Tem certeza que deseja remover ${memberName} desta equipe?`,
      onConfirm: async () => {
        try {
          if (profile.organizationId === 'sandbox-test') {
            const user = sandboxService.getUser(memberUid);
            if (user) {
              sandboxService.setProfile({ ...user, teamId: '' });
            }
            setTeamMembers(prev => prev.filter(m => m.uid !== memberUid));
            showToast('Membro removido no Sandbox com sucesso!', 'success');
            if (onRefreshData) onRefreshData();
            return;
          }
          await removeTeamMember(memberUid);
          setTeamMembers(prev => prev.filter(m => m.uid !== memberUid));
          showToast('Membro removido com sucesso!', 'success');
          if (onRefreshData) onRefreshData();
        } catch (error) {
          showToast('Erro ao remover membro.', 'error');
        }
      }
    });
  };

  const handleDeleteTeamClick = (teamId: string, teamName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Equipe',
      message: `Tem certeza que deseja excluir a equipe "${teamName}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          if (profile.organizationId === 'sandbox-test') {
            sandboxService.deleteTeam(teamId);
            if (setManagedTeamsData) {
              setManagedTeamsData(prev => prev.filter(t => t.id !== teamId));
            }
            showToast('Equipe excluída do Sandbox com sucesso!', 'success');
            if (onRefreshData) onRefreshData();
            return;
          }
          await deleteTeam(profile.uid, teamId);
          if (setManagedTeamsData) {
            setManagedTeamsData(prev => prev.filter(t => t.id !== teamId));
          }
          showToast('Equipe excluída com sucesso!', 'success');
          if (onRefreshData) onRefreshData();
        } catch (error) {
          showToast('Erro ao excluir equipe.', 'error');
        }
      }
    });
  };

  const filteredTeamMembers = teamMembers.filter(m => 
    m.displayName?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const totalMemberPages = Math.ceil(filteredTeamMembers.length / membersPerPage);
  const paginatedTeamMembers = filteredTeamMembers.slice(
    (memberCurrentPage - 1) * membersPerPage,
    memberCurrentPage * membersPerPage
  );

  const showAdminActions = profile.role === 'manager' || profile.role === 'coordinator';

  return (
    <div className="space-y-6 w-full max-w-4xl animate-fadeIn">
      {selectedTeamForMembers ? (
        // MEMBROS DA EQUIPE DETALHE
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
          <button 
            type="button"
            onClick={() => setSelectedTeamForMembers(null)}
            className="flex items-center text-slate-400 hover:text-white transition-colors group cursor-pointer text-xs font-extrabold uppercase tracking-wider"
          >
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Voltar para Equipes
          </button>

          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Equipe: {selectedTeamForMembers.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Gerencie os membros desta equipe</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-2xl text-primary/80">
              <Users size={24} />
            </div>
          </div>

          {/* Campo de Busca */}
          {!loadingMembers && teamMembers.length > 0 && (
            <div className="relative">
              <input 
                type="text"
                placeholder="Pesquisar membro por nome ou e-mail..."
                value={memberSearchQuery}
                onChange={(e) => {
                  setMemberSearchQuery(e.target.value);
                  setMemberCurrentPage(1);
                }}
                className="w-full bg-slate-900/60 border border-white/5 focus:border-primary/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all pl-10"
              />
              <MagnifyingGlass size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
            </div>
          )}

          <div className="space-y-3">
            {loadingMembers ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Nenhum membro nesta equipe ainda.
              </div>
            ) : filteredTeamMembers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Nenhum membro encontrado para a busca "{memberSearchQuery}".
              </div>
            ) : (
              <>
                {paginatedTeamMembers.map(member => (
                  <div key={member.uid} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <Avatar
                        displayName={member.displayName}
                        email={member.email}
                        avatarStyle={member.avatarStyle}
                        avatarSeed={member.avatarSeed}
                        theme={theme}
                        size="md"
                      />
                      <div>
                        <h4 className="text-white font-semibold text-sm">{member.displayName}</h4>
                        <p className="text-[10px] text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    {member.uid !== profile.uid && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveMember(member.uid, member.displayName || '')}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                        title="Remover da equipe"
                      >
                        <Trash size={18} />
                      </button>
                    )}
                    {member.uid === profile.uid && (
                      <span className="text-[9px] font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                        <ShieldCheck size={12} />
                        Supervisor
                      </span>
                    )}
                  </div>
                ))}

                {totalMemberPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-2">
                    <button
                      type="button"
                      disabled={memberCurrentPage === 1}
                      onClick={() => setMemberCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 bg-slate-900 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/5"
                    >
                      Anterior
                    </button>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Página {memberCurrentPage} de {totalMemberPages}
                    </span>
                    <button
                      type="button"
                      disabled={memberCurrentPage === totalMemberPages}
                      onClick={() => setMemberCurrentPage(prev => Math.min(totalMemberPages, prev + 1))}
                      className="px-3 py-1.5 bg-slate-900 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/5"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        // LISTA DE EQUIPES
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={22} className="text-sky-400" />
                {showAdminActions ? 'Equipes da Empresa' : 'Minhas Equipes'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {showAdminActions 
                  ? 'Todas as equipes cadastradas sob a organização.' 
                  : 'Equipes atribuídas sob sua supervisão.'}
              </p>
            </div>
            {showAdminActions && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {managedTeamsData.length === 0 ? (
              <div className="col-span-full text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                {showAdminActions 
                  ? 'Nenhuma equipe cadastrada para a empresa. Crie a primeira clicando no botão +'
                  : 'Você ainda não gerencia nenhuma equipe.'}
              </div>
            ) : (
              managedTeamsData.map(team => {
                const teamSup = supervisors.find(s => s.uid === team.supervisorId);
                return (
                  <div key={team.id} className="group flex flex-col justify-between p-5 bg-slate-950/60 border border-white/5 rounded-2xl hover:border-sky-500/25 hover:bg-white/[0.01] transition-all">
                    <div>
                      <h4 className="text-white font-bold text-sm group-hover:text-sky-400 transition-all">{team.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Supervisor: <span className="text-slate-300 font-medium">{teamSup?.displayName || teamSup?.email.split('@')[0] || 'Não Atribuído'}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">ID: {team.id}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => handleManageMembers(team)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-white/5 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                        >
                          Membros
                        </button>
                        {showAdminActions && (
                          <button 
                            type="button"
                            onClick={() => handleDeleteTeamClick(team.id, team.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        theme={theme}
      />
    </div>
  );
};
