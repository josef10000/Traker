import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkle, 
  UserCheck, 
  BuildingOffice, 
  Users, 
  ShieldCheck, 
  ChartLineUp, 
  ArrowRight,
  Eye,
  Crown,
  Briefcase,
  FileCsv as FileSpreadsheet
} from '@phosphor-icons/react';
import { UserRole, UserProfile } from '../../types';
import { SpotlightCard } from '../ui/SpotlightCard';

interface DemoPageProps {
  onStartDemo: (simulatedRole: UserRole) => void;
}

export const DemoPage: React.FC<DemoPageProps> = ({ onStartDemo }) => {
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get('role') as UserRole | null;
  const validRoles: UserRole[] = ['manager', 'coordinator', 'supervisor', 'member', 'backoffice', 'monitor'];
  const isRestrictedRole = Boolean(roleParam && validRoles.includes(roleParam));

  const [selectedRole, setSelectedRole] = useState<UserRole>(isRestrictedRole && roleParam ? roleParam : 'manager');

  React.useEffect(() => {
    if (isRestrictedRole && roleParam) {
      setSelectedRole(roleParam);
    }
  }, [isRestrictedRole, roleParam]);

  const rolesList: Array<{ role: UserRole; label: string; desc: string; icon: any; color: string }> = [
    {
      role: 'manager',
      label: '🏢 Gerente da Empresa',
      desc: 'Acesso total à gestão da empresa, criação de equipes, indicadores globais e setup de liderança.',
      icon: BuildingOffice,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      role: 'coordinator',
      label: '🎯 Coordenador de Operações',
      desc: 'Acesso à gestão operacional da empresa, acompanhamento de metas, presenças e relatórios.',
      icon: ChartLineUp,
      color: 'from-sky-500 to-blue-600'
    },
    {
      role: 'supervisor',
      label: '👥 Supervisor de Equipe',
      desc: 'Gestão direta do time, lançamento de ocorrências diárias, feedbacks privados e acertos.',
      icon: Users,
      color: 'from-emerald-500 to-teal-600'
    },
    {
      role: 'member',
      label: '🎧 Operador de Cobrança',
      desc: 'Visão do colaborador, registro de pontos, batimento de metas individuais e extratos.',
      icon: Briefcase,
      color: 'from-amber-500 to-orange-600'
    },
    {
      role: 'backoffice',
      label: '📑 Back Office',
      desc: 'Agilidade para subir e baixar planilhas, dar nomes às colunas, melhorar a visualização, verificar o seu trabalho e buscar dados como CPF com velocidade e centralização.',
      icon: FileSpreadsheet,
      color: 'from-cyan-500 to-teal-600'
    },
    {
      role: 'monitor',
      label: '🛡️ Monitor / QA',
      desc: 'Avaliação de qualidade das chamadas e auditoria de conformidade operacional.',
      icon: ShieldCheck,
      color: 'from-rose-500 to-pink-600'
    }
  ];

  const displayedRoles = isRestrictedRole 
    ? rolesList.filter(r => r.role === roleParam)
    : rolesList;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Luzes de Fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-8 z-10 my-8"
      >
        {/* CABEÇALHO DA DEMO */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-black uppercase tracking-widest">
            <Sparkle size={16} weight="bold" />
            <span>Ambiente Interativo de Demonstração</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            <span className="animated-gradient-text">Simulador de Experiência Tracker</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {isRestrictedRole 
              ? 'Ambiente seguro de demonstração para o cargo selecionado. Clique abaixo para iniciar seu teste!'
              : 'Selecione qualquer cargo abaixo para acessar a plataforma instantaneamente sem necessidade de login. Teste as telas, ocorrências e recursos em tempo real!'}
          </p>
        </div>

        {/* LISTA DE CARGOS SIMULADOS */}
        <motion.div
          className={`grid gap-4 ${isRestrictedRole ? 'max-w-md mx-auto grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
            hidden: {},
          }}
        >
          {displayedRoles.map((item) => {
            const IconComp = item.icon;
            const isSelected = selectedRole === item.role;

            return (
              <motion.div
                key={item.role}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } },
                }}
              >
                <SpotlightCard
                  spotlightColor={isSelected ? 'rgba(168, 85, 247, 0.35)' : 'rgba(99, 102, 241, 0.2)'}
                  onClick={() => setSelectedRole(item.role)}
                  className={`p-5 text-left cursor-pointer transition-all flex flex-col justify-between h-full ${
                    isSelected
                      ? 'bg-slate-900/90 border-purple-500/80 shadow-2xl shadow-purple-500/20 ring-2 ring-purple-500/50'
                      : 'bg-slate-900/40 border-white/10 hover:border-purple-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    <motion.div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg`}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <IconComp size={24} weight="bold" />
                    </motion.div>

                    <div>
                      <h3 className="font-bold text-base text-white">{item.label}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-purple-400">
                    <span>{isSelected ? 'Cargo Selecionado' : 'Clique para Selecionar'}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-purple-400 bg-purple-400/20' : 'border-slate-600'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* BOTÃO DE ENTRADA NO SANDBOX */}
        <div className="flex flex-col items-center justify-center space-y-4 pt-4 border-t border-white/10">
          <motion.button
            type="button"
            onClick={() => onStartDemo(selectedRole)}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="liquid-glass-btn px-8 py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider cursor-pointer flex items-center gap-3 bg-gradient-to-r from-purple-600/80 via-indigo-600/80 to-sky-600/80"
          >
            <span>Iniciar Demonstração como {rolesList.find(r => r.role === selectedRole)?.label}</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={20} weight="bold" />
            </motion.span>
          </motion.button>

          <p className="text-xs text-slate-500">
            🔒 Ambiente seguro de demonstração. Recursos confidenciais de infraestrutura do sistema são mantidos protegidos.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
