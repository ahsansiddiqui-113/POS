import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOfflineMode, PendingOperation } from '../hooks/useOfflineMode';

interface OfflineContextType {
  isOnline: boolean;
  isOffline: boolean;
  pendingCount: number;
  pendingOperations: PendingOperation[];
  queueOperation: (type: 'create' | 'update' | 'delete', entity: string, data: any) => string;
  removeOperation: (id: string) => void;
  clearPendingOperations: () => void;
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const offlineMode = useOfflineMode();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = async () => {
    if (isSyncing || offlineMode.isOffline) return;

    setIsSyncing(true);
    try {
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      // In a real app, you would sync with the backend here
      offlineMode.clearPendingOperations();
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (offlineMode.isOnline && offlineMode.pendingCount > 0) {
      syncNow();
    }
  }, [offlineMode.isOnline]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline: offlineMode.isOnline,
        isOffline: offlineMode.isOffline,
        pendingCount: offlineMode.pendingCount,
        pendingOperations: offlineMode.pendingOperations,
        queueOperation: offlineMode.queueOperation,
        removeOperation: offlineMode.removeOperation,
        clearPendingOperations: offlineMode.clearPendingOperations,
        syncNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
