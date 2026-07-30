import { useEffect } from 'react';

type Theme = 'dark';

export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } {
  const theme: Theme = 'dark';

  useEffect(() => {
    // Aplica permanentemente o modo escuro (dark) no documento
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-design-mode', 'premium');
    localStorage.setItem('tracker-theme', 'dark');
  }, []);

  const toggleTheme = () => {};
  const setTheme = () => {};

  return { theme, toggleTheme, setTheme };
}
