import React from 'react';
import { motion, useAnimation } from 'motion/react';
import { Icon } from '@phosphor-icons/react';

type AnimationType = 'spin' | 'bounce' | 'shake' | 'pulse' | 'scale-hover' | 'draw';
type TriggerType = 'hover' | 'mount' | 'loop' | 'manual';

interface AnimatedIconProps {
  icon: Icon;
  size?: number;
  className?: string;
  animation?: AnimationType;
  trigger?: TriggerType;
  active?: boolean; // usado para shake quando muda (ex: nova notificacao)
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

/**
 * AnimatedIcon — Wrapper sobre Phosphor Icons com animacoes contextuais via Framer Motion.
 * Inspirado no pqoqubbw/icons mas adaptado para nossa stack (Phosphor + motion/react).
 */
export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon: Icon,
  size = 20,
  className = '',
  animation = 'scale-hover',
  trigger = 'hover',
  active = false,
  weight = 'regular',
}) => {
  const controls = useAnimation();
  const prevActive = React.useRef(active);

  // Shake quando 'active' muda (ex: nova notificacao no sino)
  React.useEffect(() => {
    if (trigger === 'manual' && active !== prevActive.current) {
      prevActive.current = active;
      controls.start({
        rotate: [0, -12, 12, -8, 8, -4, 4, 0],
        transition: { duration: 0.55, ease: 'easeInOut' },
      });
    }
  }, [active, trigger, controls]);

  // Animacoes no mount
  React.useEffect(() => {
    if (trigger === 'mount') {
      if (animation === 'bounce') {
        controls.start({
          y: [0, -6, 0, -3, 0],
          transition: { duration: 0.5, ease: 'easeOut' },
        });
      } else if (animation === 'pulse') {
        controls.start({
          scale: [1, 1.2, 1],
          transition: { duration: 0.4 },
        });
      }
    }

    if (trigger === 'loop') {
      if (animation === 'spin') {
        controls.start({
          rotate: 360,
          transition: { duration: 1, ease: 'linear', repeat: Infinity },
        });
      } else if (animation === 'pulse') {
        controls.start({
          scale: [1, 1.15, 1],
          transition: { duration: 1.2, ease: 'easeInOut', repeat: Infinity },
        });
      }
    }
  }, [trigger, animation, controls]);

  // Para spin loop quando para (ex: isRefreshing vai para false)
  React.useEffect(() => {
    if (trigger === 'loop' && animation === 'spin' && !active) {
      controls.stop();
      controls.set({ rotate: 0 });
    } else if (trigger === 'loop' && animation === 'spin' && active) {
      controls.start({
        rotate: 360,
        transition: { duration: 1, ease: 'linear', repeat: Infinity },
      });
    }
  }, [active, trigger, animation, controls]);

  const hoverProps =
    trigger === 'hover'
      ? {
          whileHover:
            animation === 'scale-hover'
              ? { scale: 1.2, transition: { type: 'spring' as const, stiffness: 400, damping: 15 } }
              : animation === 'bounce'
              ? { y: -4, transition: { type: 'spring' as const, stiffness: 500, damping: 15 } }
              : animation === 'shake'
              ? { rotate: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } }
              : animation === 'spin'
              ? { rotate: 180, transition: { duration: 0.35 } }
              : undefined,
          whileTap: { scale: 0.9 },
        }
      : {};

  return (
    <motion.span
      animate={controls}
      {...hoverProps}
      className={`inline-flex items-center justify-center ${className}`}
      style={{ display: 'inline-flex' }}
    >
      <Icon size={size} weight={weight} />
    </motion.span>
  );
};
