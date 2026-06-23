import { useState, useEffect } from 'react';

export function useDesignMode() {
  const [designMode, setDesignMode] = useState<'classic' | 'premium'>(() => {
    return (localStorage.getItem('tracker-design-mode') as 'classic' | 'premium') || 'premium';
  });

  useEffect(() => {
    localStorage.setItem('tracker-design-mode', designMode);
    document.documentElement.setAttribute('data-design-mode', designMode);
    
    // Dispara evento customizado para notificar reativamente outros componentes na mesma página
    window.dispatchEvent(new CustomEvent('design-mode-change', { detail: designMode }));
  }, [designMode]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<'classic' | 'premium'>;
      if (customEvent.detail && customEvent.detail !== designMode) {
        setDesignMode(customEvent.detail);
      }
    };
    window.addEventListener('design-mode-change', handler);
    return () => window.removeEventListener('design-mode-change', handler);
  }, [designMode]);

  return [designMode, setDesignMode] as const;
}
