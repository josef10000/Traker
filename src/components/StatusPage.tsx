import React from 'react';
import { GrafanaStatusWidget } from './GrafanaStatusWidget';
import { ShieldCheck, ArrowLeft, Activity } from 'lucide-react';

export const StatusPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Página de Status do Sistema</h1>
            <p className="text-xs text-slate-400">Monitoramento de Infraestrutura e Serviços em Tempo Real</p>
          </div>
        </div>

        <a
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Login</span>
        </a>
      </header>

      {/* Content Widget */}
      <main className="max-w-4xl mx-auto w-full my-8 relative z-10">
        <GrafanaStatusWidget />
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-4 border-t border-slate-900 text-center text-xs text-slate-500 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Monitoramento integrado com Grafana Cloud API & Vercel Serverless</span>
        </div>
        <div>
          <span>Tracker SaaS &copy; {new Date().getFullYear()} — Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
};

export default StatusPage;
