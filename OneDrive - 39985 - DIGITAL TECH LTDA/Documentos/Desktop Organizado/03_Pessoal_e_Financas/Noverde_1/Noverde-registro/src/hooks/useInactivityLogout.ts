import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

/**
 * Hook que monitora inatividade do usuário e realiza logout automático
 * após INACTIVITY_TIMEOUT_MS sem nenhuma interação.
 *
 * @param onLogout - Callback opcional chamado após o signOut (ex: exibir toast)
 */
export function useInactivityLogout(onLogout?: (reason: 'inactivity') => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await signOut(auth);
        onLogout?.('inactivity');
      } catch (err) {
        console.error('[InactivityLogout] Erro ao fazer logout por inatividade:', err);
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [onLogout]);

  useEffect(() => {
    // Inicia o timer na montagem
    resetTimer();

    // Reseta o timer a cada interação do usuário
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}
