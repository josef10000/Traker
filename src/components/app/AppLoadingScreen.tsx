import React from 'react';
import { motion } from 'motion/react';
import { DynamicBackground } from '../ui/DynamicBackground';

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden selection:bg-sky-500/30">
      <DynamicBackground theme="dark" />
      <div className="absolute w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            filter: [
              "drop-shadow(0 0 10px rgba(14, 165, 233, 0.2))",
              "drop-shadow(0 0 20px rgba(14, 165, 233, 0.4))",
              "drop-shadow(0 0 10px rgba(14, 165, 233, 0.2))"
            ]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="relative"
        >
          <img src="/logo.png" alt="Tracker Logo" className="w-[432px] h-[432px] object-contain" />
        </motion.div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tighter italic">TRACKER</h2>
          <div className="h-1 w-12 bg-sky-500 mx-auto rounded-full"></div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 animate-pulse">
            Carregando Ambiente...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
