import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { secureRandom } from '../../utils/crypto';

interface DynamicBackgroundProps {
  theme: UserProfile['theme'];
}

export const DynamicBackground = ({ theme = 'dark' }: DynamicBackgroundProps) => {
  const purpleParticles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      initialOpacity: secureRandom() * 0.5,
      duration: 3 + secureRandom() * 4,
      delay: secureRandom() * 5,
      top: `${secureRandom() * 100}%`,
      left: `${secureRandom() * 100}%`
    }));
  }, []);
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {theme === 'sky' && (
          <motion.div
            key="sky"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#082f49]"
          >
            {/* Textura de Grão (Noise) */}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Overlay Gradiente Profundo */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-slate-950/60 backdrop-blur-[1px]"></div>
            
            {/* Luzes Dinâmicas Suaves e Lentas */}
            <motion.div 
              animate={{ 
                opacity: [0.1, 0.2, 0.1],
                scale: [1, 1.1, 1],
                x: [0, 20, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-sky-400/10 blur-[120px] rounded-full"
            />
          </motion.div>
        )}

        {theme === 'purple' && (
          <motion.div
            key="purple"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0c0a09]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.2),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.1),transparent_50%)]" />
            
            {/* Floating Stars/Particles */}
            <div className="absolute inset-0">
              {purpleParticles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: p.initialOpacity }}
                  animate={{ 
                    opacity: [0.1, 0.5, 0.1],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{ 
                    duration: p.duration, 
                    repeat: Infinity,
                    delay: p.delay
                  }}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full"
                  style={{ 
                    top: p.top, 
                    left: p.left,
                  }}
                />
              ))}
            </div>

            {/* Deep Cosmic Clouds */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 20, repeat: Infinity }}
              className="absolute top-1/4 left-1/3 w-[800px] h-[800px] bg-purple-900/20 blur-[150px] rounded-full"
            />
          </motion.div>
        )}

        {theme === 'dark' && (
          <motion.div
            key="dark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020617]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.03),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,41,59,0.2),transparent_50%)]" />
            
            {/* Subtle Gradient Lines */}
            <div className="absolute inset-0 opacity-[0.03]" 
                 style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
