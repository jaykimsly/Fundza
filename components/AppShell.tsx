'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppLoader from '@/components/AppLoader';

const PUBLIC_ROUTES = ['/login', '/auth', '/legal'];
const REQUIRED_DOCUMENTS = ['terms', 'privacy', 'copyright', 'legal'] as const;

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/study', label: 'Study' },
  { href: '/quiz', label: 'Practice' },
  { href: '/exams', label: 'Exams' },
  { href: '/progress', label: 'Progress' },
  { href: '/upload', label: 'Review' },
  { href: '/profile', label: 'Profile' },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingLegal, setCheckingLegal] = useState(true);
  const [showNav, setShowNav] = useState(false);

  const isLegalRoute = useMemo(() => pathname === '/legal' || pathname.startsWith('/legal/'), [pathname]);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (isPublicRoute(pathname)) {
        setShowNav(false);
        setCheckingLegal(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setShowNav(false);
        setCheckingLegal(false);
        return;
      }

      const { data: docs, error: docsError } = await supabase
        .from('legal_documents')
        .select('document_type, version')
        .eq('required', true);

      if (docsError) {
        console.error('Unable to verify legal compliance', docsError);
        setShowNav(true);
        setCheckingLegal(false);
        return;
      }

      const { data: acceptances, error: acceptanceError } = await supabase
        .from('legal_acceptances')
        .select('document_type, document_version')
        .eq('user_id', user.id);

      if (acceptanceError) {
        console.error('Unable to load legal acceptances', acceptanceError);
        setShowNav(true);
        setCheckingLegal(false);
        return;
      }

      const accepted = new Set((acceptances || []).map((item) => `${item.document_type}:${item.document_version}`));
      const missing = REQUIRED_DOCUMENTS.some((type) => {
        const doc = (docs || []).find((item) => item.document_type === type);
        return !doc || !accepted.has(`${type}:${doc.version}`);
      });

      if (missing && !isLegalRoute && pathname !== '/profile') {
        router.replace(`/legal/accept?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }

      setShowNav(!isLegalRoute);
      setCheckingLegal(false);
    };

    checkAccess();
    return () => { cancelled = true; };
  }, [pathname, router, isLegalRoute]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (!isPublicRoute(pathname)) router.replace('/login');
      }
    });
    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (checkingLegal && !isPublicRoute(pathname)) {
    return <AppLoader message="Checking your account and preparing Fundza..." />;
  }

  return (
    <>
      {showNav && (
        <>
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="brand" aria-label="Fundza home">Fundza</Link>
              <nav className="desktop-nav" aria-label="Primary navigation">
                {primaryLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActivePath(pathname, href) ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {primaryLinks.slice(0, 5).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={isActivePath(pathname, href) ? 'active' : ''}
                aria-current={isActivePath(pathname, href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
      <div id="main-content">{children}</div>
    </>
  );
}
