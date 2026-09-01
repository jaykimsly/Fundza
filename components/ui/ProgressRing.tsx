type ProgressRingProps = { value: number; label?: string; size?: number };

export default function ProgressRing({ value, label = 'complete', size = 96 }: ProgressRingProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  return (
    <div aria-label={`${safeValue}% ${label}`} role="img" style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--fd-color-ink-100)" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--fd-brand)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 48 48)" />
      </svg>
      <strong style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: '.9rem' }}>{safeValue}%</strong>
    </div>
  );
}
