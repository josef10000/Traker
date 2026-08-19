import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  UserPlus,
  Phone,
  WhatsappLogo,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Trash,
  FileText,
  MagnifyingGlass,
  Plus,
  Eye,
  Star,
  Archive,
  CaretRight,
  PencilSimple,
  Copy,
  Link,
  Users,
  Funnel,
  Sparkle,
  X,
  Buildings
} from '@phosphor-icons/react';
import { UserProfile, Team, JobOpening, Candidate, CandidateStage } from '../../types';

interface RecruitmentManagementSubTabProps {
  theme: 'dark' | 'light';
  profile: UserProfile;
  managedTeamsData: Team[];
  teamMembers: UserProfile[];
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const DEFAULT_JOB_OPENINGS: JobOpening[] = [
  {
    id: 'job-1',
    title: 'Operador de Cobrança Ativo Jr',
    shiftStartHour: 8,
    shiftEndHour: 17,
    totalSlots: 5,
    filledSlots: 2,
    sourceChannel: 'LinkedIn & Gupy',
    status: 'open',
    salaryOffer: 1650,
    description: 'Atuação na recuperação de crédito massificado via discador automático e WhatsApp.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'job-2',
    title: 'Operador de Negociação Tarde',
    shiftStartHour: 10,
    shiftEndHour: 19,
    totalSlots: 3,
    filledSlots: 1,
    sourceChannel: 'Indicação Interna',
    status: 'open',
    salaryOffer: 1720,
    description: 'Foco em carteiras de alta complexidade e clientes com acordos quebrados.',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_CANDIDATES: Candidate[] = [
  {
    id: 'cand-1',
    jobOpeningId: 'job-1',
    fullName: 'Lucas Fernandes Ribeiro',
    phone: '11988887777',
    email: 'lucas.fernandes@gmail.com',
    sourceChannel: 'LinkedIn',
    resumeText: '3 anos de experiência em call center ativo de cobrança, boa dicção, facilidade com sistemas de CRM e metas diárias. Passagens por assessorias de recuperação e carteiras bancárias.',
    stage: 'interview_scheduled',
    contactNotes: 'Entrou em contato no dia anterior, muito comunicativo e interessado no turno da manhã.',
    interviewDate: new Date(Date.now() + 1000 * 60 * 25).toISOString().slice(0, 16), // daqui 25 min
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cand-2',
    jobOpeningId: 'job-1',
    fullName: 'Mariana Costa Silva',
    phone: '11977776666',
    email: 'mariana.costa@outlook.com',
    sourceChannel: 'Indicação Interna',
    resumeText: 'Experiência em negociação bancária e retenção de clientes. Conhecimento em pacote Office e discadores automáticos.',
    stage: 'contacted',
    contactNotes: 'Contato inicial via WhatsApp realizado, aguardando confirmação de horário de entrevista.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cand-3',
    jobOpeningId: 'job-2',
    fullName: 'Bruno Martins de Souza',
    phone: '11966665555',
    email: 'bruno.martins@yahoo.com.br',
    sourceChannel: 'Gupy',
    resumeText: 'Atuou 1 ano e meio com cobrança amigável de cartões de crédito. Pontual, comunicativo e focado em metas de recuperação.',
    stage: 'applied',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const RecruitmentManagementSubTab: React.FC<RecruitmentManagementSubTabProps> = ({
  theme,
  profile,
  managedTeamsData,
  teamMembers,
  showToast
}) => {
  const isDark = theme === 'dark';

  // 1. Estados de Dados
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>(() => {
    const saved = localStorage.getItem('noverde_recruitment_openings');
    return saved ? JSON.parse(saved) : DEFAULT_JOB_OPENINGS;
  });

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const saved = localStorage.getItem('noverde_recruitment_candidates');
    return saved ? JSON.parse(saved) : DEFAULT_CANDIDATES;
  });

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem('noverde_recruitment_openings', JSON.stringify(jobOpenings));
  }, [jobOpenings]);

  useEffect(() => {
    localStorage.setItem('noverde_recruitment_candidates', JSON.stringify(candidates));
  }, [candidates]);

  // 2. Filtros e Busca
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<CandidateStage | 'all'>('all');
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [showTalentPoolOnly, setShowTalentPoolOnly] = useState<boolean>(false);

  // 3. Modais e Drawers
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [newCandidateModalOpen, setNewCandidateModalOpen] = useState(false);
  const [selectedCandidateForDrawer, setSelectedCandidateForDrawer] = useState<Candidate | null>(null);
  const [scheduleInterviewModal, setScheduleInterviewModal] = useState<Candidate | null>(null);
  const [interviewDateTime, setInterviewDateTime] = useState('');
  
  // Modal de Aprovação / Geração de Convite
  const [approveModal, setApproveModal] = useState<Candidate | null>(null);
  const [selectedApproveTeamId, setSelectedApproveTeamId] = useState<string>(managedTeamsData[0]?.id || '');
  const [approveStartDate, setApproveStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  // Modal de Reprovação / Decisão
  const [rejectionModal, setRejectionModal] = useState<Candidate | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Formulário Nova Vaga
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobSlots, setNewJobSlots] = useState<number>(1);
  const [newJobShiftStart, setNewJobShiftStart] = useState<number>(8);
  const [newJobShiftEnd, setNewJobShiftEnd] = useState<number>(17);
  const [newJobSource, setNewJobSource] = useState('LinkedIn');
  const [newJobSalary, setNewJobSalary] = useState<string>('1650');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [newJobTeamId, setNewJobTeamId] = useState(managedTeamsData[0]?.id || '');

  // Formulário Novo Candidato
  const [newCandName, setNewCandName] = useState('');
  const [newCandPhone, setNewCandPhone] = useState('');
  const [newCandEmail, setNewCandEmail] = useState('');
  const [newCandJobId, setNewCandJobId] = useState<string>('');
  const [newCandSource, setNewCandSource] = useState('LinkedIn');
  const [newCandResumeText, setNewCandResumeText] = useState('');
  const [newCandResumeUrl, setNewCandResumeUrl] = useState('');

  // 4. Entrevistas Iminentes / do Dia
  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return candidates.filter(c => {
      if (c.stage !== 'interview_scheduled' || !c.interviewDate) return false;
      const intv = new Date(c.interviewDate);
      const isToday = c.interviewDate.slice(0, 10) === todayStr;
      const diffMinutes = Math.round((intv.getTime() - now.getTime()) / (1000 * 60));
      return isToday && diffMinutes >= -60 && diffMinutes <= 180;
    }).sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime());
  }, [candidates]);

  // 5. Lista Filtrada de Candidatos
  const filteredCandidates = useMemo(() => {
    let list = candidates;

    if (showTalentPoolOnly) {
      list = list.filter(c => c.stage === 'talent_pool');
    } else {
      list = list.filter(c => c.stage !== 'talent_pool');
      if (stageFilter !== 'all') {
        list = list.filter(c => c.stage === stageFilter);
      }
    }

    if (filterJobId !== 'all') {
      list = list.filter(c => c.jobOpeningId === filterJobId);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.fullName.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.resumeText && c.resumeText.toLowerCase().includes(term))
      );
    }

    return list;
  }, [candidates, showTalentPoolOnly, stageFilter, filterJobId, searchTerm]);

  // 6. Contagens por Estágio
  const stageCounts = useMemo(() => {
    const active = candidates.filter(c => c.stage !== 'talent_pool');
    return {
      all: active.length,
      applied: active.filter(c => c.stage === 'applied').length,
      contacted: active.filter(c => c.stage === 'contacted').length,
      interview_scheduled: active.filter(c => c.stage === 'interview_scheduled').length,
      approved: active.filter(c => c.stage === 'approved').length,
      rejected: active.filter(c => c.stage === 'rejected').length,
      talent_pool: candidates.filter(c => c.stage === 'talent_pool').length,
    };
  }, [candidates]);

  // Ações Rápidas
  const handleUpdateCandidateStage = (candidateId: string, newStage: CandidateStage) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        return { ...c, stage: newStage, updatedAt: new Date().toISOString() };
      }
      return c;
    }));
    showToast('Estágio do candidato atualizado!', 'info');
  };

  const handleOpenWhatsApp = (phone: string, candidateName: string, messageText?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const defaultMsg = `Olá ${candidateName}! Aqui é da Coordenação. Gostaríamos de falar sobre sua candidatura para nossa equipe.`;
    const message = encodeURIComponent(messageText || defaultMsg);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleSaveInterviewSchedule = () => {
    if (!scheduleInterviewModal || !interviewDateTime) {
      showToast('Selecione a data e horário da entrevista.', 'warning');
      return;
    }

    setCandidates(prev => prev.map(c => {
      if (c.id === scheduleInterviewModal.id) {
        return {
          ...c,
          stage: 'interview_scheduled',
          interviewDate: interviewDateTime,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    showToast(`Entrevista agendada com sucesso para ${new Date(interviewDateTime).toLocaleString('pt-BR')}!`, 'success');
    setScheduleInterviewModal(null);
    setInterviewDateTime('');
  };

  // Aprovar e Gerar Link de Convite da Equipe
  const handleConfirmApproval = () => {
    if (!approveModal) return;

    const targetTeam = managedTeamsData.find(t => t.id === selectedApproveTeamId) || managedTeamsData[0];
    const inviteToken = targetTeam?.inviteToken || targetTeam?.id || 'convite-equipe';
    const originUrl = window.location.origin;
    const generatedUrl = `${originUrl}/register?token=${inviteToken}`;

    // Atualizar candidato para aprovado
    setCandidates(prev => prev.map(c => {
      if (c.id === approveModal.id) {
        return {
          ...c,
          stage: 'approved',
          assignedTeamId: targetTeam?.id,
          startDate: approveStartDate,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    // Atualizar vagas preenchidas
    if (approveModal.jobOpeningId) {
      setJobOpenings(prev => prev.map(j => {
        if (j.id === approveModal.jobOpeningId) {
          const filled = (j.filledSlots || 0) + 1;
          return {
            ...j,
            filledSlots: filled,
            status: filled >= j.totalSlots ? 'closed' : j.status
          };
        }
        return j;
      }));
    }

    setGeneratedInviteLink(generatedUrl);
    showToast(`🎉 ${approveModal.fullName} foi aprovado para a equipe ${targetTeam?.name}!`, 'success');
  };

  const handleCopyLink = (linkToCopy: string) => {
    navigator.clipboard.writeText(linkToCopy);
    showToast('Link de cadastro copiado para a área de transferência!', 'success');
  };

  // Reprovação / Descarte
  const handleExecuteRejection = (action: 'talent_pool' | 'delete') => {
    if (!rejectionModal) return;

    if (action === 'delete') {
      setCandidates(prev => prev.filter(c => c.id !== rejectionModal.id));
      showToast('Candidato removido definitivamente.', 'info');
    } else {
      setCandidates(prev => prev.map(c => {
        if (c.id === rejectionModal.id) {
          return {
            ...c,
            stage: 'talent_pool',
            isTalentPool: true,
            rejectionReason: rejectionReason || 'Guardado para futuras vagas',
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      }));
      showToast('Candidato arquivado no Banco de Talentos!', 'success');
    }

    setRejectionModal(null);
    setRejectionReason('');
  };

  const handleCreateJobOpening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) {
      showToast('Informe o título da vaga.', 'warning');
      return;
    }

    const newJob: JobOpening = {
      id: `job-${Date.now()}`,
      title: newJobTitle.trim(),
      teamId: newJobTeamId,
      shiftStartHour: newJobShiftStart,
      shiftEndHour: newJobShiftEnd,
      totalSlots: Number(newJobSlots) || 1,
      filledSlots: 0,
      sourceChannel: newJobSource,
      salaryOffer: Number(newJobSalary) || 0,
      description: newJobDescription,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    setJobOpenings(prev => [newJob, ...prev]);
    showToast('Nova vaga aberta com sucesso!', 'success');
    setNewJobModalOpen(false);
    setNewJobTitle('');
    setNewJobDescription('');
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim() || !newCandPhone.trim()) {
      showToast('Nome e telefone são obrigatórios.', 'warning');
      return;
    }

    const newCandidate: Candidate = {
      id: `cand-${Date.now()}`,
      fullName: newCandName.trim(),
      phone: newCandPhone.trim(),
      email: newCandEmail.trim() || undefined,
      jobOpeningId: newCandJobId || undefined,
      sourceChannel: newCandSource,
      resumeText: newCandResumeText.trim() || undefined,
      resumeUrl: newCandResumeUrl.trim() || undefined,
      stage: 'applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCandidates(prev => [newCandidate, ...prev]);
    showToast('Candidato cadastrado com sucesso!', 'success');
    setNewCandidateModalOpen(false);
    setNewCandName('');
    setNewCandPhone('');
    setNewCandEmail('');
    setNewCandResumeText('');
    setNewCandResumeUrl('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. HEADER DO COCKPIT DE RECRUTAMENTO */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg">
              <Briefcase size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Cockpit de Recrutamento & Seleção</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest flex items-center gap-1">
                  <Star size={12} weight="fill" />
                  Coordenação
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Gestão centralizada de vagas, candidatos, currículos, agendamentos de entrevista e admissão na equipe.
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO PRINCIPAL */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setNewCandidateModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <UserPlus size={18} weight="bold" />
              <span>Cadastrar Candidato</span>
            </button>

            <button
              onClick={() => setNewJobModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={18} weight="bold" />
              <span>Abrir Nova Vaga</span>
            </button>
          </div>
        </div>

        {/* 2. ALERTA DE ENTREVISTAS DO DIA */}
        {upcomingInterviews.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                <Clock size={24} weight="fill" />
              </div>
              <div>
                <span className="text-xs font-black text-purple-200 uppercase tracking-wider block">
                  ⏰ Entrevistas Agendadas para Hoje ({upcomingInterviews.length})
                </span>
                <span className="text-xs text-purple-300 font-medium">
                  Próxima: <strong>{upcomingInterviews[0].fullName}</strong> às <strong>{new Date(upcomingInterviews[0].interviewDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenWhatsApp(upcomingInterviews[0].phone, upcomingInterviews[0].fullName, `Olá ${upcomingInterviews[0].fullName}! Confirmando nossa entrevista de hoje às ${new Date(upcomingInterviews[0].interviewDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h.`)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                <WhatsappLogo size={16} weight="fill" />
                <span>Confirmar no WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. CARDS DE VAGAS EM ABERTO (AMPLOS E ESPAÇOSOS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Buildings size={18} className="text-indigo-400" />
            <span>Vagas em Aberto ({jobOpenings.length})</span>
          </h3>
          {filterJobId !== 'all' && (
            <button
              onClick={() => setFilterJobId('all')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
            >
              Limpar filtro de vaga
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobOpenings.map(job => {
            const team = managedTeamsData.find(t => t.id === job.teamId);
            const candidatesInJob = candidates.filter(c => c.jobOpeningId === job.id && c.stage !== 'talent_pool');
            const percentFilled = Math.min(100, Math.round((job.filledSlots / job.totalSlots) * 100));
            const isSelectedFilter = filterJobId === job.id;

            return (
              <div 
                key={job.id}
                onClick={() => setFilterJobId(isSelectedFilter ? 'all' : job.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-lg relative group ${
                  isSelectedFilter
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/30'
                    : isDark ? 'bg-slate-900/70 border-white/10 hover:border-white/20' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      job.status === 'open' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {job.status === 'open' ? '🟢 Vaga Aberta' : '⚪ Encerrada'}
                    </span>
                    <h4 className="text-base font-black text-white mt-2 group-hover:text-indigo-300 transition-colors">
                      {job.title}
                    </h4>
                    <span className="text-xs text-slate-400 font-medium block mt-0.5">
                      👥 Equipe: <strong className="text-slate-300">{team?.name || 'Geral'}</strong>
                    </span>
                  </div>

                  <div className="text-right font-mono bg-slate-950 px-3 py-2 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Preenchimento</span>
                    <span className="text-base font-black text-indigo-400">
                      {job.filledSlots} / {job.totalSlots}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>{job.filledSlots} contratados de {job.totalSlots} vagas</span>
                    <span className="text-indigo-300">{percentFilled}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all"
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                </div>

                {/* Metadados da Vaga */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>⏰ Turno: <strong>{job.shiftStartHour}h-{job.shiftEndHour}h</strong></span>
                  <span>💰 Base: <strong>R$ {job.salaryOffer?.toLocaleString('pt-BR') || 'A combinar'}</strong></span>
                </div>

                <div className="mt-3 text-right">
                  <span className="text-[11px] font-bold text-indigo-400 group-hover:underline">
                    {isSelectedFilter ? '✓ Filtrando esta vaga' : `Ver ${candidatesInJob.length} candidatos inscritos →`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. LISTA ESTRUTURADA DE CANDIDATOS (SUBSTITUI O KANBAN) */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* BARRA DE CONTROLE & PÍLULAS DE FILTRO */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users size={22} className="text-sky-400" />
              <h3 className="text-lg font-black tracking-tight">
                {showTalentPoolOnly ? 'Banco de Talentos Guardados' : 'Candidatos no Processo Seletivo'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-800 text-slate-300 font-mono">
                {filteredCandidates.length}
              </span>
            </div>

            {/* Campo de Busca Amplo */}
            <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3.5 py-2 rounded-2xl text-xs w-full md:w-80">
              <MagnifyingGlass size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-white placeholder:text-slate-500 focus:outline-none w-full text-xs"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-white cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Pílulas de Filtro Grandes e Confortáveis */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
            <button
              onClick={() => {
                setShowTalentPoolOnly(false);
                setStageFilter('all');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                !showTalentPoolOnly && stageFilter === 'all'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Todos Ativos ({stageCounts.all})
            </button>

            <button
              onClick={() => {
                setShowTalentPoolOnly(false);
                setStageFilter('applied');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                !showTalentPoolOnly && stageFilter === 'applied'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              📥 Inscritos ({stageCounts.applied})
            </button>

            <button
              onClick={() => {
                setShowTalentPoolOnly(false);
                setStageFilter('contacted');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                !showTalentPoolOnly && stageFilter === 'contacted'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              📞 Em Contato ({stageCounts.contacted})
            </button>

            <button
              onClick={() => {
                setShowTalentPoolOnly(false);
                setStageFilter('interview_scheduled');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                !showTalentPoolOnly && stageFilter === 'interview_scheduled'
                  ? 'bg-purple-500 text-white font-black shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              🗣️ Entrevistas Agendadas ({stageCounts.interview_scheduled})
            </button>

            <button
              onClick={() => {
                setShowTalentPoolOnly(false);
                setStageFilter('approved');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                !showTalentPoolOnly && stageFilter === 'approved'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              ⭐ Aprovados ({stageCounts.approved})
            </button>

            <button
              onClick={() => setShowTalentPoolOnly(true)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showTalentPoolOnly
                  ? 'bg-purple-600 text-white font-black shadow-md'
                  : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20'
              }`}
            >
              <Archive size={14} weight="bold" />
              <span>Banco de Talentos ({stageCounts.talent_pool})</span>
            </button>
          </div>
        </div>

        {/* TABELA DE LINHAS ESPAÇOSAS DE CANDIDATOS */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-white/10 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                <th className="py-3.5 px-4 min-w-[240px]">Candidato</th>
                <th className="py-3.5 px-4 min-w-[180px]">Vaga & Origem</th>
                <th className="py-3.5 px-4 min-w-[160px]">Contato & WhatsApp</th>
                <th className="py-3.5 px-4 min-w-[160px]">Currículo</th>
                <th className="py-3.5 px-4 min-w-[160px]">Entrevista</th>
                <th className="py-3.5 px-4 min-w-[180px]">Estágio</th>
                <th className="py-3.5 px-4 text-right min-w-[160px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 font-medium">
                    Nenhum candidato encontrado neste filtro.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(cand => {
                  const job = jobOpenings.find(j => j.id === cand.jobOpeningId);
                  const isInterviewToday = cand.interviewDate && cand.interviewDate.slice(0, 10) === new Date().toISOString().slice(0, 10);

                  return (
                    <tr 
                      key={cand.id}
                      className="hover:bg-indigo-500/5 transition-colors group"
                    >
                      {/* Candidato: Avatar & Nome */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black text-sm shrink-0">
                            {cand.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm font-black text-white block group-hover:text-indigo-300 transition-colors">
                              {cand.fullName}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {cand.email || 'Sem e-mail informado'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Vaga & Origem */}
                      <td className="py-4 px-4">
                        <span className="text-xs font-bold text-slate-200 block">
                          💼 {job?.title || 'Vaga Geral'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-950 px-2 py-0.5 rounded-md border border-white/5 inline-block mt-1">
                          🌐 {cand.sourceChannel}
                        </span>
                      </td>

                      {/* Contato & WhatsApp */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                          <span>{cand.phone}</span>
                          <button
                            onClick={() => handleOpenWhatsApp(cand.phone, cand.fullName, `Olá ${cand.fullName}! Vimos sua candidatura para ${job?.title || 'a vaga'} e gostaríamos de conversar.`)}
                            className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 cursor-pointer transition-all"
                            title="Conversar no WhatsApp"
                          >
                            <WhatsappLogo size={16} weight="fill" />
                          </button>
                        </div>
                      </td>

                      {/* Currículo */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedCandidateForDrawer(cand)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <FileText size={15} className="text-indigo-400" />
                          <span>Ver Currículo</span>
                        </button>
                      </td>

                      {/* Entrevista */}
                      <td className="py-4 px-4">
                        {cand.stage === 'interview_scheduled' && cand.interviewDate ? (
                          <div className={`p-2 rounded-xl text-xs font-mono font-bold inline-flex items-center gap-1.5 ${
                            isInterviewToday
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                              : 'bg-slate-950 text-slate-300 border border-white/10'
                          }`}>
                            <Calendar size={14} className="text-purple-400" />
                            <span>{new Date(cand.interviewDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}h</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setScheduleInterviewModal(cand);
                              setInterviewDateTime(cand.interviewDate || '');
                            }}
                            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar size={14} />
                            <span>Agendar Horário</span>
                          </button>
                        )}
                      </td>

                      {/* Seletor Direto de Estágio */}
                      <td className="py-4 px-4">
                        <select
                          value={cand.stage}
                          onChange={(e) => handleUpdateCandidateStage(cand.id, e.target.value as CandidateStage)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none ${
                            cand.stage === 'approved'
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                              : cand.stage === 'interview_scheduled'
                              ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                              : cand.stage === 'contacted'
                              ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                              : cand.stage === 'talent_pool'
                              ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                              : cand.stage === 'rejected'
                              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                              : 'bg-slate-950 text-slate-300 border-white/10'
                          }`}
                        >
                          <option value="applied">📥 Triagem</option>
                          <option value="contacted">📞 Em Contato</option>
                          <option value="interview_scheduled">🗣️ Entrevista Agendada</option>
                          <option value="approved">⭐ Aprovado (Contratado)</option>
                          <option value="talent_pool">🗄️ Banco de Talentos</option>
                          <option value="rejected">❌ Reprovado / Desistiu</option>
                        </select>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cand.stage !== 'approved' && (
                            <button
                              onClick={() => {
                                setApproveModal(cand);
                                setSelectedApproveTeamId(job?.teamId || managedTeamsData[0]?.id || '');
                                setGeneratedInviteLink(null);
                              }}
                              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                              title="Aprovar e Gerar Convite de Equipe"
                            >
                              <Star size={14} weight="bold" />
                              <span>Aprovar</span>
                            </button>
                          )}

                          {cand.stage !== 'rejected' && cand.stage !== 'talent_pool' && (
                            <button
                              onClick={() => setRejectionModal(cand)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer"
                              title="Descartar / Guardar no Banco de Talentos"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DRAWER LATERAL AMPLO DE CURRÍCULO E FICHA DO CANDIDATO */}
      {selectedCandidateForDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-white/10 text-white h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xl">
                  {selectedCandidateForDrawer.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedCandidateForDrawer.fullName}</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedCandidateForDrawer.phone} • {selectedCandidateForDrawer.email || 'Sem e-mail'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidateForDrawer(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Origem e Dados Principais */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Origem da Inscrição</span>
                <span className="text-sm font-bold text-sky-400">{selectedCandidateForDrawer.sourceChannel}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Vaga Vinculada</span>
                <span className="text-sm font-bold text-indigo-400">
                  {jobOpenings.find(j => j.id === selectedCandidateForDrawer.jobOpeningId)?.title || 'Geral'}
                </span>
              </div>
            </div>

            {/* RESUMO DO CURRÍCULO (LEITURA AMPLA E CONFORTÁVEL) */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-2">
                <FileText size={18} />
                <span>Currículo & Experiências Prévias</span>
              </h4>
              <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 text-xs text-slate-200 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-sans">
                {selectedCandidateForDrawer.resumeText || 'Nenhum resumo profissional cadastrado.'}
              </div>
            </div>

            {/* Link para o PDF / Arquivo */}
            {selectedCandidateForDrawer.resumeUrl && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-200 block">Arquivo de Currículo Anexado</span>
                  <span className="text-[11px] text-indigo-400 truncate max-w-sm block">{selectedCandidateForDrawer.resumeUrl}</span>
                </div>
                <a
                  href={selectedCandidateForDrawer.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Eye size={16} />
                  <span>Abrir Documento</span>
                </a>
              </div>
            )}

            {/* Histórico / Anotações de Contato */}
            {selectedCandidateForDrawer.contactNotes && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                  Anotações da Entrevista / Contato:
                </span>
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 text-xs text-slate-300">
                  {selectedCandidateForDrawer.contactNotes}
                </div>
              </div>
            )}

            {/* Ações do Drawer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleOpenWhatsApp(selectedCandidateForDrawer.phone, selectedCandidateForDrawer.fullName)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <WhatsappLogo size={18} weight="fill" />
                <span>Conversar no WhatsApp</span>
              </button>

              <button
                onClick={() => setSelectedCandidateForDrawer(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE APROVAÇÃO & GERAÇÃO DO LINK DE CONVITE DA EQUIPE */}
      {approveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Star size={26} weight="fill" />
                <h3 className="text-base font-black text-white">Aprovação & Convite da Equipe</h3>
              </div>
              <button 
                onClick={() => {
                  setApproveModal(null);
                  setGeneratedInviteLink(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
              🎉 <strong>{approveModal.fullName}</strong> foi aprovado! Defina a equipe de destino e a data de admissão para gerar o link de cadastro da equipe.
            </div>

            {!generatedInviteLink ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-300 uppercase tracking-wider block mb-1">Equipe de Destino:</label>
                  <select
                    value={selectedApproveTeamId}
                    onChange={(e) => setSelectedApproveTeamId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl font-bold bg-slate-950 border border-white/10 text-white focus:outline-none"
                  >
                    {managedTeamsData.map(t => (
                      <option key={t.id} value={t.id}>👥 {t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 uppercase tracking-wider block mb-1">Data Prevista de Início (Admissão):</label>
                  <input
                    type="date"
                    value={approveStartDate}
                    onChange={(e) => setApproveStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl font-mono font-bold bg-slate-950 border border-white/10 text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setApproveModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmApproval}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>Confirmar & Gerar Link de Convite</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    🔗 Link Oficial de Cadastro para o Novo Colaborador:
                  </span>
                  <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-white/5 font-mono text-[11px] text-emerald-300 break-all">
                    <span>{generatedInviteLink}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs">
                  💡 No 1º dia (ou quando o e-mail oficial da empresa for criado pelo TI), basta o colaborador acessar esse link para criar sua conta. Ele entrará automaticamente na equipe correta e na rampa de Onboarding!
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(generatedInviteLink)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={16} />
                    <span>Copiar Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(approveModal.phone, approveModal.fullName, `Parabéns ${approveModal.fullName}! Sua contratação foi confirmada. Segue o link para seu primeiro acesso no sistema com a data de início em ${new Date(approveStartDate + 'T12:00:00').toLocaleDateString('pt-BR')}: ${generatedInviteLink}`)}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <WhatsappLogo size={16} weight="fill" />
                    <span>Enviar Link no WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL DE AGENDAMENTO DE ENTREVISTA */}
      {scheduleInterviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Calendar size={24} weight="bold" />
                <h3 className="text-base font-black text-white">Agendar Entrevista</h3>
              </div>
              <button 
                onClick={() => setScheduleInterviewModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400">Candidato:</span>
              <h4 className="text-sm font-black text-white">{scheduleInterviewModal.fullName}</h4>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Data e Horário da Entrevista:</label>
              <input
                type="datetime-local"
                value={interviewDateTime}
                onChange={(e) => setInterviewDateTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-slate-950 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                💡 O painel avisará automaticamente com destaque quando estiver próximo do horário.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScheduleInterviewModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveInterviewSchedule}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                <CheckCircle size={16} weight="bold" />
                <span>Salvar Agendamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL DE REPROVAÇÃO / BANCO DE TALENTOS */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <XCircle size={24} weight="bold" />
                <h3 className="text-base font-black text-white">Reprovação / Descarte</h3>
              </div>
              <button 
                onClick={() => setRejectionModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400">Candidato:</span>
              <h4 className="text-sm font-black text-white">{rejectionModal.fullName}</h4>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Motivo do Descarte / Feedback:</label>
              <textarea
                rows={2}
                placeholder="Ex: Pretensão salarial acima da faixa, falta de experiência prévia, desistência..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-white/10 text-white focus:outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">Escolha o destino deste cadastro:</label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleExecuteRejection('talent_pool')}
                  className="p-3.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all"
                >
                  <Archive size={22} weight="fill" />
                  <span>Guardar no Banco de Talentos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteRejection('delete')}
                  className="p-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all"
                >
                  <Trash size={22} weight="fill" />
                  <span>Excluir Definitivamente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL CADASTRO DE NOVO CANDIDATO */}
      {newCandidateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sky-400">
                <UserPlus size={22} weight="bold" />
                <h3 className="text-base font-black text-white">Cadastrar Novo Candidato</h3>
              </div>
              <button onClick={() => setNewCandidateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do candidato"
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Telefone (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    placeholder="11999998888"
                    value={newCandPhone}
                    onChange={(e) => setNewCandPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">E-mail (Pessoal)</label>
                  <input
                    type="email"
                    placeholder="candidato@email.com"
                    value={newCandEmail}
                    onChange={(e) => setNewCandEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Vaga Pretendida</label>
                  <select
                    value={newCandJobId}
                    onChange={(e) => setNewCandJobId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none font-bold"
                  >
                    <option value="">Geral / Sem Vaga Específica</option>
                    {jobOpenings.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Onde se Inscreveu?</label>
                  <select
                    value={newCandSource}
                    onChange={(e) => setNewCandSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indicação Interna">Indicação Interna</option>
                    <option value="WhatsApp">WhatsApp Direto</option>
                    <option value="Gupy">Gupy / Vagas.com</option>
                    <option value="InfoJobs">InfoJobs</option>
                    <option value="Outro">Outro Canal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-indigo-300 block mb-1">Resumo do Currículo / Experiência</label>
                <textarea
                  rows={3}
                  placeholder="Cole aqui o resumo profissional, tempo de experiência em cobrança, empresas anteriores..."
                  value={newCandResumeText}
                  onChange={(e) => setNewCandResumeText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Link do Currículo (PDF / Google Drive)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={newCandResumeUrl}
                  onChange={(e) => setNewCandResumeUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewCandidateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold cursor-pointer"
                >
                  Cadastrar Candidato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL ABERTURA DE NOVA VAGA */}
      {newJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Briefcase size={22} weight="bold" />
                <h3 className="text-base font-black text-white">Abrir Nova Vaga</h3>
              </div>
              <button onClick={() => setNewJobModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJobOpening} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Título da Vaga *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Operador de Cobrança Jr - Manhã"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Equipe de Destino</label>
                  <select
                    value={newJobTeamId}
                    onChange={(e) => setNewJobTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none font-bold"
                  >
                    {managedTeamsData.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Total de Posições (Vagas)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newJobSlots}
                    onChange={(e) => setNewJobSlots(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Turno (Início - Fim)</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min={6}
                      max={22}
                      value={newJobShiftStart}
                      onChange={(e) => setNewJobShiftStart(Number(e.target.value))}
                      className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-center"
                    />
                    <span>às</span>
                    <input
                      type="number"
                      min={6}
                      max={22}
                      value={newJobShiftEnd}
                      onChange={(e) => setNewJobShiftEnd(Number(e.target.value))}
                      className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Salário Base (R$)</label>
                  <input
                    type="number"
                    value={newJobSalary}
                    onChange={(e) => setNewJobSalary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Descrição / Requisitos</label>
                <textarea
                  rows={2}
                  placeholder="Principais responsabilidades, requisitos e perfil desejado..."
                  value={newJobDescription}
                  onChange={(e) => setNewJobDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold cursor-pointer"
                >
                  Criar Vaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
