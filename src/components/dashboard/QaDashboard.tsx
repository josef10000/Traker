import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, QaCompetence, QaEvaluation, Pdi, Team, QaSettings, Agreement } from '../../types';
import { sandboxService } from '../../lib/sandboxService';
import { calculateQaStats, calculateOpPerformance, getExpiredPdisCount } from '../../lib/qaService';
import { QaOverview } from './qa/QaOverview';
import { QaEvaluationsList } from './qa/QaEvaluationsList';
import { PdiManager } from './qa/PdiManager';
import { CompetenceManager } from './qa/CompetenceManager';
import { QaModals } from './qa/QaModals';
import { Plus, CircleNotch as Loader2, Warning as AlertTriangle } from '@phosphor-icons/react';

interface QaDashboardProps {
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  managedTeamsData: Team[];
  agreements: Agreement[];
  attendanceStatuses: Record<string, 'present' | 'late' | 'absent'>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const QaDashboard = ({
  profile,
  currentTeamMembers,
  managedTeamsData,
  agreements,
  attendanceStatuses,
  showToast,
  theme = 'dark'
}: QaDashboardProps) => {
  const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'super_admin' || profile.role === 'monitor' || profile.role === 'coordinator';

  // Estados principais
  const [competences, setCompetences] = useState<QaCompetence[]>([]);
  const [evaluations, setEvaluations] = useState<QaEvaluation[]>([]);
  const [pdis, setPdis] = useState<Pdi[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Ciclos e Operador Selecionado
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | 'all'>('all');
  const [qaSettings, setQaSettings] = useState<QaSettings>({
    id: `settings-${profile.organizationId || 'default'}`,
    organizationId: profile.organizationId || 'default',
    evaluationCycleDays: 30,
    pdiObservationDays: 15
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingNextQaDate, setEditingNextQaDate] = useState('');
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);

  // Estados de navegação interna
  const [qaSubTab, setQaSubTab] = useState<'overview' | 'evaluations' | 'pdis' | 'competences'>(
    isSuperUser ? 'overview' : 'evaluations'
  );

  // Estados dos Modais
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<QaCompetence | null>(null);

  // Escutas em Tempo Real
  useEffect(() => {
    if (!profile.organizationId) return;

    if (profile.organizationId === 'sandbox-test') {
      const syncSandboxQa = () => {
        setLoading(true);
        // Competências
        const comps = sandboxService.getQaCompetences(profile.organizationId);
        setCompetences(comps);

        // Settings
        const settings = sandboxService.getQaSettings(profile.organizationId);
        setQaSettings(settings);

        // Avaliações
        let evals = sandboxService.getQaEvaluations(profile.organizationId);
        if (!isSuperUser) {
          evals = evals.filter(e => e.operatorId === profile.uid);
        }
        evals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEvaluations(evals);

        // PDIs
        let rawPdis = sandboxService.getPdis(profile.organizationId);
        if (!isSuperUser) {
          rawPdis = rawPdis.filter(p => p.operatorId === profile.uid);
        }
        
        // Auto-expirar PDIs se a data limite passou e está pendente
        const todayStr = new Date().toISOString().split('T')[0];
        rawPdis.forEach(p => {
          if (p.status === 'pending' && p.dueDate < todayStr) {
            sandboxService.updatePdiStatus(p.id, 'expired');
            p.status = 'expired';
          }
        });
        setPdis(rawPdis);
        setLoading(false);
      };

      syncSandboxQa();
      return sandboxService.subscribe(syncSandboxQa);
    }

    setLoading(true);

    // 0. Configurações de QA
    const docSettingsRef = doc(db, 'qa_settings', `settings-${profile.organizationId}`);
    const unsubscribeSettings = onSnapshot(docSettingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as QaSettings;
        setQaSettings(data);
      } else if (profile.role === 'monitor') {
        setDoc(docSettingsRef, {
          id: `settings-${profile.organizationId}`,
          organizationId: profile.organizationId,
          evaluationCycleDays: 30,
          pdiObservationDays: 15
        });
      }
    });

    // 1. Competências
    const qComp = query(
      collection(db, 'qa_competences'),
      where('organizationId', '==', profile.organizationId)
    );
    const unsubscribeComp = onSnapshot(qComp, async (snapshot) => {
      let comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QaCompetence));
      
      // Inicializar competências padrão se não houver nenhuma cadastrada
      if (comps.length === 0 && isSuperUser) {
        const defaults = [
          { name: 'Argumentação', weight: 1, description: 'Postura, tom de voz e assertividade de fala.' },
          { name: 'Negociação', weight: 1, description: 'Habilidade de propor alternativas e contornar objeções.' },
          { name: 'Sistemas', description: 'Uso correto do Tracker e CRM interno.', weight: 1 },
          { name: 'Compliance / LGPD', description: 'Confirmação correta de dados e sigilo.', weight: 1 }
        ];

        try {
          await Promise.all(defaults.map(item => {
            const id = doc(collection(db, 'qa_competences')).id;
            return setDoc(doc(db, 'qa_competences', id), {
              id,
              organizationId: profile.organizationId,
              ...item
            });
          }));
        } catch (err) {
          console.error("Erro ao inicializar competências padrão:", err);
        }
      } else {
        setCompetences(comps);
      }
    });

