import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, QaCompetence, QaEvaluation, Pdi, Team } from '../../types';
import { 
  Medal as Award, ShieldWarning as ShieldAlert, Plus, Pencil as Edit2, Trash as Trash2, Calendar, 
  ChatText as MessageSquare, CircleNotch as Loader2, Sparkle as Sparkles, CheckSquare, XSquare, 
  CaretRight as ChevronRight, ArrowUpRight, CheckCircle as CheckCircle2, Warning as AlertTriangle, 
  Clock, TrendUp as TrendingUp, Compass
} from '@phosphor-icons/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

interface QaDashboardProps {
  profile: UserProfile;
  currentTeamMembers: UserProfile[];
  managedTeamsData: Team[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const QaDashboard = ({
  profile,
  currentTeamMembers,
  managedTeamsData,
  showToast,
  theme = 'dark'
}: QaDashboardProps) => {
  const isSuperUser = profile.role === 'supervisor' || profile.role === 'manager' || profile.role === 'super_admin' || profile.role === 'monitor';

  // Estados principais
  const [competences, setCompetences] = useState<QaCompetence[]>([]);
  const [evaluations, setEvaluations] = useState<QaEvaluation[]>([]);
  const [pdis, setPdis] = useState<Pdi[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de navegação interna
  const [qaSubTab, setQaSubTab] = useState<'overview' | 'evaluations' | 'pdis' | 'competences'>(
    isSuperUser ? 'overview' : 'evaluations'
  );

  // Estados dos Modais / Formulários
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [isPdiModalOpen, setIsPdiModalOpen] = useState(false);

  // Formulário Competência
  const [editingCompetence, setEditingCompetence] = useState<QaCompetence | null>(null);
  const [compName, setCompName] = useState('');
  const [compWeight, setCompWeight] = useState(1);
  const [compDesc, setCompDesc] = useState('');

  // Formulário Avaliação
  const [evalOperatorId, setEvalOperatorId] = useState('');
  const [evalCallId, setEvalCallId] = useState('');
  const [evalProtocol, setEvalProtocol] = useState('');
  const [evalCallLink, setEvalCallLink] = useState('');
  const [evalGrades, setEvalGrades] = useState<Record<string, number>>({});
  const [evalFeedback, setEvalFeedback] = useState('');
  // PDI sugerido
  const [suggestPdi, setSuggestPdi] = useState(false);
  const [pdiCompetenceId, setPdiCompetenceId] = useState('');
  const [pdiActionPlan, setPdiActionPlan] = useState('');
  const [pdiDueDate, setPdiDueDate] = useState('');

  // Escutas em Tempo Real
  useEffect(() => {
    if (!profile.organizationId) return;

    setLoading(true);

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
      unsubscribeComp();
      unsubscribeEval();
      unsubscribePdi();
    };
  }, [profile.organizationId, profile.uid, isSuperUser]);

  // Estatísticas e Analytics de QA
  const stats = useMemo(() => {
    if (evaluations.length === 0) return { avgScore: 0, totalEvals: 0, radarData: [], worstCompetence: 'N/A' };

    const sum = evaluations.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = sum / evaluations.length;

    // Calcular médias de competências
    const competenceSum: Record<string, { total: number; count: number }> = {};
    competences.forEach(c => {
      competenceSum[c.id] = { total: 0, count: 0 };
    });

    evaluations.forEach(e => {
      Object.entries(e.grades).forEach(([compId, grade]) => {
        if (competenceSum[compId]) {
          competenceSum[compId].total += grade as number;
          competenceSum[compId].count += 1;
        }
      });
    });

    const radarData = competences.map(c => {
      const info = competenceSum[c.id];
      const avg = info && info.count > 0 ? info.total / info.count : 0;
      return {
        subject: c.name,
        Média: Math.round(avg),
        fullMark: 100
      };
    });

    // Pior Competência
    let worstCompName = 'N/A';
    let worstAvg = 101;
    competences.forEach(c => {
      const info = competenceSum[c.id];
      const avg = info && info.count > 0 ? info.total / info.count : 0;
      if (info && info.count > 0 && avg < worstAvg) {
        worstAvg = avg;
        worstCompName = c.name;
      }
    });

    return {
      avgScore,
      totalEvals: evaluations.length,
      radarData,
      worstCompetence: worstCompName
    };
  }, [evaluations, competences]);

  // Alerta de PDIs Vencidos para Supervisores
  const expiredPdisCount = useMemo(() => {
    return pdis.filter(p => p.status === 'expired').length;
  }, [pdis]);

  // Handlers CRUD Competência
  const handleSaveCompetence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;

    try {
      if (editingCompetence) {
        await updateDoc(doc(db, 'qa_competences', editingCompetence.id), {
          name: compName,
          weight: compWeight,
          description: compDesc
        });
        showToast('Competência atualizada!', 'success');
      } else {
        const id = doc(collection(db, 'qa_competences')).id;
        await setDoc(doc(db, 'qa_competences', id), {
          id,
          organizationId: profile.organizationId,
          name: compName,
          weight: compWeight,
          description: compDesc
        });
        showToast('Competência criada!', 'success');
      }
      setIsCompModalOpen(false);
      setEditingCompetence(null);
      setCompName('');
      setCompWeight(1);
      setCompDesc('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar competência.', 'error');
    }
  };

  const handleEditCompClick = (comp: QaCompetence) => {
    setEditingCompetence(comp);
    setCompName(comp.name);
    setCompWeight(comp.weight || 1);
    setCompDesc(comp.description || '');
    setIsCompModalOpen(true);
  };

  const handleDeleteComp = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta competência?')) return;
    try {
      await deleteDoc(doc(db, 'qa_competences', id));
      showToast('Competência excluída.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir.', 'error');
    }
  };

