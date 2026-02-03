"use client";

import { useState, useEffect, useCallback } from 'react';
import { getMockCollection } from '@/lib/mock-db';

/**
 * Ein Hook für statische Mock-Daten mit Refresh-API.
 */
export function useMockCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      try {
        const collectionData = getMockCollection(collectionName) as T[];
        setData(collectionData);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    }, 300);
  }, [collectionName, enabled, version]);

  return { data, isLoading, error, refresh };
}
