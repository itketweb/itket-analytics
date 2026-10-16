import { useCallback, useState } from 'react';

function detectInitialDark(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  if (root.dataset.theme) return root.dataset.theme === 'dark';
  return window.matchMedia('(prefers-color-scheme:dark)').matches;
}

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(detectInitialDark);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const currentlyDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme:dark)').matches;
    const nextTheme = currentlyDark ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // Ignore storage access errors in private browsing
    }
    setIsDark(nextTheme === 'dark');
  }, []);

  return { isDark, toggleTheme };
}