    // 2. Avaliações (filtradas por operador se for operador)
    let qEval = query(
      collection(db, 'qa_evaluations'),
      where('organizationId', '==', profile.organizationId)
    );
    if (!isSuperUser) {
      qEval = query(qEval, where('operatorId', '==', profile.uid));
    }
    const unsubscribeEval = onSnapshot(qEval, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QaEvaluation));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEvaluations(data);
    });

    // 3. PDIs (filtrados por operador se for operador)
    let qPdi = query(
      collection(db, 'pdis'),
      where('organizationId', '==', profile.organizationId)
    );
    if (!isSuperUser) {
      qPdi = query(qPdi, where('operatorId', '==', profile.uid));
    }
    const unsubscribePdi = onSnapshot(qPdi, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Pdi));
      
      // Auto-expirar PDIs se a data limite passou e está pendente
      const todayStr = new Date().toISOString().split('T')[0];
      data.forEach(p => {
        if (p.status === 'pending' && p.dueDate < todayStr) {
          updateDoc(doc(db, 'pdis', p.id), { status: 'expired' });
          p.status = 'expired';
        }
      });

      setPdis(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeComp();
      unsubscribeEval();
      unsubscribePdi();
    };
  }, [profile.organizationId, profile.uid, isSuperUser]);

  // Estatísticas e Analytics usando a camada de QA Service
  const stats = useMemo(() => {
    return calculateQaStats(evaluations, competences, selectedOperatorId);
  }, [evaluations, competences, selectedOperatorId]);

  const opPerformance = useMemo(() => {
    return calculateOpPerformance(agreements, selectedOperatorId, attendanceStatuses);
  }, [agreements, selectedOperatorId, attendanceStatuses]);

  const expiredPdisCount = useMemo(() => {
    return getExpiredPdisCount(pdis);
  }, [pdis]);

  // Handlers CRUD Competência
  const handleSaveCompetence = async (name: string, weight: number, description: string) => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode modificar competências.', 'error');
      return;
    }
    if (!name.trim()) return;

    if (profile.organizationId === 'sandbox-test') {
      if (editingCompetence) {
        sandboxService.updateQaCompetence(editingCompetence.id, {
          name,
          weight,
          description
        });
        showToast('Competência do Sandbox atualizada na memória!', 'success');
      } else {
        const id = `sandbox-comp-${Date.now()}`;
        sandboxService.addQaCompetence({
          id,
          organizationId: profile.organizationId,
          name,
          weight,
          description
        });
        showToast('Competência do Sandbox criada na memória!', 'success');
      }
      setIsCompModalOpen(false);
      setEditingCompetence(null);
      return;
    }

    try {
      if (editingCompetence) {
        await updateDoc(doc(db, 'qa_competences', editingCompetence.id), {
          name,
          weight,
          description
        });
        showToast('Competência atualizada!', 'success');
      } else {
        const id = doc(collection(db, 'qa_competences')).id;
        await setDoc(doc(db, 'qa_competences', id), {
          id,
          organizationId: profile.organizationId,
          name,
          weight,
          description
        });
        showToast('Competência criada!', 'success');
      }
      setIsCompModalOpen(false);
      setEditingCompetence(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar competência.', 'error');
    }
  };

  const handleDeleteComp = async (id: string) => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode excluir competências.', 'error');
      return;
    }
    if (!confirm('Deseja realmente excluir esta competência?')) return;
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.deleteQaCompetence(id);
      showToast('Competência do Sandbox excluída da memória!', 'success');
      return;
    }
    try {
      await deleteDoc(doc(db, 'qa_competences', id));
      showToast('Competência excluída.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir.', 'error');
    }
  };

  // Handlers CRUD Avaliação & PDI
  const handleSaveEvaluation = async (data: {
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
  }) => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode registrar avaliações.', 'error');
      return;
    }
    if (!data.operatorId) {
      showToast('Selecione um operador.', 'warning');
      return;
    }

    // Validar se todas as competências receberam nota
    let gradesFilled = true;
    competences.forEach(c => {
      if (data.grades[c.id] === undefined) {
        gradesFilled = false;
      }
    });

    if (!gradesFilled) {
      showToast('Por favor, defina notas (0 a 100) para todas as competências.', 'warning');
      return;
    }

    // Calcular a média final
    let sumGrades = 0;
    let sumWeights = 0;
    competences.forEach(c => {
      const grade = data.grades[c.id];
      const weight = c.weight || 1;
      sumGrades += grade * weight;
      sumWeights += weight;
    });

    const finalScore = sumGrades / (sumWeights || 1);
    const now = new Date().toISOString();

    if (profile.organizationId === 'sandbox-test') {
      const evalId = `sandbox-qa-${Date.now()}`;
      sandboxService.setQaEvaluation({
        id: evalId,
        organizationId: profile.organizationId,
        operatorId: data.operatorId,
        evaluatorId: profile.uid,
        score: Math.round(finalScore),
        callId: data.callId || null,
        protocol: data.protocol || null,
        callLink: data.callLink || null,
        grades: data.grades,
        feedback: data.feedback,
        createdAt: now
      });

      if (data.suggestPdi && data.pdiCompetenceId && data.pdiActionPlan && data.pdiDueDate) {
        const pdiId = `sandbox-pdi-${Date.now()}`;
        const selectedComp = competences.find(c => c.id === data.pdiCompetenceId);
        sandboxService.setPdi({
          id: pdiId,
          organizationId: profile.organizationId,
          operatorId: data.operatorId,
          evaluatorId: profile.uid,
          competenceId: data.pdiCompetenceId,
          competenceName: selectedComp?.name || 'Competência',
          actionPlan: data.pdiActionPlan,
          dueDate: data.pdiDueDate,
          status: 'pending',
          createdAt: now
        });
      }

      sandboxService.updateOperatorQaDates(data.operatorId, undefined, 'evaluated', now.split('T')[0]);
      showToast('Avaliação do Sandbox registrada com sucesso!', 'success');
      setIsEvalModalOpen(false);
      return;
    }

    try {
      const evalId = doc(collection(db, 'qa_evaluations')).id;

      await setDoc(doc(db, 'qa_evaluations', evalId), {
        id: evalId,
        organizationId: profile.organizationId,
        operatorId: data.operatorId,
        evaluatorId: profile.uid,
        score: Math.round(finalScore),
        callId: data.callId || null,
        protocol: data.protocol || null,
        callLink: data.callLink || null,
        grades: data.grades,
        feedback: data.feedback,
        createdAt: now
      });

      if (data.suggestPdi && data.pdiCompetenceId && data.pdiActionPlan && data.pdiDueDate) {
        const pdiId = doc(collection(db, 'pdis')).id;
        const selectedComp = competences.find(c => c.id === data.pdiCompetenceId);
        await setDoc(doc(db, 'pdis', pdiId), {
          id: pdiId,
          organizationId: profile.organizationId,
          operatorId: data.operatorId,
          evaluatorId: profile.uid,
          competenceId: data.pdiCompetenceId,
          competenceName: selectedComp?.name || 'Competência',
          actionPlan: data.pdiActionPlan,
          dueDate: data.pdiDueDate,
          status: 'pending',
          createdAt: now
        });
      }

      await updateDoc(doc(db, 'users', data.operatorId), {
        qaCycleStatus: 'evaluated',
        lastQaDate: now.split('T')[0]
      });
      showToast('Avaliação de QA registrada com sucesso!', 'success');
      setIsEvalModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar avaliação.', 'error');
    }
  };

  const handleResolvePdi = async (id: string, status: 'completed' | 'failed') => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode resolver PDIs.', 'error');
      return;
    }
    if (profile.organizationId === 'sandbox-test') {
      sandboxService.updatePdiStatus(id, status);
      showToast(`PDI do Sandbox atualizado para ${status === 'completed' ? 'Cumprido' : 'Não Cumprido'}!`, 'success');
      return;
    }
    try {
      await updateDoc(doc(db, 'pdis', id), { status });
      showToast(`PDI marcado como ${status === 'completed' ? 'Cumprido (Positivo)' : 'Não Cumprido (Negativo)'}!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar PDI.', 'error');
    }
  };

  const handleUpdateOperatorDates = async (operatorId: string, date: string) => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode agendar avaliações.', 'error');
      return;
    }
    setIsUpdatingDates(true);
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateOperatorQaDates(operatorId, date || undefined);
        showToast('Agendamento de QA salvo na memória!', 'success');
      } else {
        await updateDoc(doc(db, 'users', operatorId), {
          nextQaDate: date || null
        });
        showToast('Agendamento de QA atualizado com sucesso!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao agendar.', 'error');
    } finally {
      setIsUpdatingDates(false);
    }
  };

  const handleToggleCycleStatus = async (operatorId: string, currentStatus: 'pending' | 'evaluated') => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode alterar o status do ciclo.', 'error');
      return;
    }
    const nextStatus = currentStatus === 'evaluated' ? 'pending' : 'evaluated';
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateOperatorQaDates(operatorId, undefined, nextStatus);
        showToast('Status do ciclo alterado no sandbox!', 'success');
      } else {
        await updateDoc(doc(db, 'users', operatorId), {
          qaCycleStatus: nextStatus
        });
        showToast('Status do ciclo atualizado com sucesso!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao alterar status.', 'error');
    }
  };

  const handleSaveSettings = async (cycleDays: number, pdiDays: number) => {
    if (profile.role !== 'monitor') {
      showToast('Apenas o Monitor de Qualidade pode salvar configurações de ciclo.', 'error');
      return;
    }
    try {
      if (profile.organizationId === 'sandbox-test') {
        sandboxService.updateQaSettings(profile.organizationId, {
          evaluationCycleDays: cycleDays,
          pdiObservationDays: pdiDays
        });
        showToast('Configurações de QA salvas na memória!', 'success');
      } else {
        await setDoc(doc(db, 'qa_settings', `settings-${profile.organizationId}`), {
          id: `settings-${profile.organizationId}`,
          organizationId: profile.organizationId,
          evaluationCycleDays: cycleDays,
          pdiObservationDays: pdiDays
        });
        showToast('Configurações de QA salvas com sucesso!', 'success');
      }
      setIsSettingsOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar configurações.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* Mensagens de Alerta para Monitores */}
      {isSuperUser && expiredPdisCount > 0 && (
        <div className={`border rounded-2xl p-4 flex items-center justify-between gap-4 ${
          theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-rose-500 dark:text-rose-455 shrink-0" size={20} />
            <div>
              <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Alerta de PDIs Vencidos</p>
              <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>Existem {expiredPdisCount} Planos de Desenvolvimento expirados e sem conclusão pendentes de revisão.</p>
            </div>
          </div>
          <button 
            onClick={() => setQaSubTab('pdis')} 
            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border cursor-pointer ${
              theme === 'dark' 
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/20' 
                : 'bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-300'
            }`}
          >
            Revisar
          </button>
        </div>
      )}

      {/* Cabeçalho QA */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-3xl border gap-4 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h3 className={`text-lg font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Monitoria de Qualidade e Desenvolvimento</h3>
          <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Avalie ligações, extraia relatórios de radar de competências e gerencie PDIs.</p>
        </div>
        
        {profile.role === 'monitor' && (
          <button
            onClick={() => setIsEvalModalOpen(true)}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/10 flex items-center gap-2 self-stretch sm:self-auto justify-center cursor-pointer"
          >
            <Plus size={14} />
            Nova Avaliação
          </button>
        )}
      </div>

      {/* Abas Secundárias */}
      <div className={`flex p-1 rounded-2xl border w-fit ${
        theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-100 border-slate-200'
      }`}>
        {isSuperUser && (
          <button
            onClick={() => setQaSubTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              qaSubTab === 'overview' 
                ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-500 border border-slate-200/50 shadow-sm'
                : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visão Geral QA
          </button>
        )}
        <button
          onClick={() => setQaSubTab('evaluations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            qaSubTab === 'evaluations' 
              ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-500 border border-slate-200/50 shadow-sm'
              : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isSuperUser ? 'Avaliações Realizadas' : 'Minhas Avaliações'}
        </button>
        <button
          onClick={() => setQaSubTab('pdis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            qaSubTab === 'pdis' 
              ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-500 border border-slate-200/50 shadow-sm'
              : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          PDIs / Planos de Ação
        </button>
        {profile.role === 'monitor' && (
          <button
            onClick={() => setQaSubTab('competences')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              qaSubTab === 'competences' 
                ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-500 border border-slate-200/50 shadow-sm'
                : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Competências
          </button>
        )}
      </div>

      {/* Conteúdo das SubAbas */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 className="animate-spin text-sky-500" size={28} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sincronizando QA...</span>
        </div>
      ) : (
        <>
          {qaSubTab === 'overview' && isSuperUser && (
            <QaOverview
              profile={profile}
              currentTeamMembers={currentTeamMembers}
              selectedOperatorId={selectedOperatorId}
              setSelectedOperatorId={setSelectedOperatorId}
              editingNextQaDate={editingNextQaDate}
              setEditingNextQaDate={setEditingNextQaDate}
              isUpdatingDates={isUpdatingDates}
              onUpdateOperatorDates={handleUpdateOperatorDates}
              onToggleCycleStatus={handleToggleCycleStatus}
              onOpenSettings={() => setIsSettingsOpen(true)}
              stats={stats}
              opPerformance={opPerformance}
              isSuperUser={isSuperUser}
              theme={theme}
            />
          )}

          {qaSubTab === 'evaluations' && (
            <QaEvaluationsList
              evaluations={evaluations}
              currentTeamMembers={currentTeamMembers}
              competences={competences}
              isSuperUser={isSuperUser}
              theme={theme}
            />
          )}

          {qaSubTab === 'pdis' && (
            <PdiManager
              pdis={pdis}
              currentTeamMembers={currentTeamMembers}
              profile={profile}
              theme={theme}
              onResolvePdi={handleResolvePdi}
            />
          )}

          {qaSubTab === 'competences' && profile.role === 'monitor' && (
            <CompetenceManager
              competences={competences}
              isSuperUser={isSuperUser}
              profile={profile}
              theme={theme}
              onEditComp={(comp) => {
                setEditingCompetence(comp);
                setIsCompModalOpen(true);
              }}
              onDeleteComp={handleDeleteComp}
              onNewComp={() => {
                setEditingCompetence(null);
                setIsCompModalOpen(true);
              }}
            />
          )}
        </>
      )}

      {/* Modais de QA */}
      <QaModals
        theme={theme}
        profile={profile}
        currentTeamMembers={currentTeamMembers}
        competences={competences}
        qaSettings={qaSettings}
        isCompModalOpen={isCompModalOpen}
        setIsCompModalOpen={setIsCompModalOpen}
        editingCompetence={editingCompetence}
        onSaveCompetence={handleSaveCompetence}
        isEvalModalOpen={isEvalModalOpen}
        setIsEvalModalOpen={setIsEvalModalOpen}
        onSaveEvaluation={handleSaveEvaluation}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
};
