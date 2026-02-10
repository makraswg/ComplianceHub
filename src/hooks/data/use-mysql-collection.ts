
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCollectionData } from '@/app/actions/mysql-actions';

// Globaler Cache für MySQL-Daten, um unnötige Re-Fetches beim Seitenwechsel zu vermeiden.
const mysqlCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_TTL = 10000; 

/**
 * Ein hocheffizienter Hook zum Abrufen von MySQL-Daten.
 * Optimiert für virtualisierte Docker Umgebungen.
 */
export function useMysqlCollection<T>(collectionName: string, enabled: boolean) {
  // Initialisiere Daten aus dem Cache, falls vorhanden
  const [data, setData] = useState<T[] | null>(() => {
    const cached = mysqlCache[collectionName];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data as T[];
    }
    return null;
  });
  
  // isLoading ist nur wahr, wenn enabled UND noch keine Daten (auch nicht aus Cache) vorhanden sind
  const [isLoading, setIsLoading] = useState(enabled && data === null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialFetch = useRef(true);
  const prevDataCount = useRef<number>(-1);

  const fetchData = useCallback(async (silent = false) => {
    if (!enabled) return;
    
    if (!silent && data === null) {
      setIsLoading(true);
    }
    
    try {
      const result = await getCollectionData(collectionName);
      if (result.error) {
        setError(result.error);
      } else {
        const newData = (result.data || []) as T[];
        
        // Update nur wenn Daten sich geändert haben oder erster Lauf
        if (newData.length !== prevDataCount.current || isInitialFetch.current) {
          setData(newData);
          prevDataCount.current = newData.length;
          mysqlCache[collectionName] = { data: newData, timestamp: Date.now() };
        }
        setError(null);
      }
    } catch (e: any) {
      console.error(`Fetch error for ${collectionName}:`, e);
      setError(e.message || "Unbekannter Datenbankfehler");
    } finally {
      setIsLoading(false);
      isInitialFetch.current = false;
    }
  }, [collectionName, enabled, data]);

  const refresh = useCallback(() => {
    delete mysqlCache[collectionName];
    isInitialFetch.current = true;
    prevDataCount.current = -1;
    setVersion(v => v + 1);
  }, [collectionName]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      return;
    }

    fetchData();

    // Polling Intervall für Hintergrund-Updates
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 60000); 

    pollingInterval.current = interval;
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [enabled, version, fetchData]);

  return { data, isLoading, error, refresh };
}
