import Link from 'next/link';
import { LEGAL_VERSION, LEGAL_EFFECTIVE_DATE, LEGAL_DOCUMENTS } from '@/lib/legal';

export default function LegalPage() {
  return (
    <main className="legal-shell">
      <section className="legal-hero">
        <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: '.8rem', textTransform: 'uppercase' }}>Fundza</p>
        <h1>Terms, Privacy & Legal</h1>
        <p>Review the documents that govern Fundza. Current version: {LEGAL_VERSION} • Effective {LEGAL_EFFECTIVE_DATE}.</p>
        <div className="legal-actions">
          <Link href="/legal/accept" className="btn">Review & sign</Link>
          <Link href="/login" className="btn btn-secondary">Back to login</Link>
        </div>
      </section>

      <section className="card">
        <h2>Current documents</h2>
        <div className="profile-links" style={{ marginTop: '1rem' }}>
          {Object.values(LEGAL_DOCUMENTS).map((document) => (
            <Link href={document.href} key={document.type}>
              <span>{document.title}</span>
              <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>v{document.version} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Why acceptance is required</h2>
        <p style={{ color: 'var(--muted)' }}>Fundza records the exact document version accepted by each user. When a required document changes, access to the main app is paused until the user reviews and accepts the new version again.</p>
      </section>
    </main>
  );
}
