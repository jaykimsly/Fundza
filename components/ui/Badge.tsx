import type { HTMLAttributes, ReactNode } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: 'brand' | 'success' | 'warning' | 'danger' };

export default function Badge({ children, tone = 'brand', className = '', ...props }: BadgeProps) {
  return <span className={`fd-chip fd-chip-${tone} ${className}`.trim()} {...props}>{children}</span>;
}
