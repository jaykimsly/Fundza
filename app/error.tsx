'use client';

import { useEffect } from 'react';
import StatusScreen from '@/components/StatusScreen';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Fundza application error:', error); }, [error]);
  return <StatusScreen kind="error" code="500" message="Fundza hit an unexpected problem. Try again. If it keeps happening, the problem may be on our side." onRetry={reset} />;
}
