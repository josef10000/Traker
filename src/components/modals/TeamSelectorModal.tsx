import React from 'react';
import { motion } from 'motion/react';
import { X, Users, Globe } from '@phosphor-icons/react';
import { Team, UserProfile } from '../../types';

interface TeamSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  supervisors?: UserProfile[];
  profileRole?: string;
}

export const TeamSelectorModal = ({
  isOpen,
  onClose,
  teams,
  selectedTeamId,
  onSelectTeam,
  supervisors,
  profileRole
}: TeamSelectorModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative glass-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10"
      >
        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-bold text-white">Selecionar Equipe</h2>
            <p className="text-[10px] text-slate-400">Escolha a equipe operacional ou a visão consolidada</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Opção Visão Macro */}
          <button
            onClick={() => {
              onSelectTeam('all');
              onClose();
            }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
              selectedTeamId === 'all'
                ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl transition-colors ${
                selectedTeamId === 'all' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-slate-400 group-hover:text-white'
              }`}>
                <Globe size={20} weight="duotone" />
              </div>
              <div>
                <span className="font-bold text-sm block">Visão Macro (Todas)</span>
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">Performance consolidada de todas as carteiras</span>
              </div>
            </div>
            {selectedTeamId === 'all' && (
              <span className="text-[10px] bg-sky-500 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md shadow-sky-500/20">
                Ativo
              </span>
            )}
          </button>

          {/* Listagem de Equipes por Supervisor (se for Gerente) */}
          {profileRole === 'manager' && supervisors && supervisors.length > 0 ? (
            <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Filtrar por Supervisor</h3>
              {supervisors.map(sup => {
                const isSupActive = selectedTeamId === `supervisor-${sup.uid}`;
                const supervisorTeams = teams.filter(t => t.supervisorId === sup.uid);
                
                return (
                  <div key={sup.uid} className="space-y-2 p-3 bg-white/5 border border-white/5 rounded-3xl">
                    <button
                      onClick={() => {
                        onSelectTeam(`supervisor-${sup.uid}`);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                        isSupActive
                          ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                          : 'bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 font-bold text-xs">
                          {sup.displayName ? sup.displayName[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <span className="font-bold text-sm block leading-tight text-white">{sup.displayName || sup.email.split('@')[0]}</span>
                          <span className="text-[9px] text-slate-500">Ver todas as equipes sob sua supervisão</span>
                        </div>
                      </div>
                      {isSupActive && (
                        <span className="text-[9px] bg-sky-500 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Ativo
                        </span>
                      )}
                    </button>

                    {/* Equipes individuais deste supervisor */}
                    <div className="grid grid-cols-1 gap-1.5 pl-2 pr-1">
                      {supervisorTeams.map(team => {
                        const isTeamActive = selectedTeamId === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => {
                              onSelectTeam(team.id);
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left ${
                              isTeamActive
                                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                                : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-bold">{team.name}</span>
                            {isTeamActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                          </button>
                        );
                      })}
                      {supervisorTeams.length === 0 && (
                        <span className="text-[9px] text-slate-500 italic pl-2">Nenhuma equipe vinculada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Listagem Simples (Supervisor ou Operador) */
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Minhas Equipes</h3>
              {teams.map((team) => {
                const isActive = selectedTeamId === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => {
                      onSelectTeam(team.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                      isActive
                        ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2.5 rounded-xl transition-colors ${
                        isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-slate-400 group-hover:text-white'
                      }`}>
                        <Users size={20} weight="duotone" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">{team.name}</span>
                        {team.monthlyGoal && (
                          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
                            Meta: R$ {team.monthlyGoal.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] bg-sky-500 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Ativo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
