import React, { useState, useEffect } from 'react';
import { UserProfile, QaCompetence, Pdi } from '../../../types';
import { Compass, Plus } from '@phosphor-icons/react';
import { CustomSelect } from '../../ui/CustomSelect';

interface QaModalsProps {
  theme: 'light' | 'dark';
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  competences: QaCompetence[];
  qaSettings: { evaluationCycleDays: number; pdiObservationDays: number };
  
  isCompModalOpen: boolean;
  setIsCompModalOpen: (open: boolean) => void;
  editingCompetence: QaCompetence | null;
  onSaveCompetence: (name: string, weight: number, description: string) => Promise<void>;

  isEvalModalOpen: boolean;
  setIsEvalModalOpen: (open: boolean) => void;
  onSaveEvaluation: (data: {
    operatorId: string;
    callId: string;
    protocol: string;
    callLink: string;
    grades: Record<string, number>;
    feedback: string;
    suggestPdi: boolean;
    pdiCompetenceId?: string;
    pdiActionPlan?: string;
    pdiDueDate?: string;
  }) => Promise<void>;

  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  onSaveSettings: (cycleDays: number, pdiDays: number) => Promise<void>;
}

export const QaModals: React.FC<QaModalsProps> = ({
  theme,
  profile,
  currentTeamMembers,
  competences,
  qaSettings,
  
  isCompModalOpen,
  setIsCompModalOpen,
  editingCompetence,
  onSaveCompetence,

  isEvalModalOpen,
  setIsEvalModalOpen,
  onSaveEvaluation,

  isSettingsOpen,
  setIsSettingsOpen,
  onSaveSettings
}) => {
  // Competence Form State
  const [compName, setCompName] = useState('');
  const [compWeight, setCompWeight] = useState(1);
  const [compDesc, setCompDesc] = useState('');

  // Sync competence form when editing starts
  useEffect(() => {
    if (editingCompetence) {
      setCompName(editingCompetence.name);
      setCompWeight(editingCompetence.weight || 1);
      setCompDesc(editingCompetence.description || '');
    } else {
      setCompName('');
      setCompWeight(1);
      setCompDesc('');
    }
  }, [editingCompetence, isCompModalOpen]);

  // Evaluation Form State
  const [evalOperatorId, setEvalOperatorId] = useState('');
  const [evalCallId, setEvalCallId] = useState('');
  const [evalProtocol, setEvalProtocol] = useState('');
  const [evalCallLink, setEvalCallLink] = useState('');
  const [evalGrades, setEvalGrades] = useState<Record<string, number>>({});
  const [evalFeedback, setEvalFeedback] = useState('');
  const [suggestPdi, setSuggestPdi] = useState(false);
  const [pdiCompetenceId, setPdiCompetenceId] = useState('');
  const [pdiActionPlan, setPdiActionPlan] = useState('');
  const [pdiDueDate, setPdiDueDate] = useState('');

  // Calculate default PDI due date
  useEffect(() => {
    if (suggestPdi && !pdiDueDate) {
      const d = new Date();
      d.setDate(d.getDate() + (qaSettings.pdiObservationDays || 15));
      setPdiDueDate(d.toISOString().split('T')[0]);
    }
  }, [suggestPdi, pdiDueDate, qaSettings.pdiObservationDays]);

  // Reset evaluation form when modal opens
  useEffect(() => {
    if (isEvalModalOpen) {
      setEvalOperatorId('');
      setEvalCallId('');
      setEvalProtocol('');
      setEvalCallLink('');
      setEvalGrades({});
      setEvalFeedback('');
      setSuggestPdi(false);
      setPdiCompetenceId('');
      setPdiActionPlan('');
      setPdiDueDate('');
    }
  }, [isEvalModalOpen]);

  // Settings Form State
  const [cycleDays, setCycleDays] = useState(30);
  const [pdiDays, setPdiDays] = useState(15);

  useEffect(() => {
    if (isSettingsOpen) {
      setCycleDays(qaSettings.evaluationCycleDays);
      setPdiDays(qaSettings.pdiObservationDays);
    }
  }, [isSettingsOpen, qaSettings]);

  return (
    <>
      {/* MODAL CADASTRAR/EDITAR COMPETENCIA */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer" onClick={() => setIsCompModalOpen(false)} />
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 cursor-default transition-all ${
              theme === 'dark' 
                ? 'bg-slate-900 border-white/10 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]' 
                : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]'
            }`}
          >
            <h3 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {editingCompetence ? 'Editar Competência' : 'Adicionar Competência'}
            </h3>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await onSaveCompetence(compName, compWeight, compDesc);
            }} className="space-y-4">
              <div className="space-y-1">
                <label className={`text-[10px] font-extrabold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Nome da Competência *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Negociação Avançada"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-extrabold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Peso na Avaliação</label>
                <input 
                  type="number" 
                  min={1} 
                  max={5}
                  value={compWeight}
                  onChange={(e) => setCompWeight(parseInt(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-extrabold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Descrição explicativa</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Capacidade de expor valores e propostas sem gaguejar."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs resize-none transition-all focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-extrabold text-xs border transition-all cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-white/10' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 rounded-xl font-extrabold text-white text-xs shadow-lg shadow-sky-500/25 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA AVALIAÇAO QA */}
      {isEvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer" onClick={() => setIsEvalModalOpen(false)} />
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-3xl rounded-3xl border p-8 overflow-y-auto max-h-[90vh] space-y-6 cursor-default transition-all ${
              theme === 'dark' 
                ? 'bg-slate-900 border-white/10 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]' 
                : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]'
            }`}
          >
            <h3 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Avaliação de Qualidade de Atendimento</h3>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await onSaveEvaluation({
                operatorId: evalOperatorId,
                callId: evalCallId,
                protocol: evalProtocol,
                callLink: evalCallLink,
                grades: evalGrades,
                feedback: evalFeedback,
                suggestPdi,
                pdiCompetenceId: suggestPdi ? pdiCompetenceId : undefined,
                pdiActionPlan: suggestPdi ? pdiActionPlan : undefined,
                pdiDueDate: suggestPdi ? pdiDueDate : undefined
              });
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Operador */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Selecionar Operador *</label>
                  <CustomSelect 
                    value={evalOperatorId}
                    onChange={(val) => setEvalOperatorId(val)}
                    placeholder="Escolha o colaborador..."
                    options={currentTeamMembers.map(m => ({
                      value: m.uid,
                      label: m.displayName || m.email.split('@')[0]
                    }))}
                  />
                </div>

                {/* ID Ligacao */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">ID da Ligação (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: CALL-89472"
                    value={evalCallId}
                    onChange={(e) => setEvalCallId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all placeholder:text-slate-500/60 focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Protocolo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Protocolo do CRM (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: PROT-99238"
                    value={evalProtocol}
                    onChange={(e) => setEvalProtocol(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all placeholder:text-slate-500/60 focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Link Gravacao */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Link da Gravação (Opcional)</label>
                  <input
                    type="url"
                    placeholder="Ex: https://callcenter.com/audio.mp3"
                    value={evalCallLink}
                    onChange={(e) => setEvalCallLink(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all placeholder:text-slate-500/60 focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Notas por Competencia */}
              <div className={`space-y-3 border-t pt-4 ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Compass size={14} /> Notas de Avaliação (0 a 100)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {competences.map(c => (
                    <div key={c.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className={`text-xs font-bold block ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{c.name}</span>
                        {c.description && <span className="text-[9px] text-slate-500 block leading-tight">{c.description}</span>}
                      </div>

                      <input 
                        type="number"
                        min={0}
                        max={100}
                        required
                        placeholder="Nota"
                        value={evalGrades[c.id] === undefined ? '' : evalGrades[c.id]}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.min(100, Math.max(0, parseInt(e.target.value)));
                          setEvalGrades(prev => ({ ...prev, [c.id]: val as number }));
                        }}
                        className={`w-20 text-center py-2 rounded-xl text-xs font-bold focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback Textual */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Feedback Detalhado / Observações do Monitor *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escreva pontos de melhoria observados e elogios técnicos..."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border outline-none text-xs resize-none transition-all placeholder:text-slate-500/60 focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Injeção de PDI */}
              <div className={`border-t pt-4 space-y-4 ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <label className="relative flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={suggestPdi}
                    onChange={(e) => setSuggestPdi(e.target.checked)}
                    className="peer rounded border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950 text-sky-500 focus:ring-sky-500"
                  />
                  <span className={`text-xs font-bold transition-colors leading-none ${
                    theme === 'dark' ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'
                  }`}>
                    Criar PDI (Plano de Desenvolvimento Individual) associado?
                  </span>
                </label>

                {suggestPdi && (
                  <div className={`p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-4 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Foco de Melhoria (Competência) *</label>
                      <CustomSelect 
                        value={pdiCompetenceId}
                        onChange={(val) => setPdiCompetenceId(val)}
                        placeholder="Selecione a competência..."
                        options={competences.map(c => ({
                          value: c.id,
                          label: c.name
                        }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Prazo de Cumprimento *</label>
                      <input
                        type="date"
                        required={suggestPdi}
                        value={pdiDueDate}
                        onChange={(e) => setPdiDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 dark:color-scheme-dark' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Plano de Ação Prático *</label>
                      <textarea
                        rows={2}
                        required={suggestPdi}
                        placeholder="Ex: Fazer escuta diária de 3 calls exemplares de colegas; aplicar técnica de contorno de objeção da dilação..."
                        value={pdiActionPlan}
                        onChange={(e) => setPdiActionPlan(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs resize-none transition-all placeholder:text-slate-500/60 focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botões Form */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className={`flex-1 py-4 rounded-xl font-bold text-xs border cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-sky-500 hover:bg-sky-400 rounded-xl font-bold text-white text-xs shadow-lg shadow-sky-500/10 cursor-pointer"
                >
                  Enviar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO DE CICLO DE QA */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer" onClick={() => setIsSettingsOpen(false)} />
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 cursor-default transition-all ${
              theme === 'dark' 
                ? 'bg-slate-900 border-white/10 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]' 
                : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]'
            }`}
          >
            <h3 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Configuração de Ciclos de QA
            </h3>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await onSaveSettings(cycleDays, pdiDays);
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Periodicidade de Avaliação (dias)</label>
                <input 
                  type="number" 
                  min={7} 
                  max={90}
                  required
                  value={cycleDays}
                  onChange={(e) => setCycleDays(parseInt(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <p className="text-[10px] text-slate-500">Intervalo recomendado para a reavaliação padrão dos colaboradores.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Duração Observação PDI (dias)</label>
                <input 
                  type="number" 
                  min={5} 
                  max={60}
                  required
                  value={pdiDays}
                  onChange={(e) => setPdiDays(parseInt(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <p className="text-[10px] text-slate-550 dark:text-slate-500">Calcula automaticamente a data limite sugerida para os novos PDIs.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs border cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 rounded-xl font-bold text-white text-xs shadow-lg shadow-sky-500/10 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
