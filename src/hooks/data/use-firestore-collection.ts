"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';

/**
 * Ein Hook, um Daten aus einer Firestore-Sammlung in Echtzeit zu laden.
 */
export function useFirestoreCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const db = useFirestore();

  useEffect(() => {
    if (!enabled || !db) {
      if (!enabled) {
        setIsLoading(false);
        setData(null);
        setError(null);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    // Echtzeit-Listener via onSnapshot
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const collectionData = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        })) as T[];
        setData(collectionData);
        setIsLoading(false);
      },
      (err) => {
        console.error("Firestore real-time sync error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, db, enabled]);

  // Refresh ist bei Echtzeit-Listenern nicht notwendig, wird aber für die API-Konsistenz mitgeliefert
  return { data, isLoading, error, refresh: () => {} };
}
