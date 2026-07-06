import { useEffect } from 'react';

export function useDesignMode() {
  const designMode = 'premium';
  const setDesignMode = () => {};

  useEffect(() => {
    document.documentElement.setAttribute('data-design-mode', 'premium');
    localStorage.setItem('tracker-design-mode', 'premium');
  }, []);

  return [designMode, setDesignMode] as const;
}
