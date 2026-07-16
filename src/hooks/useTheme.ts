import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'tracker-theme';

export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    // Aplica o tema no documento
    document.documentElement.setAttribute('data-theme', theme);

    if (theme === 'light') {
      // Light mode: desativa premium design mode para não sobrescrever as cores claras
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-design-mode');
    } else {
      // Dark mode: reativa o premium design mode (glassmorphism)
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-design-mode', 'premium');
    }

    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return { theme, toggleTheme, setTheme };
}
