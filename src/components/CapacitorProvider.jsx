//src/components/CapacitorProvider.jsx

import { createContext, useContext } from 'react';
import { useCapacitor, useCamera, usePushNotifications, useFileSystem } from '../hooks/useCapacitor';

const CapacitorContext = createContext(null);

export function CapacitorProvider({ children }) {
  const capacitor = useCapacitor();
  const camera = useCamera();
  const push = usePushNotifications();
  const filesystem = useFileSystem();

  const value = {
    ...capacitor,
    camera,
    push,
    filesystem,
  };

  return (
    <CapacitorContext.Provider value={value}>
      {children}
    </CapacitorContext.Provider>
  );
}

export function useCapacitorContext() {
  const context = useContext(CapacitorContext);
  if (!context) {
    throw new Error('useCapacitorContext must be used within CapacitorProvider');
  }
  return context;
}