'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function FundzaCard({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return <section className={`fd-card${interactive ? ' fd-card-interactive' : ''} ${className}`.trim()}>{children}</section>;
}

export function FundzaButton({
  children,
  href,
  variant = 'primary',
  className = '',
  type = 'button',
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const classes = `fd-button fd-button-${variant} ${className}`.trim();
  if (href) return <Link href={href} className={classes}>{children}</Link>;
  return <button type={type} className={classes} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function FundzaBadge({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
}) {
  return <span className={`fd-chip fd-chip-${tone}`}>{children}</span>;
}

export function ProgressRing({
  value,
  size = 92,
  stroke = 8,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeValue / 100);

  return (
    <div
      aria-label={label || `${Math.round(safeValue)}% complete`}
      role="img"
      style={{ width: size, height: size, position: 'relative', flex: '0 0 auto' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--fd-color-ink-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--fd-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: size < 80 ? '1rem' : '1.35rem', lineHeight: 1 }}>
        {Math.round(safeValue)}%
      </strong>
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div>
      <p className="fd-section-label">{label}</p>
      <p style={{ margin: 0, fontSize: 'clamp(1.25rem, 3vw, 1.7rem)', fontWeight: 800, lineHeight: 1.1 }}>{value}</p>
      {detail ? <p style={{ margin: '.35rem 0 0', color: 'var(--fd-text-subtle)', fontSize: 'var(--fd-text-xs)' }}>{detail}</p> : null}
    </div>
  );
}
