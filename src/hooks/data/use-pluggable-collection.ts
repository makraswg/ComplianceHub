"use client";

import { useSettings } from "@/context/settings-context";
import { useFirestoreCollection } from "./use-firestore-collection";
import { useMockCollection } from "./use-mock-collection";
import { useMysqlCollection } from "./use-mysql-collection";

/**
 * Universeller Hook, der die passende Datenquelle wählt und ein reaktives Interface bietet.
 */
export function usePluggableCollection<T>(collectionName: string) {
  const { dataSource } = useSettings();

  const firestoreState = useFirestoreCollection<T>(collectionName, dataSource === 'firestore');
  const mockState = useMockCollection<T>(collectionName, dataSource === 'mock');
  const mysqlState = useMysqlCollection<T>(collectionName, dataSource === 'mysql');

  switch (dataSource) {
    case 'mysql':
      return mysqlState;
    case 'mock':
      return mockState;
    case 'firestore':
    default:
      return firestoreState;
  }
}
