import { useState, useEffect, useCallback } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinel | null>(null);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        setIsLocked(false);
        setWakeLockSentinel(null);
      });
      setWakeLockSentinel(sentinel);
      setIsLocked(true);
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      setIsLocked(false);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
      } catch (err) {
        console.warn('Wake Lock release error:', err);
      }
      setWakeLockSentinel(null);
      setIsLocked(false);
    }
  }, [wakeLockSentinel]);

  const toggleWakeLock = useCallback(async () => {
    if (isLocked) {
      await releaseWakeLock();
      return false;
    } else {
      return await requestWakeLock();
    }
  }, [isLocked, releaseWakeLock, requestWakeLock]);

  // Re-acquire lock if tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isLocked && !wakeLockSentinel) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocked, wakeLockSentinel, requestWakeLock]);

  return {
    isSupported,
    isLocked,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock,
  };
}
