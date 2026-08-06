import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BuildingOffice, 
  Users, 
  ShieldCheck, 
  ChartLineUp, 
  ArrowRight,
  Briefcase,
  FileCsv as FileSpreadsheet,
  CheckCircle,
  LockKey
} from '@phosphor-icons/react';
import { UserRole } from '../../types';
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

  const rolesList: Array<{ role: UserRole; label: string; title: string; desc: string; icon: any }> = [
    {
      role: 'manager',
      label: 'Gerente da Empresa',
      title: '🏢 Gerente da Empresa',
      desc: 'Acesso total à gestão da empresa, criação de equipes, indicadores globais de faturamento e governança.',
      icon: BuildingOffice
    },
    {
      role: 'coordinator',
      label: 'Coordenador de Operações',
      title: '🎯 Coordenador de Operações',
      desc: 'Gestão estratégica das operações, acompanhamento de metas, escalas de trabalho e relatórios executivos.',
      icon: ChartLineUp
    },
    {
      role: 'supervisor',
      label: 'Supervisor de Equipe',
      title: '👥 Supervisor de Equipe',
      desc: 'Gestão direta da equipe, lançamento de ocorrências diárias, apoio individual e acompanhamento do balcão.',
      icon: Users
    },
    {
      role: 'member',
      label: 'Operador de Cobrança',
      title: '🎧 Operador de Cobrança',
      desc: 'Visão operacional do colaborador, registro de produções, metas individuais, estorno e recuperação por CPF.',
      icon: Briefcase
    },
    {
      role: 'backoffice',
      label: 'Back Office',
      title: '📑 Back Office',
      desc: 'Importação e tratamento de planilhas externas, nomenclatura de colunas, verificação de dados e downloads rápidos.',
      icon: FileSpreadsheet
    },
    {
      role: 'monitor',
      label: 'Monitor / QA',
      title: '🛡️ Monitor / QA',
      desc: 'Avaliações de auditoria de atendimento, fichas de escuta técnica e Planos de Desenvolvimento (PDI).',
      icon: ShieldCheck
    }
  ];

  const currentRoleInfo = rolesList.find(r => r.role === selectedRole) || rolesList[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans selection:bg-sky-500 selection:text-white">
      {/* Luzes de fundo sutis executivas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-5xl space-y-10 z-10 my-8">
        
        {/* CABEÇALHO SÓBRIO */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-white/10 text-sky-400 text-xs font-bold uppercase tracking-widest shadow-inner">
            <LockKey size={14} className="text-sky-400" />
            <span>Simulador de Experiência Traker</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {isRestrictedRole ? 'Credencial de Demonstração' : 'Selecione o Perfil para Simular'}
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            {isRestrictedRole 
              ? `Ambiente interativo configurado para o perfil de ${currentRoleInfo.label}. Clique abaixo para iniciar sua experiência.`
              : 'Explore a plataforma de acordo com as responsabilidades e telas de cada perfil corporativo.'}
          </p>
        </div>

        {/* VISÃO 1: CARGO ÚNICO (RESTRICTED ROLE PARAMS) */}
        {isRestrictedRole ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto bg-slate-900/60 border border-white/10 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto shadow-lg">
              {React.createElement(currentRoleInfo.icon, { size: 32, weight: 'duotone' })}
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-sky-500/15 text-sky-400 border border-sky-500/30">
                Perfil Selecionado
              </span>
              <h2 className="text-2xl font-black text-white">{currentRoleInfo.label}</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium pt-1">
                {currentRoleInfo.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-4">
              <button
                type="button"
                onClick={() => onStartDemo(selectedRole)}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Iniciar Demonstração como {currentRoleInfo.label}</span>
                <ArrowRight size={18} weight="bold" />
              </button>

              <p className="text-[11px] text-slate-500 font-medium">
                🔒 Dados operacionais em ambiente seguro de demonstração.
              </p>
            </div>
          </motion.div>
        ) : (
          /* VISÃO 2: TODOS OS CARGOS (GRID EXECUTIVO) */
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                hidden: {},
              }}
            >
              {rolesList.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedRole === item.role;

                return (
                  <motion.div
                    key={item.role}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } },
                    }}
                  >
                    <SpotlightCard
                      spotlightColor={isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)'}
                      onClick={() => setSelectedRole(item.role)}
                      className={`p-6 text-left cursor-pointer transition-all flex flex-col justify-between h-full rounded-3xl ${
                        isSelected
                          ? 'bg-slate-900/90 border-sky-500/80 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/40'
                          : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                            <IconComp size={24} weight="duotone" />
                          </div>

                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle size={14} weight="fill" />
                              <span>Selecionado</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-white">{item.label}</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">{item.desc}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>{isSelected ? 'Pronto para Iniciar' : 'Clique para Selecionar'}</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* BOTÃO PRINCIPAL DE ENTRADA */}
            <div className="flex flex-col items-center justify-center space-y-3 pt-6 border-t border-white/10">
              <motion.button
                type="button"
                onClick={() => onStartDemo(selectedRole)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-3 shadow-xl shadow-sky-500/20 transition-all"
              >
                <span>Iniciar Demonstração como {currentRoleInfo.label}</span>
                <ArrowRight size={18} weight="bold" />
              </motion.button>

              <p className="text-xs text-slate-500 font-medium">
                🔒 Todos os dados e funcionalidades são simulados em ambiente isolado e seguro.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DemoPage;
