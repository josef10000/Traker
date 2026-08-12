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
        {(theme === 'cyan' || theme === 'sky') && (
          <motion.div
            key="cyan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#080e1a]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,153,255,0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,229,255,0.05),transparent_50%)]" />
            <motion.div 
              animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.08, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-sky-500/10 blur-[100px] rounded-full transform-gpu will-change-transform"
            />
          </motion.div>
        )}

        {(theme === 'obsidian' || theme === 'purple') && (
          <motion.div
            key="obsidian"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0812]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.15),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.08),transparent_50%)]" />
            <motion.div 
              animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 25, repeat: Infinity }}
              className="absolute top-1/4 left-1/3 w-[800px] h-[800px] bg-purple-900/15 blur-[120px] rounded-full transform-gpu will-change-transform"
            />
          </motion.div>
        )}

        {theme === 'emerald' && (
          <motion.div
            key="emerald"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#061412]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(5,150,105,0.06),transparent_50%)]" />
            <motion.div 
              animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] }}
              transition={{ duration: 25, repeat: Infinity }}
              className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-emerald-500/10 blur-[110px] rounded-full transform-gpu will-change-transform"
            />
          </motion.div>
        )}

        {theme === 'amber' && (
          <motion.div
            key="amber"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#12100e]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.06),transparent_50%)]" />
            <motion.div 
              animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.08, 1] }}
              transition={{ duration: 25, repeat: Infinity }}
              className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-amber-500/10 blur-[110px] rounded-full transform-gpu will-change-transform"
            />
          </motion.div>
        )}

        {(theme === 'slate' || theme === 'dark') && (
          <motion.div
            key="slate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0f172a]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.04),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,41,59,0.2),transparent_50%)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
