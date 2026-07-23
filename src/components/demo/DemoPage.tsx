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

interface DemoPageProps {
  onStartDemo: (simulatedRole: UserRole) => void;
}

export const DemoPage: React.FC<DemoPageProps> = ({ onStartDemo }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');

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
      desc: 'Importação de planilhas financeiras, conciliação e tratamento de bases de dados.',
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

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Simulador de Experiência Tracker
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Selecione qualquer cargo abaixo para acessar a plataforma instantaneamente sem necessidade de login. Teste as telas, ocorrências e recursos em tempo real!
          </p>
        </div>

        {/* LISTA DE CARGOS SIMULADOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesList.map((item) => {
            const IconComp = item.icon;
            const isSelected = selectedRole === item.role;

            return (
              <button
                key={item.role}
                type="button"
                onClick={() => setSelectedRole(item.role)}
                className={`p-5 rounded-3xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-purple-500/60 shadow-xl shadow-purple-500/10 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg`}>
                    <IconComp size={24} weight="bold" />
                  </div>

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
              </button>
            );
          })}
        </div>

        {/* BOTÃO DE ENTRADA NO SANDBOX */}
        <div className="flex flex-col items-center justify-center space-y-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => onStartDemo(selectedRole)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-black text-sm uppercase tracking-wider shadow-2xl shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-3"
          >
            <span>Iniciar Demonstração como {rolesList.find(r => r.role === selectedRole)?.label}</span>
            <ArrowRight size={20} weight="bold" />
          </button>

          <p className="text-xs text-slate-500">
            🔒 Ambiente seguro de demonstração. Recursos confidenciais de infraestrutura do sistema são mantidos protegidos.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
