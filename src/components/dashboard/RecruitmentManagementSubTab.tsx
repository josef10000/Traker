import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
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
  ArrowsLeftRight,
  Sparkle,
  Eye,
  Star,
  WarningCircle,
  Archive,
  ShareNetwork,
  CaretRight,
  ChatCircleText,
  PencilSimple,
  X
} from '@phosphor-icons/react';
import { UserProfile, Team, JobOpening, Candidate, CandidateStage } from '../../types';
import { sandboxService } from '../../lib/sandboxService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface RecruitmentManagementSubTabProps {
  theme: 'dark' | 'light';
  profile: UserProfile;
  managedTeamsData: Team[];
  teamMembers: UserProfile[];
  onRefreshTeamMembers?: () => void;
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
    resumeText: '3 anos de experiência em call center ativo de cobrança, boa dicção, facilidade com sistemas de CRM e metas diárias.',
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
    resumeText: 'Experiência em negociação bancária e retenção de clientes. Conhecimento em pacote Office e discadores.',
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
    resumeText: 'Atuou 1 ano e meio com cobrança amigável de cartões de crédito. Pontual e focado em metas.',
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
  onRefreshTeamMembers,
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

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('noverde_recruitment_openings', JSON.stringify(jobOpenings));
  }, [jobOpenings]);

  useEffect(() => {
    localStorage.setItem('noverde_recruitment_candidates', JSON.stringify(candidates));
  }, [candidates]);

  // 2. Modos de Visualização & Filtros
  const [activeView, setActiveView] = useState<'funnel' | 'jobs' | 'talent_pool'>('funnel');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterJobId, setFilterJobId] = useState<string>('all');

  // 3. Modais
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [newCandidateModalOpen, setNewCandidateModalOpen] = useState(false);
  const [viewCandidateModal, setViewCandidateModal] = useState<Candidate | null>(null);
  const [scheduleInterviewModal, setScheduleInterviewModal] = useState<Candidate | null>(null);
  const [interviewDateTime, setInterviewDateTime] = useState('');
  
  // Modal de Efetivação / Onboarding
  const [approveOnboardingModal, setApproveOnboardingModal] = useState<Candidate | null>(null);
  const [selectedOnboardingTeamId, setSelectedOnboardingTeamId] = useState<string>(managedTeamsData[0]?.id || '');
  const [selectedOnboardingSupervisorId, setSelectedOnboardingSupervisorId] = useState<string>('');
  const [onboardingStartDate, setOnboardingStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Modal de Reprovação / Descarte
  const [rejectionModal, setRejectionModal] = useState<Candidate | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Formulário de Nova Vaga
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobSlots, setNewJobSlots] = useState<number>(1);
  const [newJobShiftStart, setNewJobShiftStart] = useState<number>(8);
  const [newJobShiftEnd, setNewJobShiftEnd] = useState<number>(17);
  const [newJobSource, setNewJobSource] = useState('LinkedIn');
  const [newJobSalary, setNewJobSalary] = useState<string>('1650');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [newJobTeamId, setNewJobTeamId] = useState(managedTeamsData[0]?.id || '');

  // Formulário de Novo Candidato
  const [newCandName, setNewCandName] = useState('');
  const [newCandPhone, setNewCandPhone] = useState('');
  const [newCandEmail, setNewCandEmail] = useState('');
  const [newCandJobId, setNewCandJobId] = useState<string>('');
  const [newCandSource, setNewCandSource] = useState('LinkedIn');
  const [newCandResumeText, setNewCandResumeText] = useState('');
  const [newCandResumeUrl, setNewCandResumeUrl] = useState('');

  // 4. Verificação em tempo real de entrevistas iminentes (Próximas 2 horas ou hoje)
  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return candidates.filter(c => {
      if (c.stage !== 'interview_scheduled' || !c.interviewDate) return false;
      const intv = new Date(c.interviewDate);
      const isToday = c.interviewDate.slice(0, 10) === todayStr;
      const diffMinutes = Math.round((intv.getTime() - now.getTime()) / (1000 * 60));
      return isToday && diffMinutes >= -60 && diffMinutes <= 180; // Entre 1h atrás e 3h à frente
    }).sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime());
  }, [candidates]);

  // 5. Filtragem de Candidatos
  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (activeView === 'talent_pool') {
      list = list.filter(c => c.stage === 'talent_pool');
    } else {
      list = list.filter(c => c.stage !== 'talent_pool');
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
  }, [candidates, activeView, filterJobId, searchTerm]);

  // 6. Colunas do Funil
  const STAGES: { id: CandidateStage; label: string; icon: any; color: string; badgeBg: string }[] = [
    { id: 'applied', label: 'Inscrito / Triagem', icon: Users, color: 'text-sky-400', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    { id: 'contacted', label: 'Contato Realizado', icon: Phone, color: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'interview_scheduled', label: 'Entrevista Agendada', icon: Calendar, color: 'text-purple-400', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'approved', label: 'Aprovado (Contratado)', icon: CheckCircle, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'rejected', label: 'Reprovado / Desistiu', icon: XCircle, color: 'text-rose-400', badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  ];

  // Ações de Mudança de Estágio
  const handleUpdateCandidateStage = (candidateId: string, newStage: CandidateStage) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        return { ...c, stage: newStage, updatedAt: new Date().toISOString() };
      }
      return c;
    }));
    showToast('Estágio do candidato atualizado!', 'info');
  };

  // Abrir WhatsApp
  const handleOpenWhatsApp = (phone: string, candidateName: string, jobTitle?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(`Olá ${candidateName}! Aqui é da Coordenação. Vimos sua candidatura para a vaga de ${jobTitle || 'Cobrança'} e gostaríamos de alinhar os próximos passos.`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  // Salvar Agendamento de Entrevista
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

    showToast(`Entrevista agendada para ${new Date(interviewDateTime).toLocaleString('pt-BR')}!`, 'success');
    setScheduleInterviewModal(null);
    setInterviewDateTime('');
  };

  // Efetivar no Onboarding
  const handleExecuteApproveOnboarding = () => {
    if (!approveOnboardingModal) return;

    const targetTeam = managedTeamsData.find(t => t.id === selectedOnboardingTeamId) || managedTeamsData[0];
    const generatedUid = `user-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Criar perfil de usuário
    const newMemberProfile: Partial<UserProfile> = {
      uid: generatedUid,
      displayName: approveOnboardingModal.fullName,
      email: approveOnboardingModal.email || `${approveOnboardingModal.fullName.toLowerCase().replace(/\s+/g, '.')}@operacao.com`,
      role: 'member',
      teamId: targetTeam?.id || '',
      startDate: onboardingStartDate,
      createdAt: nowIso,
      onboardingChecklist: {
        'Apresentação da Cultura & Regras': true,
        'Treinamento de Script de Cobrança': false,
        'Treinamento no Discador e CRM': false,
        'Primeiro Feedback com Supervisor': false
      }
    };

    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateUser(generatedUid, newMemberProfile as any);
      } else {
        setDoc(doc(db, 'users', generatedUid), newMemberProfile);
      }
      if (onRefreshTeamMembers) onRefreshTeamMembers();
    } catch (e) {
      console.error('Erro ao criar usuário no Onboarding:', e);
    }

    // 2. Atualizar status do candidato
    setCandidates(prev => prev.map(c => {
      if (c.id === approveOnboardingModal.id) {
        return {
          ...c,
          stage: 'approved',
          graduatedToOnboardingAt: nowIso,
          assignedTeamId: targetTeam?.id,
          assignedSupervisorId: selectedOnboardingSupervisorId,
          startDate: onboardingStartDate,
          updatedAt: nowIso
        };
      }
      return c;
    }));

    // 3. Atualizar vagas preenchidas da vaga
    if (approveOnboardingModal.jobOpeningId) {
      setJobOpenings(prev => prev.map(j => {
        if (j.id === approveOnboardingModal.jobOpeningId) {
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

    showToast(`🎉 ${approveOnboardingModal.fullName} foi efetivado e integrado à aba Onboarding!`, 'success');
    setApproveOnboardingModal(null);
  };

  // Reprovação: Decisão entre Banco de Talentos ou Exclusão
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
            rejectionReason: rejectionReason || 'Perfil interessante para futuras oportunidades',
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      }));
      showToast('Candidato guardado no Banco de Talentos!', 'success');
    }

    setRejectionModal(null);
    setRejectionReason('');
  };

  // Criar Nova Vaga
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
    showToast('Nova vaga cadastrada com sucesso!', 'success');
    setNewJobModalOpen(false);
    setNewJobTitle('');
    setNewJobDescription('');
  };

  // Criar Novo Candidato
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
      {/* 1. HEADER DO MÓDULO DE RECRUTAMENTO */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
        isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg">
              <Briefcase size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Recrutamento & Seleção (ATS Operacional)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest flex items-center gap-1">
                  <Star size={12} weight="fill" />
                  Coordenação
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Acompanhe o funil de contratação, currículos, agendamentos de entrevista e efetivação direta no Onboarding.
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO DO TOPO */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setNewCandidateModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <UserPlus size={16} weight="bold" />
              <span>Novo Candidato</span>
            </button>

            <button
              onClick={() => setNewJobModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} weight="bold" />
              <span>Abrir Nova Vaga</span>
            </button>
          </div>
        </div>

        {/* 2. ALERTA DE ENTREVISTAS IMINENTES / DO DIA */}
        {upcomingInterviews.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Clock size={20} weight="fill" />
              </div>
              <div>
                <span className="text-xs font-black text-purple-200 uppercase tracking-wider block">
                  ⏰ Alerta de Entrevistas Agendadas ({upcomingInterviews.length})
                </span>
                <span className="text-xs text-purple-300/80 font-medium">
                  Próxima entrevista: <strong>{upcomingInterviews[0].fullName}</strong> às <strong>{new Date(upcomingInterviews[0].interviewDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenWhatsApp(upcomingInterviews[0].phone, upcomingInterviews[0].fullName)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
              >
                <WhatsappLogo size={14} weight="fill" />
                <span>Chamar no WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. BARRA DE NAVEGAÇÃO ENTRE SUB-VISÕES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-white/10 text-xs shadow-inner">
            <button
              onClick={() => setActiveView('funnel')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'funnel' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowsLeftRight size={14} />
              <span>Funil Kanban ({candidates.filter(c => c.stage !== 'talent_pool').length})</span>
            </button>

            <button
              onClick={() => setActiveView('jobs')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'jobs' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase size={14} />
              <span>Vagas em Aberto ({jobOpenings.length})</span>
            </button>

            <button
              onClick={() => setActiveView('talent_pool')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'talent_pool' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Archive size={14} />
              <span>Banco de Talentos ({candidates.filter(c => c.stage === 'talent_pool').length})</span>
            </button>
          </div>

          {/* FILTRO DE BUSCA & VAGA */}
          {activeView !== 'jobs' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <MagnifyingGlass size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar candidato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-white placeholder:text-slate-500 focus:outline-none w-36 text-xs"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-white cursor-pointer">
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                value={filterJobId}
                onChange={(e) => setFilterJobId(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 border border-white/10 text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Vagas</option>
                {jobOpenings.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. VISÃO 1: FUNIL KANBAN DE CANDIDATOS */}
      {activeView === 'funnel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const stageCandidates = filteredCandidates.filter(c => c.stage === stage.id);
            const Icon = stage.icon;

            return (
              <div 
                key={stage.id}
                className={`flex flex-col rounded-3xl border shadow-xl p-4 transition-all min-h-[500px] ${
                  isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={stage.color} weight="bold" />
                    <span className="text-xs font-black text-white">{stage.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${stage.badgeBg}`}>
                    {stageCandidates.length}
                  </span>
                </div>

                {/* Cards dos Candidatos */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {stageCandidates.length === 0 ? (
                    <div className="py-12 text-center text-slate-600 text-xs font-medium border-2 border-dashed border-white/5 rounded-2xl">
                      Nenhum candidato
                    </div>
                  ) : (
                    stageCandidates.map(cand => {
                      const job = jobOpenings.find(j => j.id === cand.jobOpeningId);
                      const isInterviewToday = cand.interviewDate && cand.interviewDate.slice(0, 10) === new Date().toISOString().slice(0, 10);

                      return (
                        <div
                          key={cand.id}
                          className={`p-3.5 rounded-2xl border transition-all hover:scale-[1.02] shadow-lg group relative ${
                            isDark 
                              ? 'bg-slate-950/70 border-white/10 hover:border-indigo-500/40 text-white' 
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-400 text-slate-900'
                          }`}
                        >
                          {/* Badge de Entrevista Agendada */}
                          {cand.stage === 'interview_scheduled' && cand.interviewDate && (
                            <div className={`mb-2 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center justify-between ${
                              isInterviewToday 
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse' 
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              <span>📅 {new Date(cand.interviewDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}h</span>
                              {isInterviewToday && <span className="text-[8px] bg-purple-500 text-white px-1 rounded font-black">HOJE</span>}
                            </div>
                          )}

                          {/* Nome & Vaga */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                                {cand.fullName}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[170px]">
                                💼 {job?.title || 'Vaga Geral'}
                              </span>
                            </div>

                            <button
                              onClick={() => setViewCandidateModal(cand)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                              title="Ver Currículo & Detalhes"
                            >
                              <FileText size={14} />
                            </button>
                          </div>

                          {/* Origem da Inscrição */}
                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">
                              🌐 {cand.sourceChannel}
                            </span>
                            <span className="font-mono">{cand.phone}</span>
                          </div>

                          {/* BOTÕES DE AÇÃO RÁPIDA */}
                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-1.5">
                            {/* Chamar no WhatsApp */}
                            <button
                              onClick={() => handleOpenWhatsApp(cand.phone, cand.fullName, job?.title)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="Abrir conversa no WhatsApp"
                            >
                              <WhatsappLogo size={14} weight="fill" />
                              <span>Zap</span>
                            </button>

                            {/* Agendar Entrevista */}
                            <button
                              onClick={() => {
                                setScheduleInterviewModal(cand);
                                setInterviewDateTime(cand.interviewDate || '');
                              }}
                              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="Agendar horário de entrevista"
                            >
                              <Calendar size={14} />
                              <span>Agenda</span>
                            </button>

                            {/* Próximo Passo / Aprovação / Reprovação */}
                            <div className="flex items-center gap-1">
                              {cand.stage !== 'approved' && (
                                <button
                                  onClick={() => {
                                    setApproveOnboardingModal(cand);
                                    setSelectedOnboardingTeamId(job?.teamId || managedTeamsData[0]?.id || '');
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black cursor-pointer"
                                  title="Aprovar e Efetivar no Onboarding"
                                >
                                  ⭐
                                </button>
                              )}

                              {cand.stage !== 'rejected' && (
                                <button
                                  onClick={() => setRejectionModal(cand)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
                                  title="Reprovar / Banco de Talentos"
                                >
                                  ❌
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
            );
          })}
        </div>
      )}

      {/* 5. VISÃO 2: LISTA DE VAGAS EM ABERTO */}
      {activeView === 'jobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobOpenings.map(job => {
            const team = managedTeamsData.find(t => t.id === job.teamId);
            const candidatesInJob = candidates.filter(c => c.jobOpeningId === job.id);
            const percentFilled = Math.min(100, Math.round((job.filledSlots / job.totalSlots) * 100));

            return (
              <div 
                key={job.id}
                className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between transition-all ${
                  isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        job.status === 'open' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {job.status === 'open' ? '🟢 Vaga Aberta' : job.status === 'paused' ? '🟡 Pausada' : '⚪ Preenchida'}
                      </span>
                      <h3 className="text-base font-black text-white mt-2">{job.title}</h3>
                      <span className="text-xs text-slate-400 font-medium">
                        👥 Equipe: <strong>{team?.name || 'Geral'}</strong>
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs text-slate-400 block">Vagas</span>
                      <span className="text-lg font-black text-indigo-400">
                        {job.filledSlots} / {job.totalSlots}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso de Preenchimento */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>Progresso da Vaga</span>
                      <span>{percentFilled}% Preenchida</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all"
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Detalhes da Vaga */}
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-xs text-slate-300 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Turno Previsto:</span>
                      <span className="font-mono">{job.shiftStartHour}h às {job.shiftEndHour}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Canal de Captação:</span>
                      <span>{job.sourceChannel}</span>
                    </div>
                    {job.salaryOffer && job.salaryOffer > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Salário Base:</span>
                        <span className="font-mono text-emerald-400 font-bold">R$ {job.salaryOffer.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {job.description && (
                      <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                        {job.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {candidatesInJob.length} candidatos inscritos
                  </span>

                  <button
                    onClick={() => {
                      setFilterJobId(job.id);
                      setActiveView('funnel');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>Ver no Funil</span>
                    <CaretRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. VISÃO 3: BANCO DE TALENTOS */}
      {activeView === 'talent_pool' && (
        <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
          isDark ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Archive size={22} className="text-purple-400" weight="fill" />
            <h3 className="text-base font-black">Banco de Talentos Guardados ({filteredCandidates.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
                Nenhum candidato arquivado no banco de talentos.
              </div>
            ) : (
              filteredCandidates.map(cand => (
                <div key={cand.id} className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">{cand.fullName}</h4>
                      <span className="text-xs text-slate-400 font-mono">{cand.phone}</span>
                    </div>
                    <button
                      onClick={() => setViewCandidateModal(cand)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      title="Ver Currículo"
                    >
                      <FileText size={16} />
                    </button>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-purple-300 font-bold uppercase block mb-1">Motivo do Arquivamento:</span>
                    {cand.rejectionReason || 'Guardado para futuras oportunidades.'}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleOpenWhatsApp(cand.phone, cand.fullName)}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <WhatsappLogo size={12} weight="fill" />
                      <span>Recontatar</span>
                    </button>

                    <button
                      onClick={() => handleUpdateCandidateStage(cand.id, 'applied')}
                      className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Reativar no Funil
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: VISUALIZAÇÃO DE CURRÍCULO E DETALHES DO CANDIDATO */}
      {viewCandidateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <FileText size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{viewCandidateModal.fullName}</h3>
                  <span className="text-xs text-slate-400 font-mono">{viewCandidateModal.phone} • {viewCandidateModal.email || 'Sem e-mail'}</span>
                </div>
              </div>
              <button 
                onClick={() => setViewCandidateModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Resumo do Currículo */}
            <div className="space-y-2">
              <label className="text-xs font-black text-indigo-300 uppercase tracking-wider block">
                📄 Currículo & Histórico Profissional:
              </label>
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {viewCandidateModal.resumeText || 'Nenhum resumo em texto informado.'}
              </div>
            </div>

            {/* Link para o Arquivo/PDF se houver */}
            {viewCandidateModal.resumeUrl && (
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <span className="text-xs text-indigo-300 font-bold">Arquivo de Currículo Anexado</span>
                <a
                  href={viewCandidateModal.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Eye size={14} />
                  <span>Visualizar PDF</span>
                </a>
              </div>
            )}

            {/* Histórico de Contato */}
            {viewCandidateModal.contactNotes && (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Anotações de Contato:</span>
                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-white/5">
                  {viewCandidateModal.contactNotes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewCandidateModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AGENDAMENTO DE ENTREVISTA */}
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
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold bg-slate-950 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                💡 O coordenador receberá uma notificação visual em tempo real quando estiver próximo do horário.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScheduleInterviewModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveInterviewSchedule}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                <CheckCircle size={16} weight="bold" />
                <span>Confirmar Agendamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EFETIVAÇÃO & GRADUAÇÃO DIRETA PARA O ONBOARDING */}
      {approveOnboardingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Star size={24} weight="fill" />
                <h3 className="text-base font-black text-white">Efetivar & Enviar para o Onboarding</h3>
              </div>
              <button 
                onClick={() => setApproveOnboardingModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
              🎉 <strong>{approveOnboardingModal.fullName}</strong> será contratado e inserido automaticamente na rampa de integração de <strong>90 dias</strong> na sub-aba de <strong>🚀 Onboarding & Recém-Chegados</strong>!
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 uppercase tracking-wider block mb-1">Equipe de Destino:</label>
                <select
                  value={selectedOnboardingTeamId}
                  onChange={(e) => setSelectedOnboardingTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl font-bold bg-slate-950 border border-white/10 text-white focus:outline-none"
                >
                  {managedTeamsData.map(t => (
                    <option key={t.id} value={t.id}>👥 {t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 uppercase tracking-wider block mb-1">Data de Início / Admissão:</label>
                <input
                  type="date"
                  value={onboardingStartDate}
                  onChange={(e) => setOnboardingStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl font-mono font-bold bg-slate-950 border border-white/10 text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveOnboardingModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteApproveOnboarding}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <CheckCircle size={16} weight="bold" />
                <span>Confirmar Efetivação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REPROVAÇÃO / DECISÃO DE DESCARTE VS BANCO DE TALENTOS */}
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
                  className="p-3 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex flex-col items-center gap-1 text-center cursor-pointer transition-all"
                >
                  <Archive size={20} weight="fill" />
                  <span>Guardar no Banco de Talentos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteRejection('delete')}
                  className="p-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex flex-col items-center gap-1 text-center cursor-pointer transition-all"
                >
                  <Trash size={20} weight="fill" />
                  <span>Excluir Definitivamente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CADASTRO DE NOVO CANDIDATO */}
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
                  <label className="font-bold text-slate-300 block mb-1">E-mail</label>
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
                  <label className="font-bold text-slate-300 block mb-1">Vaga Desejada</label>
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

              {/* Registro de Currículo */}
              <div>
                <label className="font-bold text-indigo-300 block mb-1">Resumo do Currículo / Experiência Prévia</label>
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

      {/* MODAL 6: ABERTURA DE NOVA VAGA */}
      {newJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Briefcase size={22} weight="bold" />
                <h3 className="text-base font-black text-white">Cadastrar Nova Vaga em Aberto</h3>
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
