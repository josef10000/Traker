import { useState, useEffect } from 'react';

interface UseNetworkStatusOptions {
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

export const useNetworkStatus = (options?: UseNetworkStatusOptions) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (options?.onReconnect) {
        options.onReconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      if (options?.onDisconnect) {
        options.onDisconnect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options]);

  return { isOnline, wasOffline };
};
