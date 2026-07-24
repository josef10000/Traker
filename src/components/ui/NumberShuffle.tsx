import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NumberShuffleProps {
  value: number | string;
  className?: string;
}

export const NumberShuffle: React.FC<NumberShuffleProps> = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span className={`inline-flex overflow-hidden relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={String(displayValue)}
          initial={{ y: isAnimating ? 14 : 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className="inline-block"
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
