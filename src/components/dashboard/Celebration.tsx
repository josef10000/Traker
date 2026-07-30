import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

export const Celebration = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const colors = ['#38bdf8', '#fbbf24', '#34d399', '#f87171', '#818cf8', '#c084fc'];

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
    
    // Auto-remove particles after animation
    const timer = setTimeout(() => setParticles([]), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 0, 
              y: '110vh', 
              x: `${p.x}vw`, 
              rotate: 0 
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: '-20vh',
              x: `${p.x + (Math.random() * 20 - 10)}vw`,
              rotate: p.rotation + 720
            }}
            transition={{ 
              duration: 4 + Math.random() * 2,
              delay: p.delay,
              ease: "easeOut"
            }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            }}
          />
        ))}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -50 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/50 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6">
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.2, 1, 1.2, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-8xl"
          >
            🏆
          </motion.div>
          <div className="text-center">
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Meta Batida!</h2>
            <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] mt-2">Excelente Trabalho Time</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
