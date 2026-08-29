'use client';

import { useEffect, useState } from 'react';

export default function NetworkStatus() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const down = () => { setOffline(true); setReconnected(false); };
    const up = () => { setOffline(false); setReconnected(true); window.setTimeout(() => setReconnected(false), 4000); };
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => { window.removeEventListener('offline', down); window.removeEventListener('online', up); };
  }, []);

  if (!offline && !reconnected) return null;
  return (
    <div className={`network-banner ${offline ? 'network-banner-offline' : 'network-banner-online'}`} role="status">
      <strong>{offline ? 'No internet connection' : 'Back online'}</strong>
      <span>{offline ? 'Some Fundza features will pause until your connection returns.' : 'Your connection is back. You can continue studying.'}</span>
    </div>
  );
}
