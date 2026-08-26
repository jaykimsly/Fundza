'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppIcon from './AppIcon';

const items = [
  { href: '/', label: 'Home', icon: 'home' as const },
  { href: '/study', label: 'Study', icon: 'book' as const },
  { href: '/quiz', label: 'Quiz', icon: 'quiz' as const },
  { href: '/progress', label: 'Progress', icon: 'progress' as const },
  { href: '/setup', label: 'Profile', icon: 'user' as const },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
          >
            <AppIcon name={item.icon} size={21} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
