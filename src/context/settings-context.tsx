
"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type DataSource = 'firestore' | 'mock' | 'mysql';
export type TenantId = 'all' | 't1' | 't2';

interface SettingsContextType {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  activeTenantId: TenantId;
  setActiveTenantId: (id: TenantId) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSource] = useState<DataSource>('firestore');
  const [activeTenantId, setActiveTenantId] = useState<TenantId>('all');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedSource = localStorage.getItem('dataSource');
    if (savedSource === 'firestore' || savedSource === 'mock' || savedSource === 'mysql') {
      setDataSource(savedSource);
    }
    const savedTenant = localStorage.getItem('activeTenantId');
    if (savedTenant === 'all' || savedTenant === 't1' || savedTenant === 't2') {
      setActiveTenantId(savedTenant as TenantId);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('dataSource', dataSource);
      localStorage.setItem('activeTenantId', activeTenantId);
    }
  }, [dataSource, activeTenantId, isHydrated]);

  const value = { 
    dataSource, 
    setDataSource, 
    activeTenantId, 
    setActiveTenantId 
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
