import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  UserProfile, 
  MonthlyPayment, 
  Organization, 
  CollaborationNote, 
  UserRole 
} from '../../types';
import { sandboxService } from '../../lib/sandboxService';
import { createNotification } from '../../lib/notifications';
import { 
  Calendar, 
  Check, 
  X, 
  Coins, 
  CheckCircle, 
  XCircle, 
  Warning, 
  Notebook, 
  Clock, 
  Folder,
  ArrowRight,
  ShieldCheck,
  Calculator
} from '@phosphor-icons/react';

interface ClosingPjSectionProps {
  profile: UserProfile;
  theme?: 'light' | 'dark';
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ClosingPjSection({ profile, theme = 'dark', showToast }: ClosingPjSectionProps) {
  const isSandbox = profile.organizationId === 'sandbox-test';

  // Configurações do corte
  const [closingEnabled, setClosingEnabled] = useState(false);
  const [closingDay, setClosingDay] = useState(15);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Período selecionado
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Dados do Coordenador
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [notes, setNotes] = useState<CollaborationNote[]>([]);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [loadingClosingData, setLoadingClosingData] = useState(false);
  
  // Abonos temporários locais (Key: collaboratorId_dateStr, Value: boolean)
  const [excusedFaltas, setExcusedFaltas] = useState<Record<string, boolean>>({});

  // Dados do Operador/Back Office
  const [myPayments, setMyPayments] = useState<MonthlyPayment[]>([]);
  const [myPendingPayment, setMyPendingPayment] = useState<MonthlyPayment | null>(null);
  const [contestationReason, setContestationReason] = useState('');
  const [showContestationForm, setShowContestationForm] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Carregar configurações de fechamento da organização
  useEffect(() => {
    if (!profile.organizationId) return;

    if (isSandbox) {
      const org = sandboxService.getOrganization(profile.organizationId);
      if (org && org.closingConfig) {
        setClosingEnabled(org.closingConfig.enabled);
        setClosingDay(org.closingConfig.closingDay);
      }
    } else {
      const unsubscribe = onSnapshot(doc(db, 'organizations', profile.organizationId), (snap) => {
        if (snap.exists()) {
          const org = snap.data() as Organization;
          if (org.closingConfig) {
            setClosingEnabled(org.closingConfig.enabled);
            setClosingDay(org.closingConfig.closingDay);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [profile.organizationId, isSandbox]);

  // Carregar fechamentos PJ para o Operador/Back Office
  useEffect(() => {
    if (['coordinator', 'manager'].includes(profile.role)) return; // Apenas operador/back office
    if (!profile.organizationId) return;

    if (isSandbox) {
      const loadMyPayments = () => {
        const list = sandboxService.getMonthlyPayments(profile.organizationId!)
          .filter(p => p.userId === profile.uid);
        setMyPayments(list.sort((a, b) => b.year - a.year || b.month - a.month));
        
        const pending = list.find(p => p.status === 'released');
        setMyPendingPayment(pending || null);
      };
      loadMyPayments();
      const unsubscribe = sandboxService.subscribe(loadMyPayments);
      return () => unsubscribe();
    } else {
      const q = query(
        collection(db, 'monthly_payments'),
        where('userId', '==', profile.uid)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => d.data() as MonthlyPayment);
        setMyPayments(list.sort((a, b) => b.year - a.year || b.month - a.month));
        
        const pending = list.find(p => p.status === 'released');
        setMyPendingPayment(pending || null);
      });
      return () => unsubscribe();
    }
  }, [profile.uid, profile.role, profile.organizationId, isSandbox]);

  // Carregar dados de fechamento para Coordenador/Gerente
  const loadCoordinatorClosingData = async () => {
    if (!profile.organizationId) return;
    setLoadingClosingData(true);
    try {
      let collabsList: UserProfile[] = [];
      let notesList: CollaborationNote[] = [];
      let paymentsList: MonthlyPayment[] = [];

      if (isSandbox) {
        collabsList = Object.values(sandboxService.getUsers(profile.organizationId))
          .filter(u => ['member', 'backoffice'].includes(u.role));
        
        notesList = sandboxService.getCollaborationNotesReport(profile.organizationId)
          .filter(n => n.type === 'attendance');
          
        paymentsList = sandboxService.getMonthlyPayments(profile.organizationId);
      } else {
        // Colaboradores
        const colQ = query(
          collection(db, 'users'),
          where('organizationId', '==', profile.organizationId)
        );
        const colSnap = await getDocs(colQ);
        collabsList = colSnap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => ['member', 'backoffice'].includes(u.role));

        // Notas de presença
        const noteQ = query(
          collection(db, 'collaboration_notes'),
          where('organizationId', '==', profile.organizationId),
          where('type', '==', 'attendance')
        );
        const noteSnap = await getDocs(noteQ);
        notesList = noteSnap.docs.map(d => d.data() as CollaborationNote);

        // Pagamentos já liberados
        const payQ = query(
          collection(db, 'monthly_payments'),
          where('organizationId', '==', profile.organizationId),
          where('month', '==', selectedMonth),
          where('year', '==', selectedYear)
        );
        const paySnap = await getDocs(payQ);
        paymentsList = paySnap.docs.map(d => d.data() as MonthlyPayment);
      }

      setCollaborators(collabsList);
      setNotes(notesList);
      setPayments(paymentsList);

      // Limpar abonos locais
      setExcusedFaltas({});
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados de fechamento.', 'error');
    } finally {
      setLoadingClosingData(false);
    }
  };

  useEffect(() => {
    if (!['coordinator', 'manager'].includes(profile.role)) return;
    loadCoordinatorClosingData();
  }, [profile.role, profile.organizationId, selectedMonth, selectedYear, closingEnabled, closingDay, isSandbox]);

  // Função auxiliar de quantidade de dias no mês
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  // Calcula o intervalo de corte para o mês/ano selecionado
  const getClosingRange = (year: number, month: number) => {
    if (closingEnabled) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      
      const startDate = new Date(Date.UTC(prevYear, prevMonth - 1, closingDay + 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month - 1, closingDay, 23, 59, 59));
      return { startDate, endDate };
    } else {
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      return { startDate, endDate };
    }
  };

  // Salvar configuração de corte da organização
  const handleSaveClosingConfig = async () => {
    if (!profile.organizationId) return;
    setIsSavingConfig(true);
    try {
      const config = { enabled: closingEnabled, closingDay };
      if (isSandbox) {
        const org = sandboxService.getOrganization(profile.organizationId);
        if (org) {
          sandboxService.setOrganization({
            ...org,
            closingConfig: config
          });
        }
      } else {
        await updateDoc(doc(db, 'organizations', profile.organizationId), {
          closingConfig: config
        });
      }
      setIsEditingConfig(false);
      showToast('Configuração de fechamento salva!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar configuração de fechamento.', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Processa as faltas de um colaborador no período
  const getCollabAttendanceDetails = (collabId: string) => {
    const range = getClosingRange(selectedYear, selectedMonth);
    const collabNotes = notes.filter(n => {
      if (n.collaboratorId !== collabId || n.attendanceStatus !== 'absent') return false;
      const noteDate = new Date(n.createdAt);
      return noteDate >= range.startDate && noteDate <= range.endDate;
    });

    const activeFaltas = collabNotes.map(n => {
      const dateStr = new Date(n.createdAt).toISOString().split('T')[0];
      return {
        dateStr,
        excused: excusedFaltas[`${collabId}_${dateStr}`] || false,
        reason: n.absenceReason || 'Falta sem justificativa preenchida'
      };
    });

    const totalMissed = activeFaltas.length;
    const totalExcused = activeFaltas.filter(f => f.excused).length;
    const netFaltas = totalMissed - totalExcused;

    return { activeFaltas, totalMissed, totalExcused, netFaltas };
  };

  // Alterna o abono de uma falta específica
  const toggleExcuseFalta = (collabId: string, dateStr: string) => {
    const key = `${collabId}_${dateStr}`;
    setExcusedFaltas(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Disparar/Liberar fechamento financeiro para um operador
  const handleReleasePayment = async (collab: UserProfile) => {
    if (!profile.organizationId) return;
    
    const baseValue = collab.monthlyServiceValue || 0;
    if (baseValue <= 0) {
      showToast(`O colaborador ${collab.displayName} não possui prestação cadastrada no convite.`, 'error');
      return;
    }

    const { totalMissed, totalExcused, netFaltas, activeFaltas } = getCollabAttendanceDetails(collab.uid);
    const totalDays = getDaysInMonth(selectedYear, selectedMonth);
    
    // Cálculo do desconto por faltas não abonadas
    const discount = (baseValue / totalDays) * netFaltas;
    const finalValue = Math.max(0, baseValue - discount);

    const paymentId = `${collab.uid}_${selectedMonth}_${selectedYear}`;
    const now = new Date().toISOString();

    const paymentData: MonthlyPayment = {
      id: paymentId,
      userId: collab.uid,
      userName: collab.displayName || collab.email.split('@')[0],
      role: collab.role as 'member' | 'backoffice',
      teamId: collab.teamId || '',
      organizationId: profile.organizationId,
      month: selectedMonth,
      year: selectedYear,
      baseValue,
      totalDays,
      missedDays: totalMissed,
      excusedDays: totalExcused,
      excusedDates: activeFaltas.filter(f => f.excused).map(f => f.dateStr),
      deductedValue: finalValue,
      status: 'released',
      releasedAt: now,
      updatedAt: now
    };

    setIsSubmittingAction(true);
    try {
      if (isSandbox) {
        sandboxService.addMonthlyPayment(paymentData);
      } else {
        await setDoc(doc(db, 'monthly_payments', paymentId), paymentData);
      }

      // Notificar o operador
      await createNotification({
        userId: collab.uid,
        title: 'Fechamento PJ Liberado',
        message: `Seu fechamento de prestação de serviços referente a ${selectedMonth}/${selectedYear} está disponível. Valor: R$ ${finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        type: 'payment_released',
        referenceId: paymentId
      }, isSandbox);

      showToast(`Fechamento financeiro liberado para ${collab.displayName}!`, 'success');
      loadCoordinatorClosingData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao liberar fechamento.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Operador: Confirmar Emissão de Nota
  const handleConfirmInvoice = async () => {
    if (!myPendingPayment) return;
    setIsSubmittingAction(true);
    try {
      const now = new Date().toISOString();
      if (isSandbox) {
        sandboxService.updateMonthlyPaymentStatus(
          myPendingPayment.id,
          'invoice_issued',
          undefined,
          now
        );
      } else {
        await updateDoc(doc(db, 'monthly_payments', myPendingPayment.id), {
          status: 'invoice_issued',
          invoiceIssuedAt: now,
          updatedAt: now
        });
      }

      // Envia notificação ao coordenador/gerente
      await createNotification({
        userId: myPendingPayment.organizationId === 'sandbox-test' ? 'sandbox-coordinator' : myPendingPayment.organizationId, // No SaaS real podemos mandar para o gerente ou para quem liberou
        title: 'Nota Fiscal Emitida',
        message: `${profile.displayName || profile.email.split('@')[0]} confirmou a emissão da nota fiscal para o fechamento de ${myPendingPayment.month}/${myPendingPayment.year}.`,
        type: 'invoice_issued',
        referenceId: myPendingPayment.id
      }, isSandbox);

      showToast('Emissão de nota confirmada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao confirmar nota.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Operador: Registrar Contestação
  const handleContestPayment = async () => {
    if (!myPendingPayment || !contestationReason.trim()) return;
    setIsSubmittingAction(true);
    try {
      if (isSandbox) {
        sandboxService.updateMonthlyPaymentStatus(
          myPendingPayment.id,
          'contested',
          contestationReason
        );
      } else {
        await updateDoc(doc(db, 'monthly_payments', myPendingPayment.id), {
          status: 'contested',
          contestationText: contestationReason,
          updatedAt: new Date().toISOString()
        });
      }

      // Envia notificação ao coordenador/gerente
      await createNotification({
        userId: myPendingPayment.organizationId === 'sandbox-test' ? 'sandbox-coordinator' : myPendingPayment.organizationId,
        title: 'Fechamento PJ Contestado',
        message: `${profile.displayName || profile.email.split('@')[0]} contestou o fechamento de ${myPendingPayment.month}/${myPendingPayment.year}. Motivo: ${contestationReason}`,
        type: 'contested',
        referenceId: myPendingPayment.id
      }, isSandbox);

      showToast('Contestação enviada com sucesso!', 'success');
      setShowContestationForm(false);
      setContestationReason('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao enviar contestação.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Meses do Ano
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  // Anos do Fechamento
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  // -------------------------------------------------------------
  // RENDERIZAÇÃO: COORDENADOR & GERENTE (GESTÃO)
  // -------------------------------------------------------------
  if (['coordinator', 'manager'].includes(profile.role)) {
    const range = getClosingRange(selectedYear, selectedMonth);

    return (
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator size={22} className="text-primary" />
              Fechamentos PJ (Prestação de Contas)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gere pagamentos, desconte faltas registradas no calendário e configure o dia de corte do mês.
            </p>
          </div>

          {/* Configuração de Corte */}
          <div className={`p-4 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            {isEditingConfig ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="enableClosing"
                    checked={closingEnabled}
                    onChange={(e) => setClosingEnabled(e.target.checked)}
                    className="rounded text-primary border-slate-700 bg-slate-950 focus:ring-primary"
                  />
                  <label htmlFor="enableClosing" className="text-xs font-bold text-slate-300">Data de Corte Ativa</label>
                </div>
                {closingEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Dia do Corte:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="28" 
                      value={closingDay}
                      onChange={(e) => setClosingDay(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-950 text-white border border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button 
                    onClick={() => setIsEditingConfig(false)}
                    className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveClosingConfig}
                    disabled={isSavingConfig}
                    className="px-3 py-1 bg-primary hover:opacity-90 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Regra de Fechamento</span>
                  <span className="text-xs font-semibold mt-1 block">
                    {closingEnabled ? `Corte no dia ${closingDay} de cada mês` : 'Mês Calendário Padrão'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsEditingConfig(true)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                    theme === 'dark' 
                      ? 'border-white/10 hover:bg-white/5 text-white' 
                      : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Seletores de Período */}
        <div className={`p-4 rounded-2xl flex flex-wrap gap-4 items-center ${
          theme === 'dark' ? 'bg-slate-900/20 border border-white/5' : 'bg-slate-100 border border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Mês:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-950 text-white text-xs border border-slate-800 rounded-xl px-3 py-1.5 outline-none"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-950 text-white text-xs border border-slate-800 rounded-xl px-3 py-1.5 outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="text-xs text-slate-400 ml-auto font-mono">
            Período das faltas: <span className="text-primary font-bold">{range.startDate.toLocaleDateString('pt-BR')}</span> até <span className="text-primary font-bold">{range.endDate.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Tabela de Colaboradores para Fechamento */}
        {loadingClosingData ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Processando dados e faltas do mês...</p>
          </div>
        ) : collaborators.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl text-slate-500 text-sm">
            Nenhum operador ou back office encontrado nesta organização.
          </div>
        ) : (
          <div className={`overflow-x-auto border rounded-2xl ${
            theme === 'dark' ? 'bg-slate-950/20 border-white/5' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-bold uppercase text-[9px] tracking-wider ${
                  theme === 'dark' ? 'bg-slate-950/40 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4">Valor Base</th>
                  <th className="p-4">Faltas (Intervalo)</th>
                  <th className="p-4">Cálculo e Desconto</th>
                  <th className="p-4">Valor Líquido</th>
                  <th className="p-4 text-center">Status Fechamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {collaborators.map(collab => {
                  const { activeFaltas, totalMissed, totalExcused, netFaltas } = getCollabAttendanceDetails(collab.uid);
                  const totalDays = getDaysInMonth(selectedYear, selectedMonth);
                  const baseValue = collab.monthlyServiceValue || 0;
                  const discount = (baseValue / totalDays) * netFaltas;
                  const netValue = Math.max(0, baseValue - discount);

                  // Verifica se já existe fechamento liberado para esse mês
                  const payDoc = payments.find(p => p.userId === collab.uid);

                  return (
                    <tr key={collab.uid} className="hover:bg-white/[0.01]">
                      {/* Nome */}
                      <td className="p-4 font-semibold">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>{collab.displayName}</span>
                        <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{collab.email}</span>
                      </td>

                      {/* Cargo */}
                      <td className="p-4 capitalize text-slate-400">
                        {collab.role === 'member' ? 'Operador' : 'BackOffice'}
                      </td>

                      {/* Valor Base */}
                      <td className="p-4 font-semibold text-slate-300">
                        {baseValue > 0 ? `R$ ${baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      {/* Faltas Detalhadas */}
                      <td className="p-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            netFaltas > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {netFaltas} falta(s) líquida(s)
                          </span>
                          {totalExcused > 0 && (
                            <span className="text-[9px] text-slate-500">({totalExcused} abonada(s))</span>
                          )}
                        </div>

                        {/* Listagem colapsável de faltas para abonar */}
                        {activeFaltas.length > 0 && (
                          <div className="space-y-1 mt-1 pl-1">
                            {activeFaltas.map(f => (
                              <div key={f.dateStr} className="flex items-center gap-3 justify-between bg-slate-900/30 p-1.5 border border-white/5 rounded-lg">
                                <div className="text-[10px] text-slate-400">
                                  <span className="font-bold">{new Date(f.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</span>: {f.reason}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleExcuseFalta(collab.uid, f.dateStr)}
                                  className={`px-2 py-0.5 text-[9px] font-black rounded cursor-pointer ${
                                    f.excused
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {f.excused ? 'Abonado' : 'Abonar'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Cálculo */}
                      <td className="p-4 text-slate-450 leading-relaxed font-mono">
                        {baseValue > 0 ? (
                          <>
                            <div>Divisor: R$ {(baseValue / totalDays).toFixed(2)}/dia</div>
                            {discount > 0 && (
                              <div className="text-rose-400">- R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            )}
                          </>
                        ) : '-'}
                      </td>

                      {/* Valor Líquido */}
                      <td className="p-4 font-black text-slate-200 text-sm">
                        {baseValue > 0 ? `R$ ${netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      {/* Botão ou Status do Fechamento */}
                      <td className="p-4 text-center">
                        {payDoc ? (
                          <div className="flex flex-col items-center gap-1.5">
                            {payDoc.status === 'released' && (
                              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
                                <Clock size={12} /> Liberado / Pendente
                              </span>
                            )}
                            {payDoc.status === 'invoice_issued' && (
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
                                <CheckCircle size={12} /> Nota Emitida
                              </span>
                            )}
                            {payDoc.status === 'contested' && (
                              <div className="space-y-1.5">
                                <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
                                  <Warning size={12} /> Contestado
                                </span>
                                {payDoc.contestationText && (
                                  <p className="text-[10px] text-rose-300 italic max-w-[150px] mx-auto truncate" title={payDoc.contestationText}>
                                    "{payDoc.contestationText}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : baseValue > 0 ? (
                          <button
                            type="button"
                            disabled={isSubmittingAction}
                            onClick={() => handleReleasePayment(collab)}
                            className="px-3 py-1.5 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/10 transition-all cursor-pointer"
                          >
                            Liberar Fechamento
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Preencher valor PJ no convite</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERIZAÇÃO: OPERADOR / BACK OFFICE (PJ)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Coins size={22} className="text-primary" />
          Minhas Prestações PJ
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Confirme a emissão de nota fiscal dos seus fechamentos ou abra uma contestação caso encontre inconsistências.
        </p>
      </div>

      {/* Alerta de Fechamento Pendente */}
      {myPendingPayment && (
        <div className={`p-6 rounded-3xl border ${
          theme === 'dark' 
            ? 'bg-slate-900/60 border-white/10 text-white' 
            : 'bg-slate-50 border-slate-200 text-slate-800'
        } space-y-4`}>
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <Warning size={20} className="text-amber-500" />
            <h4 className="font-bold text-sm">Fechamento do Mês {myPendingPayment.month}/{myPendingPayment.year} Disponível</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Valor Base</span>
              <p className="text-base font-bold mt-1">
                R$ {myPendingPayment.baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Faltas Registradas</span>
              <p className="text-base font-bold mt-1 text-rose-400">
                {myPendingPayment.missedDays} falta(s)
              </p>
            </div>
            {myPendingPayment.excusedDays > 0 && (
              <div>
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Faltas Abonadas</span>
                <p className="text-base font-bold mt-1 text-emerald-400">
                  {myPendingPayment.excusedDays} falta(s)
                </p>
              </div>
            )}
            <div>
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Valor Líquido Final</span>
              <p className="text-lg font-black mt-1 text-primary">
                R$ {myPendingPayment.deductedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {!showContestationForm ? (
            <div className="flex items-center gap-3 pt-4 border-t border-white/5 justify-end">
              <button
                type="button"
                onClick={() => setShowContestationForm(true)}
                className="px-4 py-2 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Contestar Valores
              </button>
              
              {/* Botão azul com texto branco no modo claro */}
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleConfirmInvoice}
                className="px-5 py-2.5 bg-primary hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} /> Confirmar Nota Emitida
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-white/5">
              <label className="text-[10px] font-bold text-slate-300 block">Descreva o motivo da contestação:</label>
              <textarea
                value={contestationReason}
                onChange={(e) => setContestationReason(e.target.value)}
                placeholder="Ex: Fui abonado pelo supervisor no dia 12, por favor rever..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white outline-none focus:border-primary min-h-[80px]"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowContestationForm(false);
                    setContestationReason('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction || !contestationReason.trim()}
                  onClick={handleContestPayment}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-500/10 cursor-pointer"
                >
                  Enviar Contestação
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico Completo */}
      <div className="space-y-3 pt-3">
        <h4 className="text-sm font-bold text-slate-300 pl-1">Histórico de Fechamentos</h4>
        
        {myPayments.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
            Nenhum fechamento registrado para a sua conta.
          </div>
        ) : (
          <div className={`overflow-x-auto border rounded-2xl ${
            theme === 'dark' ? 'bg-slate-950/20 border-white/5' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-bold uppercase text-[9px] tracking-wider ${
                  theme === 'dark' ? 'bg-slate-950/40 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="p-3">Mês/Ano</th>
                  <th className="p-3">Valor Base</th>
                  <th className="p-3">Faltas Líquidas</th>
                  <th className="p-3">Valor Pago (Líquido)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Data de Emissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {myPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-white/[0.01]">
                    <td className="p-3 font-semibold font-mono text-slate-200">{pay.month}/{pay.year}</td>
                    <td className="p-3 text-slate-400">R$ {pay.baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-slate-400">{pay.missedDays - pay.excusedDays} faltas</td>
                    <td className="p-3 font-bold text-white">R$ {pay.deductedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3">
                      {pay.status === 'released' && <span className="text-amber-400 font-semibold">Liberado</span>}
                      {pay.status === 'invoice_issued' && <span className="text-emerald-400 font-semibold">Nota Emitida</span>}
                      {pay.status === 'contested' && <span className="text-rose-400 font-semibold">Contestado</span>}
                    </td>
                    <td className="p-3 text-slate-500">
                      {pay.invoiceIssuedAt ? new Date(pay.invoiceIssuedAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
