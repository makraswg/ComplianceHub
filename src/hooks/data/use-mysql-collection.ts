
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCollectionData } from '@/app/actions/mysql-actions';

/**
 * Globaler Store zur Synchronisierung des Zustands über alle Instanzen hinweg.
 * Verhindert redundante Abfragen und stellt sicher, dass Refresh-Aktionen überall ankommen.
 */
const globalStore: Record<string, {
  data: any[] | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
  promise: Promise<any> | null;
  subscribers: Set<(state: any) => void>;
}> = {};

export function useMysqlCollection<T>(collectionName: string, enabled: boolean) {
  // Initialisiere Store falls nötig
  if (!globalStore[collectionName]) {
    globalStore[collectionName] = {
      data: null,
      isLoading: false,
      error: null,
      lastFetch: 0,
      promise: null,
      subscribers: new Set(),
    };
  }

  const [localState, setLocalState] = useState({
    data: globalStore[collectionName].data,
    isLoading: globalStore[collectionName].isLoading,
    error: globalStore[collectionName].error
  });

  const isMounted = useRef(true);

  const notify = useCallback(() => {
    const currentState = {
      data: globalStore[collectionName].data,
      isLoading: globalStore[collectionName].isLoading,
      error: globalStore[collectionName].error
    };
    globalStore[collectionName].subscribers.forEach(sub => sub(currentState));
  }, [collectionName]);

  const fetchData = useCallback(async (force = false) => {
    const store = globalStore[collectionName];
    
    // Vermeide unnötige parallele Abfragen
    if (store.isLoading && !force) return;
    
    // Cache-Prüfung (Stale-While-Revalidate)
    const now = Date.now();
    if (store.data && !force && (now - store.lastFetch < 5000)) {
      return;
    }

    store.isLoading = true;
    store.error = null;
    notify();

    try {
      store.promise = getCollectionData(collectionName);
      const result = await store.promise;
      
      if (!isMounted.current) return;

      if (result.error) {
        store.error = result.error;
      } else {
        store.data = (result.data || []) as any[];
        store.error = null;
        store.lastFetch = now;
      }
    } catch (e: any) {
      store.error = e.message || "Datenbankfehler";
    } finally {
      store.isLoading = false;
      store.promise = null;
      notify();
    }
  }, [collectionName, notify]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    isMounted.current = true;
    if (!enabled) return;

    const store = globalStore[collectionName];
    const updateLocal = (newState: any) => {
      if (isMounted.current) {
        setLocalState(newState);
      }
    };

    store.subscribers.add(updateLocal);
    
    // Sofortiger Abruf falls Daten fehlen oder veraltet sind
    fetchData();

    return () => {
      isMounted.current = false;
      store.subscribers.delete(updateLocal);
    };
  }, [collectionName, enabled, fetchData]);

  return useMemo(() => ({
    data: localState.data as T[] | null,
    isLoading: localState.isLoading,
    error: localState.error ? new Error(localState.error) : null,
    refresh
  }), [localState, refresh]);
}
