
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCollectionData } from '@/app/actions/mysql-actions';

// Globaler Cache für MySQL-Daten, um unnötige Re-Fetches beim Seitenwechsel zu vermeiden.
// Dies macht die App-Navigation "instant", wenn die Daten bereits geladen wurden.
const mysqlCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_TTL = 5000; // 5 Sekunden Cache-Gültigkeit für Navigationen

/**
 * Ein optimierter Hook, um Daten aus einer MySQL-Datenbank zu laden.
 * Implementiert Caching und intelligentes Polling.
 */
export function useMysqlCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[] | null>(() => {
    // Initialisierung aus Cache, falls vorhanden und gültig
    const cached = mysqlCache[collectionName];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data as T[];
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(enabled && !data);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!enabled) return;
    
    // Prüfe Cache erneut (für Fälle, in denen andere Komponenten den Cache gefüllt haben könnten)
    const cached = mysqlCache[collectionName];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL) && !silent && data) {
      // Wenn wir bereits aktuelle Daten haben und kein erzwungener Refresh (silent=false bei Mount) ansteht
      setIsLoading(false);
      return;
    }

    if (!silent && !data) setIsLoading(true);
    
    try {
      const result = await getCollectionData(collectionName);
      if (result.error) {
        setError(result.error);
      } else {
        const newData = result.data as T[];
        setData(newData);
        setError(null);
        // Cache aktualisieren
        mysqlCache[collectionName] = { data: newData, timestamp: Date.now() };
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [collectionName, enabled, data]);

  const refresh = useCallback(() => {
    // Cache für diese Kollektion löschen, um frische Daten zu erzwingen
    delete mysqlCache[collectionName];
    setVersion(v => v + 1);
  }, [collectionName]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setData(null);
      setError(null);
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      return;
    }

    // Abruf starten (fetchData prüft intern den Cache)
    fetchData();

    const startPolling = () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      pollingInterval.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchData(true);
        }
      }, 30000); // 30s Polling
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
        startPolling();
      } else if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, version, fetchData]);

  return { data, isLoading, error, refresh };
}
