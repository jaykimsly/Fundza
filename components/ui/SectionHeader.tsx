import type { ReactNode } from 'react';

type SectionHeaderProps = { eyebrow?: string; title: string; description?: string; action?: ReactNode };

export default function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <header className="fd-section-header">
      <div>
        {eyebrow && <p className="fd-section-label">{eyebrow}</p>}
        <h2 className="fd-section-title">{title}</h2>
        {description && <p className="fd-section-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}
