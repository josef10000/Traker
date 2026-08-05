import React, { useState, useEffect } from 'react';
import { UserProfile, QaCompetence, Pdi } from '../../../types';
import { Compass, Plus, UploadSimple, CircleNotch, Headphones } from '@phosphor-icons/react';
import { CustomSelect } from '../../ui/CustomSelect';
import { r2Service } from '../../../lib/r2Service';
import { CustomAudioPlayer } from '../../ui/CustomAudioPlayer';

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
    callExpiresAt?: string;
    grades: Record<string, number>;
    feedback: string;
    suggestPdi: boolean;
    pdiCompetenceId?: string;
    pdiActionPlan?: string;
    pdiDueDate?: string;
    recoveredAmount?: number;
    delayProfileLabel?: string;
    delayProfile?: string;
    clientReason?: string;
    objections?: string;
    improvementOpportunities?: string[];
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
  const [evalCallExpiresAt, setEvalCallExpiresAt] = useState<string | undefined>(undefined);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');
  const [evalGrades, setEvalGrades] = useState<Record<string, number>>({});
  const [evalFeedback, setEvalFeedback] = useState('');
  const [suggestPdi, setSuggestPdi] = useState(false);
  const [pdiCompetenceId, setPdiCompetenceId] = useState('');
  const [pdiActionPlan, setPdiActionPlan] = useState('');
  const [pdiDueDate, setPdiDueDate] = useState('');

  // Campos Estruturados da Ficha QA (Totalmente Editáveis)
  const [evalRecoveredAmount, setEvalRecoveredAmount] = useState<string>('');
  const [evalDelayProfileLabel, setEvalDelayProfileLabel] = useState<string>('Perfil de atraso');
  const [evalDelayProfile, setEvalDelayProfile] = useState<string>('2 a 30 dias');
  const [evalClientReason, setEvalClientReason] = useState<string>('');
  const [evalObjections, setEvalObjections] = useState<string>('');
  const [evalImprovementOpportunitiesText, setEvalImprovementOpportunitiesText] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo de áudio deve ter no máximo 15 MB.');
      return;
    }

    try {
      setIsUploadingAudio(true);
      setAudioFileName(file.name);
      const isSandboxMode = profile.organizationId === 'sandbox-test' || !import.meta.env.VITE_CLOUDFLARE_R2_ENDPOINT;
      const res = await r2Service.uploadAudio(file, profile.organizationId || 'demo', isSandboxMode);
      setEvalCallLink(res.url);
      setEvalCallExpiresAt(res.expiresAt);
    } catch (err) {
      console.error(err);
      alert('Erro ao realizar upload do arquivo de áudio.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

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
      setEvalCallExpiresAt(undefined);
      setAudioFileName('');
      setEvalGrades({});
      setEvalFeedback('');
      setSuggestPdi(false);
      setPdiCompetenceId('');
      setPdiActionPlan('');
      setPdiDueDate('');
      setEvalRecoveredAmount('');
      setEvalDelayProfileLabel('Perfil de atraso');
      setEvalDelayProfile('2 a 30 dias');
      setEvalClientReason('');
      setEvalObjections('');
      setEvalImprovementOpportunitiesText('');
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
                callExpiresAt: evalCallExpiresAt,
                grades: evalGrades,
                feedback: evalFeedback,
                suggestPdi,
                pdiCompetenceId: suggestPdi ? pdiCompetenceId : undefined,
                pdiActionPlan: suggestPdi ? pdiActionPlan : undefined,
                pdiDueDate: suggestPdi ? pdiDueDate : undefined,
                recoveredAmount: evalRecoveredAmount ? parseFloat(evalRecoveredAmount) : undefined,
                delayProfileLabel: evalDelayProfileLabel || undefined,
                delayProfile: evalDelayProfile || undefined,
                clientReason: evalClientReason || undefined,
                objections: evalObjections || undefined,
                improvementOpportunities: evalImprovementOpportunitiesText ? evalImprovementOpportunitiesText.split('\n').map(s => s.trim()).filter(Boolean) : undefined
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

                {/* Upload de Gravação MP3/WAV */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Headphones size={12} className="text-sky-400" />
                    Gravação da Chamada (MP3/WAV)
                  </label>
                  <label className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800 hover:border-sky-500/50' : 'bg-slate-50 border-slate-200 hover:border-sky-500'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      {isUploadingAudio ? (
                        <CircleNotch size={16} className="animate-spin text-sky-400" />
                      ) : (
                        <UploadSimple size={16} className="text-sky-400" />
                      )}
                      <span>{audioFileName ? `Selecionado: ${audioFileName}` : 'Selecionar Gravação MP3/WAV (Máx 15MB)'}</span>
                    </div>
                    <input 
                      type="file" 
                      accept="audio/*,.mp3,.wav,.m4a,.ogg" 
                      onChange={handleFileUpload} 
                      disabled={isUploadingAudio}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {evalCallLink && (
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-bold text-sky-400 block">Pré-visualização da Gravação do QA:</span>
                  <CustomAudioPlayer
                    src={evalCallLink}
                    expiresAt={evalCallExpiresAt}
                    theme={theme}
                  />
                </div>
              )}

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

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Feedback Detalhado / Observações do Monitor *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Escreva pontos de melhoria observados e elogios técnicos..."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border outline-none text-xs resize-none transition-all placeholder:text-slate-500/60 focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* FICHA ESTRUTURADA DE DIAGNÓSTICO DO ATENDIMENTO (OPCIONAL) */}
              <div className={`p-4 rounded-2xl border space-y-4 ${
                theme === 'dark' ? 'bg-slate-950/60 border-amber-500/20' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Diagnóstico da Ficha de Monitoria (Campos Estruturados)</h4>
                </div>

                {/* Valor Recuperado & Categoria Customizável */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Valor Recuperado */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Recuperado R$ (Opcional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 101286.00"
                      value={evalRecoveredAmount}
                      onChange={(e) => setEvalRecoveredAmount(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Rótulo da Categoria (Ex: Perfil de atraso) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Categoria (Editável)</label>
                    <input
                      type="text"
                      placeholder="Ex: Perfil de atraso"
                      value={evalDelayProfileLabel}
                      onChange={(e) => setEvalDelayProfileLabel(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Conteúdo / Valor (Ex: 2 a 30 dias) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Conteúdo / Descrição (Editável)</label>
                    <input
                      type="text"
                      placeholder="Ex: 2 a 30 dias ou Cartão Consignado"
                      value={evalDelayProfile}
                      onChange={(e) => setEvalDelayProfile(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Motivo Apresentado pelo Cliente */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Motivo Apresentado pelo Cliente</label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente relatou problemas de saúde e buscava uma renegociação antecipada."
                    value={evalClientReason}
                    onChange={(e) => setEvalClientReason(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Objeções para não negociar */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Objeções para Não Negociar</label>
                  <input
                    type="text"
                    placeholder="Ex: Dificuldade financeira associada ao quadro de saúde informado."
                    value={evalObjections}
                    onChange={(e) => setEvalObjections(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-xs transition-all ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Oportunidades de Melhoria (Tópicos) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Oportunidades de Melhoria (1 item por linha)</label>
                  <textarea
                    rows={3}
                    placeholder={`Ex:\nConfirmar o CPF da cliente durante a validação cadastral.\nSeguir a régua de cobrança antes de partir para contrapropostas.\nOfertar inicialmente o pagamento da parcela em atraso.`}
                    value={evalImprovementOpportunitiesText}
                    onChange={(e) => setEvalImprovementOpportunitiesText(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-xs resize-none transition-all placeholder:text-slate-500/60 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
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
