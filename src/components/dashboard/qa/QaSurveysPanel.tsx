import React, { useState, useEffect, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { 
  EmployeeSurveyConfig, 
  EmployeeSurveyResponse, 
  SurveyFrequency, 
  Team, 
  UserProfile 
} from '../../../types';
import { 
  getActiveSurveyConfig, 
  saveSurveyConfig, 
  subscribeSurveyResponses, 
  calculateSurveyStats 
} from '../../../lib/surveyService';
import { ExcelExportModal } from '../../modals/ExcelExportModal';
import { ExcelExportColumn } from '../../../utils/excelExport';
import { 
  SlidersHorizontal, 
  Smiley, 
  Star, 
  Lock, 
  CheckCircle, 
  ChatCircleText, 
  ChartBar, 
  FileCsv as FileSpreadsheet,
  Users,
  Calendar,
  Sparkles,
  Heart,
  Tag,
  CircleNotch as Spinner
} from '@phosphor-icons/react';

interface QaSurveysPanelProps {
  profile: UserProfile;
  managedTeamsData: Team[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
}

export const QaSurveysPanel: React.FC<QaSurveysPanelProps> = ({
  profile,
  managedTeamsData,
  showToast,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  // Configuração da Pesquisa
  const [config, setConfig] = useState<EmployeeSurveyConfig>({
    id: 'active_survey_config',
    organizationId: profile.organizationId || 'default',
    question: 'Em uma escala de 0 a 10, o quanto você recomendaria o ambiente de trabalho para um colega?',
    scaleType: '0_10',
    allowComments: true,
    commentPlaceholder: 'Deixe aqui sua sugestão ou comentário anônimo...',
    frequency: 'weekly',
    targetTeamIds: [],
    isActive: true,
    createdBy: profile.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [responses, setResponses] = useState<EmployeeSurveyResponse[]>([]);
  const [filterRatingGroup, setFilterRatingGroup] = useState<'all' | 'promoters' | 'neutrals' | 'detractors'>('all');
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Carrega a configuração ativa
  useEffect(() => {
    async function load() {
      setLoadingConfig(true);
      try {
        const active = await getActiveSurveyConfig(profile.organizationId || 'default');
        if (active) {
          setConfig(active);
        }
      } catch (err) {
        console.error('Erro ao carregar configuração de pesquisa:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    load();
  }, [profile.organizationId]);

  // Escuta as respostas em tempo real
  useEffect(() => {
    if (!config.id) return;
    const unsub = subscribeSurveyResponses(
      profile.organizationId || 'default',
      config.id,
      (data) => setResponses(data)
    );
    return () => unsub();
  }, [config.id, profile.organizationId]);

  // Salva a configuração
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSurveyConfig({
        ...config,
        organizationId: profile.organizationId || 'default',
        createdBy: profile.uid
      });
      showToast('Configuração de pesquisa de clima salva com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar pesquisa:', err);
      showToast('Erro ao salvar configuração.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtra as respostas para o mural
  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      if (filterTeamId !== 'all' && r.teamId !== filterTeamId) return false;

      if (filterRatingGroup === 'promoters' && r.rating < 9) return false;
      if (filterRatingGroup === 'neutrals' && (r.rating < 7 || r.rating > 8)) return false;
      if (filterRatingGroup === 'detractors' && r.rating > 6) return false;

      return true;
    });
  }, [responses, filterRatingGroup, filterTeamId]);

  // Estatísticas e eNPS
  const stats = useMemo(() => calculateSurveyStats(responses), [responses]);

  // Opções para gráfico ApexCharts de Distribuição
  const distributionChartOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = config.scaleType === '0_10' 
      ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
      : ['1', '2', '3', '4', '5'];

    const dataSeries = categories.map(cat => stats.distribution[Number(cat)] || 0);

    return {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        background: 'transparent'
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      colors: config.scaleType === '0_10' 
        ? ['#f43f5e', '#f43f5e', '#f43f5e', '#f43f5e', '#f43f5e', '#f43f5e', '#f43f5e', '#f59e0b', '#f59e0b', '#10b981', '#10b981']
        : ['#0284c7', '#06b6d4', '#3b82f6', '#f59e0b', '#10b981'],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '55%',
          distributed: true,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => String(val),
        offsetY: -20,
        style: { colors: [isDark ? '#f8fafc' : '#0f172a'], fontSize: '11px', fontWeight: 'bold' }
      },
      xaxis: {
        categories,
        labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: { show: false },
      grid: { show: false },
      legend: { show: false },
      tooltip: { theme: isDark ? 'dark' : 'light' }
    };
  }, [config.scaleType, stats.distribution, isDark]);

  const distributionChartSeries = useMemo(() => {
    const categories = config.scaleType === '0_10' 
      ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
      : ['1', '2', '3', '4', '5'];

    return [{
      name: 'Respostas',
      data: categories.map(cat => stats.distribution[Number(cat)] || 0)
    }];
  }, [config.scaleType, stats.distribution]);

  // Colunas de Exportação em Excel
  const surveyExportColumns: ExcelExportColumn[] = [
    { key: 'id', label: 'ID da Resposta', type: 'text' },
    { key: 'rating', label: 'Nota / Avaliação', type: 'number' },
    { key: 'scaleType', label: 'Tipo de Escala', type: 'text' },
    { key: 'teamName', label: 'Equipe do Respondedor', type: 'text' },
    { key: 'comment', label: 'Comentário Anônimo', type: 'text' },
    { key: 'createdAtFormatted', label: 'Data do Envio', type: 'date' }
  ];

  const surveyExportData = useMemo(() => {
    return responses.map(r => {
      const team = managedTeamsData.find(t => t.id === r.teamId);
      return {
        ...r,
        teamName: team ? team.name : 'Equipe Geral',
        comment: r.comment || '-',
        createdAtFormatted: new Date(r.createdAt).toLocaleDateString('pt-BR')
      };
    });
  }, [responses, managedTeamsData]);

  if (loadingConfig) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Spinner size={32} className="animate-spin mb-3 text-sky-400" />
        <p className="text-xs font-bold uppercase tracking-wider">Carregando Pesquisa de Clima...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER DA ABA COM AVISO 100% ANÔNIMO */}
      <div className={`p-6 rounded-3xl border relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} weight="fill" />
                <span>100% Anônimo & Confidencial</span>
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Heart size={24} className="text-rose-500" weight="fill" />
              <span>Pesquisas de Clima Interno & eNPS</span>
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Monitore a satisfação dos colaboradores, configure perguntas de eNPS e acompanhe comentários anônimos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer transition-all active:scale-95 shadow-sm self-start md:self-auto"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Resultados (Excel)</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE KPIS & METRICAS DE SATISFAÇÃO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Respostas */}
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Respostas</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-black">{stats.totalResponses}</p>
          <span className="text-[11px] text-slate-400 font-medium">Feedbacks registrados</span>
        </div>

        {/* KPI 2: Média Geral */}
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score Médio</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star size={18} weight="fill" />
            </div>
          </div>
          <p className="text-2xl font-black">{stats.averageScore} <span className="text-xs text-slate-400 font-normal">/ {config.scaleType === '0_10' ? '10' : '5'}</span></p>
          <span className="text-[11px] text-slate-400 font-medium">Nota média geral</span>
        </div>

        {/* KPI 3: eNPS Index */}
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Índice eNPS</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles size={18} weight="fill" />
            </div>
          </div>
          <p className="text-2xl font-black">
            {stats.enpsScore !== null ? (stats.enpsScore > 0 ? `+${stats.enpsScore}` : stats.enpsScore) : 'N/A'}
          </p>
          <span className="text-[11px] text-emerald-400 font-bold">Zona de {stats.enpsZone}</span>
        </div>

        {/* KPI 4: Promotores vs Detretores */}
        <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Promotores / Detretores</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ChartBar size={18} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-emerald-400">{stats.promotersPercentage}% P</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-sm font-black text-rose-400">{stats.detractorsPercentage}% D</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{stats.neutralsPercentage}% Neutros</span>
        </div>
      </div>

      {/* SEÇÃO 1: FORMULÁRIO DE CONFIGURAÇÃO DA PESQUISA */}
      <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal size={20} className="text-sky-400" />
          <h3 className="text-base font-black">Configuração da Pesquisa Ativa (QA)</h3>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-5">
          {/* Pergunta Principal */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">
              Pergunta / Frase da Pesquisa
            </label>
            <input
              type="text"
              value={config.question}
              onChange={(e) => setConfig({ ...config, question: e.target.value })}
              placeholder="Ex: Em uma escala de 0 a 10, o quanto você recomendaria a empresa..."
              className={`w-full p-3.5 rounded-2xl text-xs font-bold outline-none border transition-all ${
                isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Escala */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">
                Tipo de Escala
              </label>
              <select
                value={config.scaleType}
                onChange={(e) => setConfig({ ...config, scaleType: e.target.value as any })}
                className={`w-full p-3.5 rounded-2xl text-xs font-bold outline-none border transition-all cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="0_10">Escala 0 a 10 (Padrão eNPS)</option>
                <option value="stars">Escala 1 a 5 Estrelas</option>
                <option value="emojis">Escala 1 a 5 Emojis / Reações</option>
              </select>
            </div>

            {/* Frequência */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">
                Frequência de Exibição
              </label>
              <select
                value={config.frequency}
                onChange={(e) => setConfig({ ...config, frequency: e.target.value as SurveyFrequency })}
                className={`w-full p-3.5 rounded-2xl text-xs font-bold outline-none border transition-all cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="daily">Diário (1x por dia)</option>
                <option value="weekly">Semanal (1x por semana)</option>
                <option value="biweekly">Quinzenal (1x a cada 14 dias)</option>
                <option value="monthly">Mensal (1x a cada 30 dias)</option>
                <option value="quarterly">Trimestral (1x a cada 90 dias)</option>
                <option value="semiannual">Semestral (1x a cada 180 dias)</option>
                <option value="annual">Anual (1x a cada 365 dias)</option>
                <option value="once">Ao Entrar / Próximo Acesso (1x apenas)</option>
                <option value="disabled">Pausado / Desativado</option>
              </select>
            </div>

            {/* Status Ativo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">
                Status da Pesquisa
              </label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                className={`w-full p-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  config.isActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}
              >
                <CheckCircle size={16} weight={config.isActive ? 'fill' : 'regular'} />
                <span>{config.isActive ? 'Pesquisa ATIVA' : 'Pesquisa PAUSADA'}</span>
              </button>
            </div>
          </div>

          {/* Seleção de Destinatários por Equipe */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">
              Destinatários (Equipes Específicas ou Todos)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, targetTeamIds: [] })}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  config.targetTeamIds.length === 0 
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                    : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                Todos os Colaboradores
              </button>

              {managedTeamsData.map((team) => {
                const isSelected = config.targetTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      const next = isSelected 
                        ? config.targetTeamIds.filter(id => id !== team.id)
                        : [...config.targetTeamIds, team.id];
                      setConfig({ ...config, targetTeamIds: next });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' 
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {team.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Spinner size={16} className="animate-spin" /> : <Sparkles size={16} weight="fill" />}
              <span>Salvar Configurações da Pesquisa</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 2: GRÁFICO DE DISTRIBUIÇÃO E MURAL DE COMENTÁRIOS ANÔNIMOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico ApexCharts */}
        <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-black mb-4 flex items-center gap-2">
            <ChartBar size={18} className="text-sky-400" />
            <span>Distribuição das Notas</span>
          </h3>

          {responses.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-medium">
              Nenhuma resposta registrada até o momento.
            </div>
          ) : (
            <div className="h-64">
              <Chart
                options={distributionChartOptions}
                series={distributionChartSeries}
                type="bar"
                height="100%"
              />
            </div>
          )}
        </div>

        {/* Mural de Comentários Anônimos */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border flex flex-col ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-black flex items-center gap-2">
              <ChatCircleText size={18} className="text-emerald-400" />
              <span>Mural de Comentários Anônimos ({filteredResponses.length})</span>
            </h3>

            {/* Filtros do Mural */}
            <div className="flex items-center gap-2">
              <select
                value={filterRatingGroup}
                onChange={(e) => setFilterRatingGroup(e.target.value as any)}
                className={`p-2 rounded-xl text-[11px] font-bold outline-none border transition-all cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">Todas as Notas</option>
                <option value="promoters">Promotores (9-10)</option>
                <option value="neutrals">Neutros (7-8)</option>
                <option value="detractors">Detretores (0-6)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
            {filteredResponses.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-medium">
                Nenhum comentário encontrado com os filtros aplicados.
              </div>
            ) : (
              filteredResponses.map((item) => {
                let badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                if (item.rating >= 9) badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                else if (item.rating >= 7) badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-black ${badgeColor}`}>
                          Nota: {item.rating}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <Lock size={10} className="text-emerald-400" />
                          <span>Colaborador Anônimo</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.comment ? `"${item.comment}"` : <em className="text-slate-500 opacity-70">Sem comentário em texto.</em>}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Exportação em Excel */}
      <ExcelExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Relatório Anônimo de Pesquisa de Clima Interno"
        defaultFilename={`Relatorio_Pesquisa_Clima_${new Date().toISOString().split('T')[0]}.xlsx`}
        availableColumns={surveyExportColumns}
        data={surveyExportData}
        showToast={showToast}
        theme={theme}
      />
    </div>
  );
};
