
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCollectionData } from '@/app/actions/mysql-actions';

// Globaler Cache zur Vermeidung von unnötigen Re-Renders
const mysqlCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_TTL = 10000; 

/**
 * Ein robuster Hook zum Abrufen von MySQL-Daten mit Stabilitätsgarantie.
 * Verhindert "Zucken" durch intelligente Ladezustand-Steuerung.
 */
export function useMysqlCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[] | null>(() => {
    const cached = mysqlCache[collectionName];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data as T[];
    }
    return null;
  });
  
  // isLoading nur true, wenn wir wirklich noch keine Daten haben
  const [isLoading, setIsLoading] = useState(enabled && data === null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialFetch = useRef(true);
  const prevDataString = useRef<string>("");

  const fetchData = useCallback(async (silent = false) => {
    if (!enabled) return;
    
    // Nur beim allerersten Laden (oder nach Reset) den Loader zeigen
    if (!silent && !data) {
      setIsLoading(true);
    }
    
    try {
      const result = await getCollectionData(collectionName);
      if (result.error) {
        setError(result.error);
      } else {
        const newData = (result.data || []) as T[];
        const newDataString = JSON.stringify(newData);
        
        // Nur updaten, wenn sich die Daten tatsächlich geändert haben
        if (newDataString !== prevDataString.current) {
          setData(newData);
          prevDataString.current = newDataString;
          mysqlCache[collectionName] = { data: newData, timestamp: Date.now() };
        }
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || "Datenbankfehler");
    } finally {
      setIsLoading(false);
      isInitialFetch.current = false;
    }
  }, [collectionName, enabled, data]);

  const refresh = useCallback(() => {
    delete mysqlCache[collectionName];
    prevDataString.current = "";
    setVersion(v => v + 1);
  }, [collectionName]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      return;
    }

    fetchData();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true); // Silent update im Hintergrund
      }
    }, 30000); 

    pollingInterval.current = interval;
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [enabled, version, fetchData]);

  return useMemo(() => ({ 
    data, 
    isLoading, 
    error, 
    refresh 
  }), [data, isLoading, error, refresh]);
}
