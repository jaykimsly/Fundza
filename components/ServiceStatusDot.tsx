'use client';

import { useEffect, useState } from 'react';

type Status = 'available' | 'degraded' | 'offline';

const STATUS_META: Record<Status, { label: string; color: string; shadow: string }> = {
  available: { label: 'Available', color: '#22c55e', shadow: '0 0 0 4px rgba(34,197,94,.13)' },
  degraded: { label: 'Limited', color: '#f59e0b', shadow: '0 0 0 4px rgba(245,158,11,.14)' },
  offline: { label: 'Offline', color: '#ef4444', shadow: '0 0 0 4px rgba(239,68,68,.13)' },
};

export default function ServiceStatusDot() {
  const [status, setStatus] = useState<Status>('degraded');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/api/ai/health', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
        const payload: unknown = await response.json();
        if (cancelled) return;
        const next = typeof payload === 'object' && payload !== null && 'status' in payload ? (payload.status as Status) : 'offline';
        setStatus(next === 'available' || next === 'degraded' || next === 'offline' ? next : 'offline');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    };

    void check();
    const interval = window.setInterval(check, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const meta = STATUS_META[status];
  return (
    <span
      title={meta.label}
      aria-label={meta.label}
      role="status"
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        flex: '0 0 10px',
        borderRadius: '999px',
        background: meta.color,
        boxShadow: meta.shadow,
      }}
    />
  );
}
