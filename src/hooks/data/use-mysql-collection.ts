"use client";

import { useState, useEffect, useCallback } from 'react';
import { getCollectionData } from '@/app/actions/mysql-actions';

/**
 * Ein Hook, um Daten aus einer MySQL-Datenbank mit manueller Refresh-Option zu laden.
 */
export function useMysqlCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Erlaubt es Komponenten, eine Neuladung der Daten zu erzwingen
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

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getCollectionData(collectionName);

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data as T[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [collectionName, enabled, version]);

  return { data, isLoading, error, refresh };
}
