import { useState, useEffect } from 'react';

/**
 * Custom hook: persists state to localStorage.
 * Falls back to initialValue if nothing is stored or JSON parse fails.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or private browsing — silently ignore
    }
  }, [key, value]);

  return [value, setValue];
}
