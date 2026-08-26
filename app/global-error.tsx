'use client';

import { useEffect } from 'react';
import StatusScreen from '@/components/StatusScreen';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Fundza fatal error:', error); }, [error]);
  return <html lang="en"><body><StatusScreen kind="error" code="500" message="Fundza could not start this page correctly. Try again. If the problem continues, the service may need attention." onRetry={reset} /></body></html>;
}
