import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sandboxService } from '../../lib/sandboxService';
import { Agreement, AttendanceRecord, AttendanceReason, UserProfile, UserRole, Team } from '../../types';
import { formatCurrency, maskCPF } from '../../utils/masks';
import { formatAudioStreamUrl } from '../../utils/audio';
import { PhoneCall, Play, Headphones, Tag, CheckCircle, XCircle, Percent, Plus, User, CircleNotch as Loader2, Pencil, X, Check, Link, Trash, Clock, CaretLeft, CaretRight, Buildings, Fire, CurrencyDollar, Lightning, ChartLineUp, ShieldWarning, FileCsv as FileSpreadsheet } from '@phosphor-icons/react';
import { TabulationModal } from '../modals/TabulationModal';
import { AgreementDetailsModal } from '../modals/AgreementDetailsModal';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomAudioPlayer } from '../ui/CustomAudioPlayer';
import { ExcelExportModal } from '../modals/ExcelExportModal';
import { ExcelExportColumn } from '../../utils/excelExport';

interface AttendanceTabulationTabProps {
  profile: UserProfile;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  agreements: Agreement[];
  teamsData?: Team[];
  theme?: 'light' | 'dark';
}

export const AttendanceTabulationTab: React.FC<AttendanceTabulationTabProps> = ({
  profile,
  showToast,
  agreements,
  teamsData = [],
  theme = 'dark'
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTabulationModalOpen, setIsTabulationModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [isAgreementDetailsOpen, setIsAgreementDetailsOpen] = useState(false);
  const [teamOperators, setTeamOperators] = useState<UserProfile[]>([]);

  // Gerenciamento de Motivos pelo Atendente
  const [customReasons, setCustomReasons] = useState<AttendanceReason[]>([]);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);

  // Filtros de Operador e Equipe (para Supervisores, Coordenadores, Gerentes e QA)
  const isManagerOrQa = ['supervisor', 'manager', 'admin', 'monitor', 'coordinator'].includes(profile.role);
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filtragem dos registros conforme RBAC e Seletores de Equipe/Operador
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Se for operador comum, só vê os seus próprios atendimentos
      if (!isManagerOrQa) {
        return r.operatorId === profile.uid;
      }

      // Filtro por Equipe/Time
      if (selectedTeamFilter !== 'all') {
        const op = teamOperators.find(o => o.uid === r.operatorId);
        const matchTeam = r.teamId === selectedTeamFilter || (op && op.teamId === selectedTeamFilter);
        if (!matchTeam) return false;
      }

      // Filtro por Operador
      if (selectedOperatorFilter !== 'all') {
        if (r.operatorId !== selectedOperatorFilter) return false;
      }

      return true;
    });
  }, [records, isManagerOrQa, profile.uid, selectedTeamFilter, selectedOperatorFilter, teamOperators]);

  const tabulationExportColumns: ExcelExportColumn[] = [
    { key: 'id', label: 'ID do Atendimento', type: 'text' },
    { key: 'clientCpf', label: 'CPF / CNPJ do Cliente', type: 'cpf' },
    { key: 'clientName', label: 'Nome do Cliente', type: 'text' },
    { key: 'reasonTitle', label: 'Motivo da Chamada', type: 'text' },
    { key: 'isNegotiationText', label: 'Teve Negociação', type: 'text' },
    { key: 'isSuccessText', label: 'Resultado / Acordo', type: 'text' },
    { key: 'operatorName', label: 'Operador / Atendente', type: 'text' },
    { key: 'hasAudio', label: 'Áudio Gravado', type: 'text' },
    { key: 'observation', label: 'Observação / Relato', type: 'text' },
    { key: 'createdAt', label: 'Data / Hora do Atendimento', type: 'date' }
  ];

  const tabulationExportData = useMemo(() => {
    return filteredRecords.map(r => ({
      ...r,
      isNegotiationText: r.isNegotiation ? 'Sim' : 'Não',
      isSuccessText: r.isSuccess ? 'Acordo Firmado' : 'Sem Acordo',
      hasAudio: r.audioUrl ? 'Sim (MP3 Gravado)' : 'Não',
      observation: r.observation || '-'
    }));
  }, [filteredRecords]);

  const [editingReason, setEditingReason] = useState<AttendanceReason | null>(null);
  const [reasonTitle, setReasonTitle] = useState('');
  const [reasonIsNegotiation, setReasonIsNegotiation] = useState(true);
  const [reasonIsSuccess, setReasonIsSuccess] = useState(false);

  // Carrega motivos customizados
  useEffect(() => {
    if (!profile.organizationId) return;
    const defaultReasons: AttendanceReason[] = [
      { id: 'reason_1', organizationId: profile.organizationId, title: 'Acordo Fechado / Negociação Aceita', isNegotiation: true, isSuccess: true, active: true },
      { id: 'reason_2', organizationId: profile.organizationId, title: 'Proposta Recusada / Sem Acordo', isNegotiation: true, isSuccess: false, active: true },
      { id: 'reason_3', organizationId: profile.organizationId, title: 'Dúvida de Boleto / Segunda Via', isNegotiation: false, isSuccess: false, active: true },
      { id: 'reason_4', organizationId: profile.organizationId, title: 'Solicitação de Saque / Informação Institucional', isNegotiation: false, isSuccess: false, active: true },
      { id: 'reason_5', organizationId: profile.organizationId, title: 'Caixa Postal / Sem Contato Efetivo', isNegotiation: false, isSuccess: false, active: true }
    ];

    const stored = localStorage.getItem(`attendance_reasons_${profile.organizationId}`);
    if (stored) {
      setCustomReasons(JSON.parse(stored));
    } else {
      setCustomReasons(defaultReasons);
      localStorage.setItem(`attendance_reasons_${profile.organizationId}`, JSON.stringify(defaultReasons));
    }
  }, [profile.organizationId]);

  const handleSaveReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonTitle.trim()) return;

    let updated: AttendanceReason[];
    if (editingReason) {
      updated = customReasons.map(r => r.id === editingReason.id ? {
        ...r,
        title: reasonTitle.trim(),
        isNegotiation: reasonIsNegotiation,
        isSuccess: reasonIsSuccess
      } : r);
    } else {
      const newR: AttendanceReason = {
        id: `reason_${Date.now()}`,
        organizationId: profile.organizationId || '',
        title: reasonTitle.trim(),
        isNegotiation: reasonIsNegotiation,
        isSuccess: reasonIsSuccess,
        active: true
      };
      updated = [...customReasons, newR];
    }

    setCustomReasons(updated);
    localStorage.setItem(`attendance_reasons_${profile.organizationId}`, JSON.stringify(updated));
    showToast(editingReason ? 'Motivo atualizado com sucesso!' : 'Novo motivo de atendimento criado!', 'success');

    setEditingReason(null);
    setReasonTitle('');
    setReasonIsNegotiation(true);
    setReasonIsSuccess(false);
  };

  const handleOpenEditReason = (reason: AttendanceReason) => {
    setEditingReason(reason);
    setReasonTitle(reason.title);
    setReasonIsNegotiation(reason.isNegotiation);
    setReasonIsSuccess(reason.isSuccess);
  };

  // Carrega lista de atendimentos
  useEffect(() => {
    if (!profile.organizationId) return;

    setLoading(true);

    if (profile.organizationId === 'sandbox-test') {
      const stored = localStorage.getItem(`sandbox_attendances_${profile.organizationId}`);
      if (stored) {
        setRecords(JSON.parse(stored));
      } else {
        const mock: AttendanceRecord[] = [
          {
            id: 'att_1',
            organizationId: profile.organizationId,
            operatorId: profile.uid,
            operatorName: profile.displayName || 'Operador',
            clientCpf: '123.456.789-01',
            clientName: 'João da Silva',
            reasonId: 'reason_1',
            reasonTitle: 'Acordo Fechado / Negociação Aceita',
            isNegotiation: true,
            isSuccess: true,
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            observation: 'Cliente aceitou parcelar a entrada em 3x no boleto.',
            agreementId: agreements[0]?.id || 'ag_mock',
            createdAt: new Date().toISOString()
          },
          {
            id: 'att_2',
            organizationId: profile.organizationId,
            operatorId: profile.uid,
            operatorName: profile.displayName || 'Operador',
            clientCpf: '987.654.321-09',
            clientName: 'Maria Santos',
            reasonId: 'reason_3',
            reasonTitle: 'Dúvida de Boleto / Segunda Via',
            isNegotiation: false,
            isSuccess: false,
            observation: 'Enviada 2ª via do boleto via WhatsApp.',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        setRecords(mock);
        localStorage.setItem(`sandbox_attendances_${profile.organizationId}`, JSON.stringify(mock));
      }
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'attendances'),
      where('organizationId', '==', profile.organizationId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecords(list);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar atendimentos:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile.organizationId, agreements]);

  // Carrega lista de operadores para filtro do Supervisor/QA
  useEffect(() => {
    if (!profile.organizationId || !isManagerOrQa) return;
    const qUsers = query(
      collection(db, 'users'),
      where('organizationId', '==', profile.organizationId)
    );
    const unsub = onSnapshot(qUsers, (snapshot) => {
      setTeamOperators(snapshot.docs.map(d => d.data() as UserProfile));
    });
    return () => unsub();
  }, [profile.organizationId, isManagerOrQa]);

  // Salva nova tabulação
  const handleSaveTabulation = async (data: {
    clientCpf: string;
    clientName: string;
    reasonId: string;
    reasonTitle: string;
    isNegotiation: boolean;
    isSuccess: boolean;
    audioUrl?: string;
    audioExpiresAt?: string;
    observation?: string;
    agreementId?: string;
  }) => {
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      organizationId: profile.organizationId,
      teamId: profile.teamId,
      operatorId: profile.uid,
      operatorName: profile.displayName || 'Operador',
      clientCpf: data.clientCpf,
      clientName: data.clientName,
      reasonId: data.reasonId,
      reasonTitle: data.reasonTitle,
      isNegotiation: data.isNegotiation,
      isSuccess: data.isSuccess,
      audioUrl: data.audioUrl,
      audioExpiresAt: data.audioExpiresAt,
      observation: data.observation,
      agreementId: data.agreementId,
      createdAt: new Date().toISOString()
    };

    try {
      if (profile.organizationId === 'sandbox-test') {
        const updated = [newRecord, ...records];
        setRecords(updated);
        localStorage.setItem(`sandbox_attendances_${profile.organizationId}`, JSON.stringify(updated));
      } else {
        await addDoc(collection(db, 'attendances'), newRecord);
      }
      showToast('Tabulação registrada com sucesso!', 'success');
    } catch (e) {
      console.error("Erro ao salvar tabulação:", e);
      showToast('Erro ao registrar tabulação.', 'error');
    }
  };

  // Exclusão de registro de tabulação
  const handleDeleteTabulation = async (recordId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tabulação de atendimento?')) return;

    try {
      if (profile.organizationId === 'sandbox-test') {
        const updated = records.filter(r => r.id !== recordId);
        setRecords(updated);
        localStorage.setItem(`sandbox_attendances_${profile.organizationId}`, JSON.stringify(updated));
      } else {
        const docRef = doc(db, 'attendances', recordId);
        await deleteDoc(docRef);
      }
      showToast('Tabulação removida com sucesso.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao excluir tabulação.', 'error');
    }
  };

  // Paginação (8 itens por página)
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredRecords.length, totalPages, currentPage]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  // Cálculo da Conversão Real (%)
  // Conversão Real (%) = (Atendimentos com Sucesso / Atendimentos do Tipo Negociação) * 100
  const metrics = useMemo(() => {
    const totalAttendances = filteredRecords.length;
    const negotiationCount = filteredRecords.filter(r => r.isNegotiation).length;
    const successCount = filteredRecords.filter(r => r.isSuccess).length;
    const institutionalCount = totalAttendances - negotiationCount;

    const realConversionRate = negotiationCount > 0 
      ? ((successCount / negotiationCount) * 100).toFixed(1) 
      : '0.0';

    return {
      totalAttendances,
      negotiationCount,
      successCount,
      institutionalCount,
      realConversionRate
    };
  }, [filteredRecords]);

  // Cálculo do Breakdown dos Motivos (Gráfico de Rosca / Pareto de Motivos)
  const reasonBreakdown = useMemo(() => {
    const counts: Record<string, { title: string; count: number; isNegotiation: boolean; isSuccess: boolean }> = {};
    filteredRecords.forEach(r => {
      const key = r.reasonTitle || 'Sem motivo';
      if (!counts[key]) {
        counts[key] = {
          title: key,
          count: 0,
          isNegotiation: r.isNegotiation,
          isSuccess: r.isSuccess
        };
      }
      counts[key].count += 1;
    });

    const total = filteredRecords.length || 1;
    return Object.values(counts)
      .map(item => ({
        ...item,
        percentage: Number(((item.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Abrir detalhes do acordo pela tag
  const handleOpenAgreementDetails = (agreementId: string) => {
    const ag = agreements.find(a => a.id === agreementId);
    if (ag) {
      setSelectedAgreement(ag);
      setIsAgreementDetailsOpen(true);
    } else {
      showToast('Acordo não encontrado ou finalizado.', 'warning');
    }
  };

  const REASON_COLORS = [
    '#38bdf8', '#34d399', '#f59e0b', '#f43f5e', '#a78bfa', '#ec4899', '#10b981', '#6366f1'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com KPIs de Conversão Real */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Taxa de Conversão Real */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-emerald-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Conversão Real</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Fórmula Efetiva</span>
          </div>
          <span className="text-3xl font-black text-emerald-400 mt-2 block tracking-tight">
            {metrics.realConversionRate}%
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">
            {metrics.successCount} acordos / {metrics.negotiationCount} negociações
          </span>
        </div>

        {/* Card 2: Oportunidades Efetivas */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-sky-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Negociações Reais</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">Denominador</span>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {metrics.negotiationCount} contatos
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Exclui boletos e dúvidas institucionais</span>
        </div>

        {/* Card 3: Sucesso de Acordo */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-amber-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acordos Firmados</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Convertidos</span>
          </div>
          <span className="text-2xl font-black text-amber-400 mt-2 block tracking-tight">
            {metrics.successCount} acordos
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Vinculados à carteira ativa</span>
        </div>

        {/* Card 4: Total Geral de Atendimentos */}
        <div className={`p-5 rounded-2xl border border-t-2 border-t-purple-500 shadow-md transition-all ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Atendimentos</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Volume Total</span>
          </div>
          <span className="text-2xl font-black text-purple-400 mt-2 block tracking-tight">
            {metrics.totalAttendances} registros
          </span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Inclui {metrics.institutionalCount} institucionais</span>
        </div>
      </div>



      {/* Título da Seção e Controles de Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <Headphones size={22} />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white">Histórico de Atendimentos & Tabulação</h3>
            <span className="text-xs text-slate-400">Registro de contatos por voz e WhatsApp com auditoria em MP3</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Filtros por Equipe e Operador para Supervisores/Gestão/QA */}
          {isManagerOrQa && (
            <>
              {/* Seletor de Equipe/Time */}
              {teamsData.length > 0 && (
                <div className="w-48">
                  <CustomSelect
                    value={selectedTeamFilter}
                    onChange={(val) => setSelectedTeamFilter(val)}
                    placeholder="Todas as Equipes"
                    options={[
                      { value: 'all', label: '🏢 Todas as Equipes' },
                      ...teamsData.map(t => ({ value: t.id, label: `👥 ${t.name}` }))
                    ]}
                  />
                </div>
              )}

              {/* Seletor de Operador */}
              <div className="w-52">
                <CustomSelect
                  value={selectedOperatorFilter}
                  onChange={(val) => setSelectedOperatorFilter(val)}
                  placeholder="Todos os Operadores"
                  options={[
                    { value: 'all', label: '👤 Toda a Equipe' },
                    ...teamOperators
                      .filter(op => selectedTeamFilter === 'all' || op.teamId === selectedTeamFilter)
                      .map(op => ({ value: op.uid, label: `${op.displayName || op.email}` }))
                  ]}
                />
              </div>
            </>
          )}

          {/* Botão de Exportação ExcelJS Configurável */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-500/30 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Excel Formatado</span>
          </button>

          {/* Botão Gerenciar Motivos Oficiais (Restrito a Supervisores / Gestão) */}
          {profile.role !== 'member' && (
            <button
              onClick={() => setIsReasonModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Gerenciar motivos oficiais padronizados para toda a empresa"
            >
              <Tag size={15} className="text-amber-400" />
              <span>⚙️ Gerenciar Motivos Oficiais</span>
            </button>
          )}

          {/* Botão Registrar Atendimento (Operadores & Supervisores) */}
          <button
            onClick={() => setIsTabulationModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Nova Tabulação</span>
          </button>
        </div>
      </div>

      {/* Tabela de Histórico de Atendimentos */}
      <div className={`rounded-[2rem] border overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900/10 border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={28} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carregando Histórico...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm italic">
            Nenhum atendimento registrado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className={`border-b text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ${
                  theme === 'dark' ? 'border-white/5 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="px-6 py-4">Data / Hora</th>
                  <th className="px-6 py-4">Operador</th>
                  <th className="px-6 py-4">Cliente / CPF</th>
                  <th className="px-6 py-4">Motivo / Tipo</th>
                  <th className="px-6 py-4">Vínculo de Acordo</th>
                  <th className="px-6 py-4">Áudio MP3 (QA)</th>
                  <th className="px-6 py-4">Observação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={`text-xs divide-y ${
                theme === 'dark' ? 'text-slate-300 divide-white/[0.02]' : 'text-slate-700 divide-slate-100'
              }`}>
                {paginatedRecords.map(rec => {
                  const isExpired = rec.audioExpiresAt && new Date(rec.audioExpiresAt).getTime() < Date.now();
                  return (
                    <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {new Date(rec.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {rec.operatorName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold block text-sky-400">{rec.clientName}</span>
                        <span className="font-mono text-[11px] text-slate-400">{maskCPF(rec.clientCpf)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold block">{rec.reasonTitle}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            rec.isNegotiation ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {rec.isNegotiation ? 'Negociação' : 'Institucional'}
                          </span>
                          {rec.isSuccess && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Sucesso
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vínculo de Acordo */}
                      <td className="px-6 py-4">
                        {rec.agreementId ? (
                          <button
                            onClick={() => handleOpenAgreementDetails(rec.agreementId!)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                          >
                            <Tag size={12} />
                            <span>🏷️ #AC-{rec.agreementId.slice(-4).toUpperCase()}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Sem vínculo</span>
                        )}
                      </td>

                      {/* Player Premium Customizado de Áudio MP3 */}
                      <td className="px-6 py-4">
                        {rec.audioUrl && !isExpired ? (
                          <CustomAudioPlayer
                            src={rec.audioUrl}
                            expiresAt={rec.audioExpiresAt}
                            theme={theme}
                            compact
                          />
                        ) : isExpired ? (
                          <span className="text-rose-400 text-[10px] font-bold flex items-center gap-1">
                            <Clock size={11} /> Áudio Expirado
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Sem gravação</span>
                        )}
                      </td>

                      {/* Observação */}
                      <td className="px-6 py-4 max-w-xs truncate text-slate-400" title={rec.observation}>
                        {rec.observation || '-'}
                      </td>

                      {/* Botão de Ações (Excluir) */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteTabulation(rec.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Excluir Tabulação"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Barra de Paginação (8 itens por página) */}
            {totalPages > 1 && (
              <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
                theme === 'dark' ? 'border-white/5 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                <span className="text-[11px] font-medium">
                  Exibindo <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)}</strong> de <strong>{filteredRecords.length}</strong> atendimentos
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border flex items-center gap-1 text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  >
                    <CaretLeft size={13} /> Anterior
                  </button>
                  <span className="font-bold font-mono px-2 text-[11px]">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border flex items-center gap-1 text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  >
                    Próxima <CaretRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Nova Tabulação */}
      <TabulationModal
        isOpen={isTabulationModalOpen}
        onClose={() => setIsTabulationModalOpen(false)}
        onSave={handleSaveTabulation}
        existingAgreements={agreements}
        customReasons={customReasons}
        organizationId={profile.organizationId}
        theme={theme}
      />

      {/* Modal de Detalhes do Acordo */}
      <AgreementDetailsModal
        isOpen={isAgreementDetailsOpen}
        onClose={() => setIsAgreementDetailsOpen(false)}
        agreement={selectedAgreement}
        theme={theme}
      />

      {/* Modal de Edição de Motivos de Tabulação pelo Próprio Atendente */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setIsReasonModalOpen(false)}>
          <div 
            className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 p-5 sm:p-6 bg-slate-900 text-white shadow-2xl transition-all my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Gerenciamento de Motivos de Tabulação</h3>
                  <span className="text-[11px] text-slate-400 font-medium">O próprio atendente pode criar e ajustar os motivos</span>
                </div>
              </div>
              <button 
                onClick={() => setIsReasonModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário de Adicionar / Editar Motivo */}
            <form onSubmit={handleSaveReason} className="space-y-3.5 my-4 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {editingReason ? '✏️ Editar Motivo Selecionado' : '➕ Criar Novo Motivo'}
              </h4>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Título do Motivo</label>
                <input 
                  type="text"
                  value={reasonTitle}
                  onChange={(e) => setReasonTitle(e.target.value)}
                  placeholder="Ex: Cliente Viajando / Retorno Agendado"
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700">
                  <input 
                    type="checkbox"
                    checked={reasonIsNegotiation}
                    onChange={(e) => setReasonIsNegotiation(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>É Oportunidade de Negociação (Denominador)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700">
                  <input 
                    type="checkbox"
                    checked={reasonIsSuccess}
                    onChange={(e) => setReasonIsSuccess(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Gerou Acordo / Sucesso (Numerador)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingReason && (
                  <button
                    type="button"
                    onClick={() => { setEditingReason(null); setReasonTitle(''); }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {editingReason ? 'Atualizar Motivo' : 'Adicionar Motivo'}
                </button>
              </div>
            </form>

            {/* Lista de Motivos Cadastrados */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivos Ativos no Sistema</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {customReasons.map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{r.title}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className={r.isNegotiation ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          {r.isNegotiation ? '✓ Denominador' : '🚫 Excluído'}
                        </span>
                        {r.isSuccess && <span className="text-sky-400 font-semibold">🎉 Sucesso</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenEditReason(r)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 transition-colors cursor-pointer"
                      title="Editar este motivo"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXPORTAÇÃO EXCEL CONFIGURÁVEL DA ABA ATENDIMENTOS */}
      <ExcelExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Relatório de Tabulação de Atendimentos"
        defaultFilename={`Relatorio_Tabulacoes_${new Date().toISOString().split('T')[0]}.xlsx`}
        availableColumns={tabulationExportColumns}
        data={tabulationExportData}
        showToast={showToast}
        theme={theme}
      />
    </div>
  );
};
