'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LEGAL_DOCUMENTS, LegalDocumentType } from '@/lib/legal';

const required: LegalDocumentType[] = ['terms', 'privacy', 'copyright', 'legal'];

export default function LegalAcceptPage() {
  const router = useRouter();
  const returnTo = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const requested = new URLSearchParams(window.location.search).get('returnTo');
    return requested?.startsWith('/') ? requested : '/';
  }, []);
  const [checked, setChecked] = useState<Record<LegalDocumentType, boolean>>({ terms: false, privacy: false, copyright: false, legal: false });
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [emailWarning, setEmailWarning] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: acceptances } = await supabase.from('legal_acceptances').select('document_type, document_version').eq('user_id', user.id);
      const next = { terms: false, privacy: false, copyright: false, legal: false };
      for (const type of required) next[type] = (acceptances || []).some((item) => item.document_type === type && item.document_version === LEGAL_DOCUMENTS[type].version);
      setChecked(next);
      setLoading(false);
    };
    load();
  }, [router]);

  const allChecked = useMemo(() => required.every((type) => checked[type]) && understood, [checked, understood]);

  const submit = async () => {
    if (!allChecked || saving) return;
    setSaving(true); setMessage(''); setEmailWarning('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }

    const { data, error } = await supabase.functions.invoke('accept-legal-documents', {
      body: { user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null },
    });
    if (error || data?.accepted !== true) {
      setMessage(error?.message || data?.error || 'Unable to record your legal acceptance.');
      setSaving(false);
      return;
    }
    if (data.email_sent === false) setEmailWarning('Your acceptance was recorded, but the confirmation email could not be sent yet.');
    else setMessage('Your legal acceptance has been recorded and the confirmation email has been sent.');
    setSaving(false);
    router.replace(returnTo);
  };

  if (loading) return <main className="app-loading"><div className="loading-card"><strong>Loading legal documents...</strong><span>Checking which current versions your account has accepted.</span></div></main>;

  return (
    <main className="legal-shell">
      <section className="legal-hero">
        <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: '.8rem', textTransform: 'uppercase' }}>Account access</p>
        <h1>Review and sign before continuing</h1>
        <p>Your account is temporarily limited to this page until all required current documents are accepted. This happens again whenever a required document version changes.</p>
      </section>
      <div className="legal-status locked"><strong>Account locked for app access.</strong> Review the four current documents below and confirm that you understand them. Your profile remains available so you can manage this requirement.</div>
      <section className="card">
        <h2>Required documents</h2>
        <div className="legal-checklist">
          {required.map((type) => { const document = LEGAL_DOCUMENTS[type]; return <label className="legal-check" key={type}><input type="checkbox" checked={checked[type]} onChange={(event) => setChecked((current) => ({ ...current, [type]: event.target.checked }))} /><span><strong>{document.title} · v{document.version}</strong><span><Link href={document.href} target="_blank" rel="noreferrer">Open and review the full document</Link>. Tick this box only after reading it.</span></span></label>; })}
        </div>
        <label className="legal-check legal-signature"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} /><span><strong>I confirm that I have read, understood and agree to the current Fundza legal documents.</strong><span>This is your electronic acceptance. Fundza records the document versions, timestamp, acceptance method and browser user-agent for the audit record.</span></span></label>
        {message && <div className="legal-status success" style={{ marginTop: '1rem' }}>{message}</div>}
        {emailWarning && <div className="legal-status locked" style={{ marginTop: '1rem' }}>{emailWarning}</div>}
        <div className="legal-actions"><button className="btn" disabled={!allChecked || saving} onClick={submit}>{saving ? 'Saving acceptance...' : 'Sign and continue'}</button><Link className="btn btn-secondary" href="/profile">Open profile</Link></div>
      </section>
    </main>
  );
}