  // Handler de Avaliação
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalOperatorId) {
      showToast('Selecione um operador.', 'warning');
      return;
    }

    // Validar se todas as competências receberam nota
    let gradesFilled = true;
    competences.forEach(c => {
      if (evalGrades[c.id] === undefined) {
        gradesFilled = false;
      }
    });

    if (!gradesFilled) {
      showToast('Por favor, defina notas (0 a 100) para todas as competências.', 'warning');
      return;
    }

    try {
      // Calcular a média final
      let sumGrades = 0;
      let sumWeights = 0;
      competences.forEach(c => {
        const grade = evalGrades[c.id];
        const weight = c.weight || 1;
        sumGrades += grade * weight;
        sumWeights += weight;
      });

      const finalScore = sumGrades / (sumWeights || 1);
      const evalId = doc(collection(db, 'qa_evaluations')).id;
      const now = new Date().toISOString();

      await setDoc(doc(db, 'qa_evaluations', evalId), {
        id: evalId,
        organizationId: profile.organizationId,
        operatorId: evalOperatorId,
        evaluatorId: profile.uid,
        score: Math.round(finalScore),
        callId: evalCallId || null,
        protocol: evalProtocol || null,
        callLink: evalCallLink || null,
        grades: evalGrades,
        feedback: evalFeedback,
        createdAt: now
      });

      // Se optou por criar PDI
      if (suggestPdi && pdiCompetenceId && pdiActionPlan && pdiDueDate) {
        const pdiId = doc(collection(db, 'pdis')).id;
        const selectedComp = competences.find(c => c.id === pdiCompetenceId);
        await setDoc(doc(db, 'pdis', pdiId), {
          id: pdiId,
          organizationId: profile.organizationId,
          operatorId: evalOperatorId,
          evaluatorId: profile.uid,
          competenceId: pdiCompetenceId,
          competenceName: selectedComp?.name || 'Competência',
          actionPlan: pdiActionPlan,
          dueDate: pdiDueDate,
          status: 'pending',
          createdAt: now
        });
      }

      showToast('Avaliação de QA registrada com sucesso!', 'success');
      setIsEvalModalOpen(false);
      resetEvalForm();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar avaliação.', 'error');
    }
  };

  const resetEvalForm = () => {
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
  };

  // Handler PDI Concluir
  const handleCompletePdi = async (id: string) => {
    try {
      await updateDoc(doc(db, 'pdis', id), { status: 'completed' });
      showToast('PDI marcado como Concluído!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar PDI.', 'error');
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
            <AlertTriangle className="text-rose-500 dark:text-rose-400 shrink-0" size={20} />
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
        
        {isSuperUser && (
          <button
            onClick={() => setIsEvalModalOpen(true)}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-550/10 flex items-center gap-2 self-stretch sm:self-auto justify-center cursor-pointer"
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
                ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-655 border border-slate-200/50 shadow-sm'
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
              ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-655 border border-slate-200/50 shadow-sm'
              : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isSuperUser ? 'Avaliações Realizadas' : 'Minhas Avaliações'}
        </button>
        <button
          onClick={() => setQaSubTab('pdis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            qaSubTab === 'pdis' 
              ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-655 border border-slate-200/50 shadow-sm'
              : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          PDIs / Planos de Ação
        </button>
        {isSuperUser && (
          <button
            onClick={() => setQaSubTab('competences')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              qaSubTab === 'competences' 
                ? theme === 'dark' ? 'bg-white/5 text-white' : 'bg-white text-sky-655 border border-slate-200/50 shadow-sm'
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KPIs de Qualidade */}
              <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
                <div className={`p-6 rounded-3xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Média de Qualidade</p>
                    <h3 className={`text-3xl font-black mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {stats.avgScore > 0 ? `${stats.avgScore.toFixed(1)}%` : '0.0%'}
                    </h3>
                  </div>
                  <div className="p-3.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-500/20">
                    <Award size={22} />
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pontos Fracos Comuns</p>
                    <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 truncate max-w-[150px]" title={stats.worstCompetence}>
                      {stats.worstCompetence}
                    </h3>
                  </div>
                  <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-455 rounded-2xl border border-rose-500/20">
                    <ShieldAlert size={22} />
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avaliações Concluídas</p>
                    <h3 className={`text-2xl font-black mt-1 ${
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>{stats.totalEvals} no total</h3>
                  </div>
                  <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 rounded-2xl border border-emerald-500/20">
                    <CheckCircle2 size={22} />
                  </div>
                </div>
              </div>

              {/* Gráfico de Radar de Competências */}
              <div className={`p-6 rounded-3xl border min-h-[300px] ${
                theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <h4 className={`text-sm font-bold uppercase tracking-tight flex items-center gap-2 mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  <Compass size={16} className="text-sky-500 dark:text-sky-400" />
                  Evolução por Competência (Radar)
                </h4>
                
                {stats.radarData.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs italic">Nenhuma avaliação realizada para desenhar gráfico.</div>
                ) : (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarData}>
                        <PolarGrid stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: theme === 'dark' ? '#475569' : '#94a3b8' }} />
                        <Radar name="Média Qualidade" dataKey="Média" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} />
                        <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {qaSubTab === 'evaluations' && (
            <div className={`rounded-[2rem] border overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              {evaluations.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm italic">
                  Nenhuma avaliação registrada ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className={`border-b text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ${
                        theme === 'dark' ? 'border-white/5 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <th className="px-6 py-4">Data</th>
                        {isSuperUser && <th className="px-6 py-4">Operador</th>}
                        <th className="px-6 py-4">Mídia / Protocolo</th>
                        <th className="px-6 py-4">Nota</th>
                        <th className="px-6 py-4">Competências Chave</th>
                        <th className="px-6 py-4">Feedback do Monitor</th>
                      </tr>
                    </thead>
                    <tbody className={`text-xs divide-y ${
                      theme === 'dark' ? 'text-slate-300 divide-white/[0.02]' : 'text-slate-700 divide-slate-100'
                    }`}>
                      {evaluations.map(e => {
                        const opName = currentTeamMembers.find(m => m.uid === e.operatorId)?.displayName || 'Operador';
                        
                        return (
                          <tr key={e.id} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                            <td className="px-6 py-4 font-bold text-slate-400">
                              {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            {isSuperUser && (
                              <td className={`px-6 py-4 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {opName}
                              </td>
                            )}
                            <td className="px-6 py-4 font-mono text-[11px]">
                              {e.callId && <div className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>ID: {e.callId}</div>}
                              {e.protocol && <div className="text-slate-400 dark:text-slate-500">Prot: {e.protocol}</div>}
                              {e.callLink && (
                                <a 
                                  href={e.callLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sky-655 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                >
                                  Ouvir Áudio <ArrowUpRight size={10} />
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                                e.score >= 85 
                                  ? theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                                  : e.score >= 70 
                                    ? theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-250'
                                    : theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-250'
                              }`}>
                                {e.score}%
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(e.grades).map(([id, grade]) => {
                                  const cName = competences.find(c => c.id === id)?.name || 'Comp';
                                  return (
                                    <span key={id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                      theme === 'dark' ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {cName}: {grade}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 italic text-slate-455 dark:text-slate-400 max-w-[250px] truncate" title={e.feedback}>
                              "{e.feedback}"
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {qaSubTab === 'pdis' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdis.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-500 text-sm italic">
                  Nenhum PDI cadastrado para visualização.
                </div>
              ) : (
                pdis.map(p => {
                  const opName = currentTeamMembers.find(m => m.uid === p.operatorId)?.displayName || 'Operador';
                  
                  return (
                    <div 
                      key={p.id}
                      className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                        p.status === 'completed' 
                          ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/15' 
                          : p.status === 'expired'
                            ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/15'
                            : `border ${theme === 'dark' ? 'bg-slate-900/10 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-slate-550 dark:text-slate-500 uppercase tracking-widest block">Colaborador</span>
                            <h4 className={`text-sm font-bold mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{opName}</h4>
                          </div>

                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                            p.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                              : p.status === 'expired'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-255 dark:border-amber-500/20'
                          }`}>
                            {p.status === 'completed' ? 'Concluído' : p.status === 'expired' ? 'Expirado' : 'Pendente'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-slate-550 dark:text-slate-500 uppercase tracking-widest block">Competência em Foco</span>
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5 block">{p.competenceName}</span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-xs italic ${
                          theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          "{p.actionPlan}"
                        </div>
                      </div>

                      <div className={`flex justify-between items-center border-t pt-3 ${
                        theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                      }`}>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Calendar size={12} />
                          Limite: {p.dueDate.split('-').reverse().join('/')}
                        </span>

                        {isSuperUser && p.status === 'pending' && (
                          <button
                            onClick={() => handleCompletePdi(p.id)}
                            className="px-3 py-1.5 bg-emerald-555 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 size={10} />
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {qaSubTab === 'competences' && isSuperUser && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Competências Cadastradas</h4>
                <button
                  onClick={() => {
                    setEditingCompetence(null);
                    setCompName('');
                    setCompWeight(1);
                    setCompDesc('');
                    setIsCompModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                  }`}
                >
                  <Plus size={12} /> Nova Competência
                </button>
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

                    <div className={`flex justify-end gap-2 border-t pt-3 ${
                      theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                    }`}>
                      <button
                        onClick={() => handleEditCompClick(c)}
                        className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-white/5 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 border-white/5' 
                            : 'bg-slate-50 hover:bg-sky-550/10 text-slate-500 hover:text-sky-600 border-slate-200'
                        }`}
                        title="Editar"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteComp(c.id)}
                        className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-white/5' 
                            : 'bg-slate-50 hover:bg-rose-550/10 text-slate-550 hover:text-rose-600 border-slate-200'
                        }`}
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL CADASTRAR/EDITAR COMPETENCIA */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsCompModalOpen(false)} />
          <div className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {editingCompetence ? 'Editar Competência' : 'Adicionar Competência'}
            </h3>

            <form onSubmit={handleSaveCompetence} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Competência *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Negociação Avançada"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl outline-none text-xs ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Peso na Avaliação</label>
                <input 
                  type="number" 
                  min={1} 
                  max={5}
                  value={compWeight}
                  onChange={(e) => setCompWeight(parseInt(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl outline-none text-xs ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Descrição explicativa</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Capacidade de expor valores e propostas sem gaguejar."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl outline-none text-xs resize-none ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs border cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800' 
                      : 'bg-slate-105 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 rounded-xl font-bold text-white text-xs shadow-lg shadow-sky-555/10 cursor-pointer"
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
          <div className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsEvalModalOpen(false)} />
          <div className={`relative w-full max-w-3xl rounded-3xl border p-8 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Avaliação de Qualidade de Atendimento</h3>

            <form onSubmit={handleSaveEvaluation} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Operador */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Selecionar Operador *</label>
                  <select
                    required
                    value={evalOperatorId}
                    onChange={(e) => setEvalOperatorId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl outline-none text-xs cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="" disabled>Escolha o colaborador...</option>
                    {currentTeamMembers.map(m => (
                      <option key={m.uid} value={m.uid} className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{m.displayName || m.email.split('@')[0]}</option>
                    ))}
                  </select>
                </div>

                {/* ID Ligacao */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">ID da Ligação (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: CALL-89472"
                    value={evalCallId}
                    onChange={(e) => setEvalCallId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl outline-none text-xs ${
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
                    className={`w-full px-4 py-3 rounded-xl outline-none text-xs ${
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
                    className={`w-full px-4 py-3 rounded-xl outline-none text-xs ${
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
                  className={`w-full px-4 py-3 rounded-xl outline-none text-xs resize-none ${
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
                    theme === 'dark' ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-655 group-hover:text-slate-800'
                  }`}>
                    Criar PDI (Plano de Desenvolvimento Individual) associado?
                  </span>
                </label>

                {suggestPdi && (
                  <div className={`p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-down ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Foco de Melhoria (Competência) *</label>
                      <select
                        required={suggestPdi}
                        value={pdiCompetenceId}
                        onChange={(e) => setPdiCompetenceId(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl outline-none text-xs cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="" disabled>Selecione a competência...</option>
                        {competences.map(c => (
                          <option key={c.id} value={c.id} className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Prazo de Cumprimento *</label>
                      <input
                        type="date"
                        required={suggestPdi}
                        value={pdiDueDate}
                        onChange={(e) => setPdiDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-2.5 rounded-xl outline-none text-xs ${
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
                        className={`w-full px-4 py-2.5 rounded-xl outline-none text-xs resize-none ${
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
                      : 'bg-slate-105 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-sky-500 hover:bg-sky-400 rounded-xl font-bold text-white text-xs shadow-lg shadow-sky-555/10 cursor-pointer"
                >
                  Enviar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
