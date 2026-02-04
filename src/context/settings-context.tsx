
"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type DataSource = 'firestore' | 'mock' | 'mysql';

interface SettingsContextType {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Standardmäßig erzwingen wir 'mysql' für eine konsistente lokale Erfahrung.
  const [dataSource, setDataSource] = useState<DataSource>('mysql');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Beim Laden prüfen wir, ob der Benutzer zuvor manuell etwas anderes gewählt hat.
    const savedSource = typeof window !== 'undefined' ? localStorage.getItem('dataSource') : null;
    if (savedSource === 'firestore' || savedSource === 'mock' || savedSource === 'mysql') {
      setDataSource(savedSource as DataSource);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('dataSource', dataSource);
    }
  }, [dataSource, isHydrated]);

  const value = { dataSource, setDataSource };

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
