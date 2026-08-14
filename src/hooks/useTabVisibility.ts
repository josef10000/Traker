import { useState, useEffect } from 'react';

/**
 * Hook para monitorar o estado de visibilidade da aba do navegador.
 * Retorna `true` se a aba estiver em primeiro plano (ativa/visível) e `false` se estiver em segundo plano.
 * Utilizado para pausar listeners em tempo real (onSnapshot) e economizar cotas de leitura do Firestore.
 */
export function useTabVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => 
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
