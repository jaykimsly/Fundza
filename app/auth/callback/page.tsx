'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppLoader from '@/components/AppLoader';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    const resolveSession = async () => {
      const code = searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Auth callback exchange failed:', error.message);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!active) return;

      router.replace(session ? '/' : '/login');
    };

    resolveSession();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return <AppLoader message="Verifying your account..." />;
}
