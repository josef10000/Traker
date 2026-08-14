import { useEffect } from 'react';

export function useDesignMode() {
  const theme = localStorage.getItem('tracker-theme') || 'dark';
  const designMode = theme === 'light' ? '' : 'premium';
  const setDesignMode = () => {};

  useEffect(() => {
    // No light mode, NÃO aplica premium (seria conflito com as cores claras)
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-design-mode');
    } else {
      document.documentElement.setAttribute('data-design-mode', 'premium');
      localStorage.setItem('tracker-design-mode', 'premium');
    }
  }, [theme]);

  return [designMode, setDesignMode] as const;
}
