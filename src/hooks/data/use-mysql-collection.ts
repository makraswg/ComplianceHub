
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCollectionData } from '@/app/actions/mysql-actions';

// Global cache and fetch lock to prevent avalanche requests across multiple hook instances
const mysqlCache: Record<string, { data: any[], timestamp: number, stringified: string }> = {};
const globalFetchLock: Record<string, Promise<any> | null> = {};
const CACHE_TTL = 30000; 

/**
 * Enterprise MySQL Hook with Global Request Deduplication and Deep Comparison.
 * Prevents infinite render loops and minimizes network traffic by syncing multiple hook instances.
 */
export function useMysqlCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[] | null>(() => {
    const cached = mysqlCache[collectionName];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data as T[];
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(enabled && data === null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  
  const isMounted = useRef(true);
  const prevDataString = useRef<string>(mysqlCache[collectionName]?.stringified || "");

  const fetchData = useCallback(async (silent = false) => {
    if (!enabled || !isMounted.current) return;

    // Deduplicate requests: If a fetch for this collection is already in progress, wait for it
    if (globalFetchLock[collectionName]) {
      try {
        const result = await globalFetchLock[collectionName];
        if (isMounted.current && result) {
          const newDataString = JSON.stringify(result);
          if (newDataString !== prevDataString.current) {
            setData(result);
            prevDataString.current = newDataString;
          }
          setIsLoading(false);
        }
        return;
      } catch (e) {
        // Fall through to original fetch if shared promise failed
      }
    }

    if (!silent && !prevDataString.current) {
      setIsLoading(true);
    }
    
    // Create new global fetch lock
    globalFetchLock[collectionName] = getCollectionData(collectionName).then(res => res.data);

    try {
      const result = await getCollectionData(collectionName);
      globalFetchLock[collectionName] = null; // Release lock

      if (!isMounted.current) return;

      if (result.error) {
        setError(result.error);
      } else {
        const newData = (result.data || []) as T[];
        const newDataString = JSON.stringify(newData);
        
        // Deep comparison to prevent render loop
        if (newDataString !== prevDataString.current) {
          setData(newData);
          prevDataString.current = newDataString;
          mysqlCache[collectionName] = { 
            data: newData, 
            timestamp: Date.now(),
            stringified: newDataString 
          };
        }
        setError(null);
      }
    } catch (e: any) {
      globalFetchLock[collectionName] = null;
      if (isMounted.current) setError(e.message || "Datenbankfehler");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [collectionName, enabled]);

  const refresh = useCallback(() => {
    delete mysqlCache[collectionName];
    prevDataString.current = "";
    setVersion(v => v + 1);
  }, [collectionName]);

  useEffect(() => {
    isMounted.current = true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    fetchData();

    // Slower sync interval to preserve resources
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true); 
      }
    }, 45000); 

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [enabled, version, fetchData]);

  return useMemo(() => ({ 
    data, 
    isLoading, 
    error, 
    refresh 
  }), [data, isLoading, error, refresh]);
}
