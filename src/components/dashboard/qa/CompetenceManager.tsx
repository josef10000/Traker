import React from 'react';
import { UserProfile, QaCompetence } from '../../../types';
import { Plus, Pencil as Edit2, Trash as Trash2 } from '@phosphor-icons/react';

interface CompetenceManagerProps {
  competences: QaCompetence[];
  isSuperUser: boolean;
  profile: UserProfile;
  theme?: 'light' | 'dark';
  onEditComp: (comp: QaCompetence) => void;
  onDeleteComp: (id: string) => Promise<void>;
  onNewComp: () => void;
}

export const CompetenceManager: React.FC<CompetenceManagerProps> = ({
  competences,
  isSuperUser,
  profile,
  theme = 'dark',
  onEditComp,
  onDeleteComp,
  onNewComp
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Competências Cadastradas</h4>
        {profile.role === 'monitor' && (
          <button
            onClick={onNewComp}
            className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
          >
            <Plus size={12} /> Nova Competência
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {competences.map(c => (
          <div key={c.id} className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
            theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <h4 className={`font-bold text-sm leading-tight flex items-center justify-between ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {c.name}
                <span className={`px-1.5 py-0.5 text-[9px] rounded border ${
                  theme === 'dark' ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>Peso: {c.weight || 1}</span>
              </h4>
              {c.description && (
                <p className={`text-xs mt-2 leading-relaxed italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>"{c.description}"</p>
              )}
            </div>

            {profile.role === 'monitor' && (
              <div className={`flex justify-end gap-2 border-t pt-3 ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <button
                  onClick={() => onEditComp(c)}
                  className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-white/5 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 border-white/5' 
                      : 'bg-slate-50 hover:bg-sky-500/10 text-slate-550 hover:text-sky-600 border-slate-200'
                  }`}
                  title="Editar"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => onDeleteComp(c.id)}
                  className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-white/5' 
                      : 'bg-slate-50 hover:bg-rose-500/10 text-slate-550 hover:text-rose-600 border-slate-200'
                  }`}
                  title="Excluir"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
