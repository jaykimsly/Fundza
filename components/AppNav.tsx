'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/study', label: 'Study', icon: '▣' },
  { href: '/quiz', label: 'Practice', icon: '✓' },
  { href: '/exams', label: 'Exams', icon: '◷' },
  { href: '/progress', label: 'Progress', icon: '↗' },
  { href: '/upload', label: 'Review', icon: '↑' },
];

export default function AppNav() {
  const pathname = usePathname();
  const hidden = ['/login', '/setup', '/auth', '/english'].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (hidden) return null;

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <div className="app-nav-inner">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? 'app-nav-link active' : 'app-nav-link'} aria-current={active ? 'page' : undefined}>
              <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
