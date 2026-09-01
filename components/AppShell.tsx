'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppLoader from '@/components/AppLoader';
import AppIcon from '@/components/AppIcon';

const PUBLIC_ROUTES = ['/login', '/auth', '/legal', '/landing'];
const REQUIRED_DOCUMENTS = ['terms', 'privacy', 'copyright', 'legal'] as const;

const primaryLinks = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/study', label: 'Study', icon: 'book' },
  { href: '/quiz', label: 'Practice', icon: 'quiz' },
  { href: '/exams', label: 'Exams', icon: 'exam' },
  { href: '/progress', label: 'Progress', icon: 'progress' },
  { href: '/upload', label: 'Review', icon: 'upload' },
] as const;

const mobileLinks = primaryLinks.slice(0, 5);

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

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

      const { data: docs, error: docsError } = await supabase.from('legal_documents').select('document_type, version').eq('required', true);
      if (docsError) {
        console.error('Unable to verify legal compliance', docsError);
        setShowNav(true);
        setCheckingLegal(false);
        return;
      }

      const { data: acceptances, error: acceptanceError } = await supabase.from('legal_acceptances').select('document_type, document_version').eq('user_id', user.id);
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

  if (checkingLegal && !isPublicRoute(pathname)) return <AppLoader message="Checking your account and preparing Fundza..." />;

  const shell = showNav ? (
    <div className="fd-app-shell">
      <aside className="fd-desktop-sidebar" aria-label="Fundza navigation">
        <div className="fd-sidebar-inner">
          <Link href="/" className="fd-shell-brand fd-sidebar-brand" aria-label="Fundza home"><span className="fd-shell-logo" aria-hidden="true">F</span><span>Fundza</span></Link>
          <nav className="fd-sidebar-nav" aria-label="Primary navigation">
            {primaryLinks.map((item) => {
              const active = isActivePath(pathname, item.href);
              return <Link key={item.href} href={item.href} className={`fd-sidebar-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}><span className="fd-sidebar-icon" aria-hidden="true"><AppIcon name={item.icon} size={18} /></span><span>{item.label}</span></Link>;
            })}
          </nav>
          <div className="fd-sidebar-spacer" />
          <div className="fd-sidebar-footer"><Link href="/profile"><span className="fd-sidebar-icon" aria-hidden="true"><AppIcon name="user" size={18} /></span><span>Profile & settings</span></Link></div>
        </div>
      </aside>

      <header className="fd-mobile-header"><Link href="/" className="fd-shell-brand" aria-label="Fundza home"><span className="fd-shell-logo" aria-hidden="true">F</span><span>Fundza</span></Link><Link href="/profile" className="fd-shell-profile" aria-label="Open profile"><AppIcon name="user" size={17} /></Link></header>

      <div className="fd-main-frame"><main id="main-content">{children}</main></div>

      <nav className="fd-mobile-bottom mobile-nav" aria-label="Mobile navigation">
        {mobileLinks.map((item) => {
          const active = isActivePath(pathname, item.href);
          return <Link key={item.href} href={item.href} className={`fd-mobile-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}><span className="fd-mobile-icon" aria-hidden="true"><AppIcon name={item.icon} size={18} /></span><span className="fd-mobile-label">{item.label}</span></Link>;
        })}
      </nav>
    </div>
  ) : <main id="main-content">{children}</main>;

  return shell;
}
