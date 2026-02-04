
"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { DataSource } from '@/lib/types';

interface SettingsContextType {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  activeTenantId: string;
  setActiveTenantId: (id: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSource] = useState<DataSource>('mysql');
  const [activeTenantId, setActiveTenantId] = useState<string>('all');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedSource = typeof window !== 'undefined' ? localStorage.getItem('dataSource') : null;
    if (savedSource === 'firestore' || savedSource === 'mock' || savedSource === 'mysql') {
      setDataSource(savedSource as DataSource);
    }
    
    const savedTenant = typeof window !== 'undefined' ? localStorage.getItem('activeTenantId') : null;
    if (savedTenant) {
      setActiveTenantId(savedTenant);
    }

    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setThemeState(savedTheme as 'light' | 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }
    
    setIsHydrated(true);
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('dataSource', dataSource);
      localStorage.setItem('activeTenantId', activeTenantId);
    }
  }, [dataSource, activeTenantId, isHydrated]);

  const value = { 
    dataSource, 
    setDataSource,
    activeTenantId,
    setActiveTenantId,
    theme,
    setTheme
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
