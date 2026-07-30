import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp — Anima um numero do zero ate o valor alvo ao montar o componente.
 * Inspirado nas tecnicas do pqoqubbw/icons (animacoes contextuais no mount).
 *
 * @param target - Valor final a atingir
 * @param duration - Duracao da animacao em ms (default: 900ms)
 * @param enabled - Se false, retorna o valor diretamente sem animacao
 */
export function useCountUp(
  target: number,
  duration = 900,
  enabled = true
): number {
  const [current, setCurrent] = useState(enabled ? 0 : target);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    startTimeRef.current = null;
    setCurrent(0);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeOutCubic para desaceleracao natural
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;

      setCurrent(parseFloat(value.toFixed(target % 1 !== 0 ? 2 : 0)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return current;
}
