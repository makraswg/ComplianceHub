'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemoFirebase } from '@/firebase';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * Custom hook to listen to a Firestore collection.
 * It automatically handles loading, error, and data states, and unsubscribes on unmount.
 * @template T Type of the document data.
 * @param {Query<T, DocumentData> | CollectionReference<T, DocumentData> | null} targetRefOrQuery - The Firestore query or collection reference to listen to.
 * @param {object} [options] - Options for the snapshot listener.
 * @param {boolean} [options.includeMetadataChanges] - Whether to include metadata changes in the snapshot.
 * @returns {UseCollectionResult<T>} The state of the collection listener.
 */
export function useCollection<T>(
  targetRefOrQuery: Query<T, DocumentData> | CollectionReference<T, DocumentData> | null,
  options?: { includeMetadataChanges?: boolean }
): UseCollectionResult<T> {
  const memoizedTargetRefOrQuery = useMemoFirebase(
    () => targetRefOrQuery,
    [targetRefOrQuery]
  );

  type StateDataType = WithId<T>[] | null;
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      { includeMetadataChanges: options?.includeMetadataChanges },
      (snapshot: QuerySnapshot<T, DocumentData>) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(docs);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
          // Robust path resolution for error context
          const path = memoizedTargetRefOrQuery instanceof CollectionReference 
            ? memoizedTargetRefOrQuery.path 
            : 'collectionGroup/query';

          const customError = new FirestorePermissionError({
            operation: 'list',
            path: path,
          });
          setError(customError as any);
          errorEmitter.emit('permission-error', customError);
        } else {
          setError(err);
        }
        setIsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [memoizedTargetRefOrQuery, options?.includeMetadataChanges]);

  return { data, isLoading, error };
}
