'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
      } else {
        router.push('/login');
      }
    });
  }, [router]);

  return (
    <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1>Logging you in...</h1>
      <p style={{ color: '#64748b' }}>Please wait while we verify your account.</p>
    </main>
  );
}
