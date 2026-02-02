'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentReference,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemoFirebase } from '@/firebase';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDocument hook.
 * @template T Type of the document data.
 */
export interface UseDocumentResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | null;
}

/**
 * Custom hook to listen to a Firestore document.
 * @template T Type of the document data.
 * @param {DocumentReference<T, DocumentData> | null} docRef - The Firestore document reference to listen to.
 * @param {object} [options] - Options for the snapshot listener.
 * @param {boolean} [options.includeMetadataChanges] - Whether to include metadata changes in the snapshot.
 * @returns {UseDocumentResult<T>} The state of the document listener.
 */
export function useDocument<T>(
  docRef: DocumentReference<T, DocumentData> | null,
  options?: { includeMetadataChanges?: boolean }
): UseDocumentResult<T> {
  const memoizedDocRef = useMemoFirebase(() => docRef, [docRef]);

  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      { includeMetadataChanges: options?.includeMetadataChanges },
      (snapshot: DocumentSnapshot<T, DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id });
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
          const customError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
          });
          errorEmitter.emit('permission-error', customError);
          setError(customError as unknown as FirestoreError);
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
  }, [memoizedDocRef, options?.includeMetadataChanges]);

  return { data, isLoading, error };
}
