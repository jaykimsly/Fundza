'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppLoader from '@/components/AppLoader';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const resolveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!active) return;

      if (session) {
        router.replace('/');
      } else {
        router.replace('/login');
      }
    };

    resolveSession();

    return () => {
      active = false;
    };
  }, [router]);

  return <AppLoader message="Verifying your account..." />;
}
