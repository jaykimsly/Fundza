'use client';

import { useEffect, useState } from 'react';

type Status = 'available' | 'degraded' | 'offline';

const STATUS_META: Record<Status, { label: string; className: string }> = {
  available: { label: 'Available', className: 'service-status-dot service-status-dot--green' },
  degraded: { label: 'Limited', className: 'service-status-dot service-status-dot--orange' },
  offline: { label: 'Offline', className: 'service-status-dot service-status-dot--red' },
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
      className={meta.className}
      title={meta.label}
      aria-label={meta.label}
      role="status"
    />
  );
}
