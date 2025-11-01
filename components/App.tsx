import React, { useState, useEffect, useCallback } from 'react';
import type { ProblemHistoryEntry } from './types';
import Header from './components/Header';
import HistoryDrawer from './components/HistoryPanel';
import MainPanel from './components/MainPanel';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const [history, setHistory] = useState<ProblemHistoryEntry[]>([]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('math-ai-tutor-history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('math-ai-tutor-history', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage:", error);
    }
  }, [history]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const addHistoryEntry = useCallback((entry: Omit<ProblemHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: ProblemHistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setHistory(prev => [newEntry, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        />
      <main className="flex-grow flex flex-col overflow-auto pb-28">
        <MainPanel addHistoryEntry={addHistoryEntry} theme={theme} />
      </main>
      <HistoryDrawer
        history={history} 
        clearHistory={clearHistory}
      />
    </div>
  );
};

export default App;
