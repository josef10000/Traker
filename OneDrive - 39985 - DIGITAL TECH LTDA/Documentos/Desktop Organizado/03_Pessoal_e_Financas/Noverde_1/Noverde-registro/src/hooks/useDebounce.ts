import { useState, useEffect } from 'react';

/**
 * Hook para debouncing de valores dinâmicos (busca, filtros, campos de entrada)
 * Reduz recálculos pesados na UI durante a digitação rápida
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
