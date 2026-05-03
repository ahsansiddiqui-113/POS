import { useState, useCallback, useEffect } from 'react';

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
}

export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check online status periodically
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending operations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pendingOperations');
    if (stored) {
      try {
        setPendingOperations(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load pending operations', error);
      }
    }
  }, []);

  // Save pending operations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pendingOperations', JSON.stringify(pendingOperations));
  }, [pendingOperations]);

  const queueOperation = useCallback((type: 'create' | 'update' | 'delete', entity: string, data: any) => {
    const operation: PendingOperation = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      entity,
      data,
      timestamp: Date.now(),
    };
    setPendingOperations(prev => [...prev, operation]);
    return operation.id;
  }, []);

  const removeOperation = useCallback((id: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== id));
  }, []);

  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    pendingOperations,
    pendingCount: pendingOperations.length,
    queueOperation,
    removeOperation,
    clearPendingOperations,
    isSyncing,
    setIsSyncing,
  };
};
