import React from 'react';

interface DemoSimulationBannerProps {
  displayName: string;
  onEndDemo: () => void;
}

export function DemoSimulationBanner({ displayName, onEndDemo }: DemoSimulationBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-purple-950/95 to-indigo-950/95 backdrop-blur-md border-b border-purple-500/30 px-6 py-3 flex justify-between items-center no-print shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-3.5 w-3.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500"></span>
        </span>
        <p className="text-xs font-bold text-purple-200">
          MODO DEMONSTRAÇÃO — Simulando <span className="uppercase text-white font-black">{displayName}</span>
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onEndDemo}
          className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-purple-500 transition-colors shadow-md shadow-purple-500/20 active:scale-95 cursor-pointer"
        >
          Encerrar Demonstração
        </button>
      </div>
    </div>
  );
}
