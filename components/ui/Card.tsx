import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & { children: ReactNode; interactive?: boolean };

export default function Card({ children, className = '', interactive = false, ...props }: CardProps) {
  return (
    <section className={`fd-card ${interactive ? 'fd-card-interactive' : ''} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
