import { useState, useEffect, useCallback } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      const dark = JSON.parse(stored);
      setIsDarkMode(dark);
      applyDarkMode(dark);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      applyDarkMode(prefersDark);
    }
  }, []);

  const applyDarkMode = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f3f4f6';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    }
  };

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      applyDarkMode(newValue);
      return newValue;
    });
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setIsDarkMode(dark);
    localStorage.setItem('darkMode', JSON.stringify(dark));
    applyDarkMode(dark);
  }, []);

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
  };
};
