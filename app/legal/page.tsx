import Link from 'next/link';
import {
  LEGAL_VERSION,
  LEGAL_EFFECTIVE_DATE,
} from '@/lib/legal';

export default function LegalPage() {
  return (
    <main className="container" style={{ maxWidth: '700px' }}>
      <div className="card">
        <h1>Fundza Legal Information</h1>

        <p style={{ color: '#64748b' }}>
          Version {LEGAL_VERSION} • Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <p>
          These documents explain the terms governing Fundza, how personal
          information is handled and the intellectual-property rights
          associated with the service.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Link href="/terms">Terms & Conditions</Link>
          <Link href="/privacy">Privacy Notice</Link>
          <Link href="/copyright">Copyright Notice</Link>
        </div>
      </div>
    </main>
  );
}
