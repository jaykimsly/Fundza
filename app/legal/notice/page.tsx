import Link from 'next/link';
import { LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export default function LegalNoticePage() {
  return (
    <main className="legal-shell">
      <article className="card legal-document">
        <p className="legal-meta">Version {LEGAL_VERSION} • Effective {LEGAL_EFFECTIVE_DATE}</p>
        <h1>Fundza Legal Notice</h1>
        <p style={{ color: 'var(--muted)', margin: '.5rem 0 1.5rem' }}>Important legal and educational-use information.</p>

        <h2>Educational support</h2>
        <p>Fundza is an educational support platform. Information, calculations, recommendations, AI responses, exam schedules and other materials should be checked against official sources where a high-stakes decision depends on them.</p>

        <h2>Not professional advice</h2>
        <p>Fundza does not replace an official school, examination authority, university, professional adviser or legal adviser.</p>

        <h2>Information accuracy</h2>
        <p>To the extent permitted by law, Fundza is not responsible for losses arising from reliance on inaccurate, incomplete, delayed or unavailable information. Nothing in Fundza is intended to unlawfully exclude rights that cannot legally be excluded.</p>

        <h2>Questions</h2>
        <p>For questions about this notice, use the official Fundza contact channel.</p>

        <hr style={{ margin: '1.5rem 0', border: 0, borderTop: '1px solid var(--border)' }} />
        <Link href="/legal">← Back to legal documents</Link>
      </article>
    </main>
  );
}
