import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  CaretRight, 
  CaretDown, 
  Users,
  UserSwitch
} from '@phosphor-icons/react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Team } from '../../types';
import { sandboxService } from '../../lib/sandboxService';
import { CustomSelect } from '../ui/CustomSelect';

interface OrgTreeSectionProps {
  profile: UserProfile;
  theme: 'dark' | 'light';
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  supervisors: UserProfile[];
  managedTeamsData: Team[];
}

export const OrgTreeSection: React.FC<OrgTreeSectionProps> = ({
  profile,
  theme,
  showToast,
  supervisors,
  managedTeamsData
}) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // Solicitação de transferência (para gerente)
  const [showTransferModal, setShowTransferModal] = useState<UserProfile | null>(null);
  const [targetManagerId, setTargetManagerId] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        const users = sandboxService.getUsers('sandbox-test');
        const teams = sandboxService.getTeams('sandbox-test');
        setAllUsers(users);
        setAllTeams(teams);
        return;
      }

      // Buscar todos os usuários da organização
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('organizationId', '==', profile.organizationId));
      const usersSnap = await getDocs(usersQuery);
      const users = usersSnap.docs.map(doc => doc.data() as UserProfile);

      // Buscar todas as equipes da organização
      const teamsRef = collection(db, 'teams');
      const teamsQuery = query(teamsRef, where('organizationId', '==', profile.organizationId));
      const teamsSnap = await getDocs(teamsQuery);
      const teams = teamsSnap.docs.map(doc => doc.data() as Team);

      setAllUsers(users);
      setAllTeams(teams);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar organograma.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile.organizationId) {
      loadData();
    }
  }, [profile.organizationId]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleTransferSupervisor = async () => {
    if (!showTransferModal || !targetManagerId) return;

    try {
      if (profile.organizationId === 'sandbox-test') {
        const sup = sandboxService.getUser(showTransferModal.uid);
        if (sup) {
          sandboxService.setProfile({ ...sup, managerId: targetManagerId });
        }
        showToast('Supervisor transferido no Sandbox!', 'success');
        setShowTransferModal(null);
        setTargetManagerId('');
        loadData();
        return;
      }

      const supRef = doc(db, 'users', showTransferModal.uid);
      await updateDoc(supRef, { managerId: targetManagerId });
      showToast('Supervisor transferido com sucesso!', 'success');
      setShowTransferModal(null);
      setTargetManagerId('');
      loadData();
    } catch (error) {
      showToast('Erro ao transferir supervisor.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6 w-full max-w-4xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Folder size={22} className="text-sky-400" />
          Estrutura Organizacional
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Visualize a hierarquia de gerência, supervisores, equipes e operadores ativos na organização.
        </p>
      </div>

      <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
        {/* Lista de Gerentes (Nível 1) */}
        {allUsers.filter(u => u.role === 'manager').map(manager => {
          const managerId = manager.uid;
          const isExpanded = !!expandedNodes[managerId];
          const managedSups = allUsers.filter(u => u.role === 'supervisor' && u.managerId === managerId);
          
          return (
            <div key={managerId} className="border border-white/5 rounded-xl bg-slate-950/40 overflow-hidden">
              <div 
                onClick={() => toggleNode(managerId)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <button type="button" className="text-slate-400">
                    {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                  </button>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {manager.displayName ? manager.displayName[0].toUpperCase() : 'G'}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">{manager.displayName || manager.email.split('@')[0]}</span>
                    <span className="text-[10px] text-purple-400 ml-2 uppercase font-black tracking-wider">Gerente</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">{manager.email}</span>
              </div>

              {isExpanded && (
                <div className="pl-8 pr-4 pb-4 space-y-3 border-t border-white/5 bg-slate-950/20 pt-3">
                  {managedSups.length === 0 ? (
                    <p className="text-xs text-slate-500 italic pl-6">Nenhum supervisor sob esta gerência.</p>
                  ) : (
                    managedSups.map(sup => {
                      const supId = sup.uid;
                      const isSupExpanded = !!expandedNodes[supId];
                      const supTeams = allTeams.filter(t => t.supervisorId === supId);

                      return (
                        <div key={supId} className="border border-white/5 rounded-xl bg-slate-900/20 overflow-hidden">
                          <div 
                            onClick={() => toggleNode(supId)}
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <button type="button" className="text-slate-400">
                                {isSupExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
                              </button>
                              <div className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                                {sup.displayName ? sup.displayName[0].toUpperCase() : 'S'}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-slate-200">{sup.displayName || sup.email.split('@')[0]}</span>
                                <span className="text-[9px] text-sky-400 ml-2 uppercase font-black tracking-wider">Supervisor</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                              {profile.role === 'manager' && managerId !== profile.uid && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowTransferModal(sup);
                                    setTargetManagerId(managerId);
                                  }}
                                  className="px-2.5 py-1 bg-primary hover:bg-primary/80 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Solicitar Transferência
                                </button>
                              )}
                              <span className="text-[10px] text-slate-500">{sup.email}</span>
                            </div>
                          </div>

                          {isSupExpanded && (
                            <div className="pl-8 pr-3 pb-3 space-y-2 border-t border-white/5 bg-slate-900/10 pt-2">
                              {supTeams.length === 0 ? (
                                <p className="text-[11px] text-slate-500 italic pl-5">Nenhuma equipe sob este supervisor.</p>
                              ) : (
                                supTeams.map(team => {
                                  const teamId = team.id;
                                  const isTeamExpanded = !!expandedNodes[teamId];
                                  const teamOperators = allUsers.filter(u => u.role === 'member' && u.teamId === teamId);

                                  return (
                                    <div key={teamId} className="border border-white/5 rounded-lg bg-slate-950/20 overflow-hidden">
                                      <div 
                                        onClick={() => toggleNode(teamId)}
                                        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-all"
                                      >
                                        <div className="flex items-center gap-2">
                                          <button type="button" className="text-slate-400">
                                            {isTeamExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
                                          </button>
                                          <Users size={14} className="text-emerald-400" />
                                          <span className="text-[11px] font-semibold text-slate-300">Equipe: {team.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">{teamOperators.length} operadores</span>
                                      </div>

                                      {isTeamExpanded && (
                                        <div className="pl-6 pr-2 pb-2 space-y-1.5 border-t border-white/5 bg-slate-950/40 pt-1.5">
                                          {teamOperators.length === 0 ? (
                                            <p className="text-[10px] text-slate-500 italic pl-4">Nenhum operador nesta equipe.</p>
                                          ) : (
                                            teamOperators.map(op => (
                                              <div key={op.uid} className="flex items-center justify-between p-1.5 bg-slate-900/10 rounded border border-white/5">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-400 font-bold">
                                                    {op.displayName ? op.displayName[0].toUpperCase() : 'O'}
                                                  </div>
                                                  <span className="text-[10px] font-medium text-slate-400">{op.displayName || op.email.split('@')[0]}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-500">{op.email}</span>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE TRANSFERÊNCIA DE SUPERVISOR */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-white/5 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-sky-400 pb-2 border-b border-white/5">
              <UserSwitch size={20} />
              <h4 className="font-bold text-white">Transferir Supervisor</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Mova o supervisor <strong>{showTransferModal.displayName || showTransferModal.email}</strong> para estar sob a gestão de outro gerente.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Gerente de Destino</label>
              <CustomSelect 
                value={targetManagerId}
                onChange={(val) => setTargetManagerId(val)}
                placeholder="-- Selecionar Gerente --"
                options={allUsers.filter(u => u.role === 'manager' && u.uid !== showTransferModal.managerId).map(g => ({
                  value: g.uid,
                  label: g.displayName || g.email.split('@')[0]
                }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowTransferModal(null);
                  setTargetManagerId('');
                }}
                className="px-4 py-2 border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!targetManagerId}
                onClick={handleTransferSupervisor}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
