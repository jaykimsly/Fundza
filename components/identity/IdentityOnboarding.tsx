'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PhotoIdentityCard from './PhotoIdentityCard';

const templates = [
  { name: 'ZENITH', subtitle: 'Focus · Discipline · Freedom', tone: 'light' as const, fallbackLabel: 'Z' },
  { name: 'NOVA', subtitle: 'Focus · Discipline · Freedom', tone: 'dark' as const, fallbackLabel: 'N' },
];

type IdentityState = {
  photoOneUrl: string | null;
  photoTwoUrl: string | null;
};

export default function IdentityOnboarding() {
  const [files, setFiles] = useState<[File | null, File | null]>([null, null]);
  const [saved, setSaved] = useState<IdentityState>({ photoOneUrl: null, photoTwoUrl: null });
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/identity', { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Unable to load identity');
        return response.json() as Promise<{ identity: IdentityState | null }>;
      })
      .then((data) => {
        if (!active) return;
        if (data?.identity) setSaved(data.identity);
        setStatus('idle');
      })
      .catch(() => {
        if (active) {
          setStatus('idle');
          setMessage('Saved identity could not be loaded. You can still choose photos.');
        }
      });
    return () => { active = false; };
  }, []);

  const canSave = files[0] !== null && files[1] !== null;

  const saveIdentity = async () => {
    if (!canSave || !files[0] || !files[1]) return;
    setStatus('saving');
    setMessage('');

    const formData = new FormData();
    formData.append('photoOne', files[0]);
    formData.append('photoTwo', files[1]);

    try {
      const response = await fetch('/api/identity', { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setStatus('idle');
        setMessage('Log in before saving your personal identity. Your template previews remain available here.');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to save photos');
      setSaved(data.identity);
      setFiles([null, null]);
      setStatus('saved');
      setMessage('Your two-photo identity is saved securely.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save your photos. Please try again.');
    }
  };

  return (
    <div className="fd-identity-onboarding">
      <div className="fd-photo-grid">
        {templates.map((template, index) => (
          <PhotoIdentityCard
            key={template.name}
            slot={index + 1}
            {...template}
            initialPreview={saved[index === 0 ? 'photoOneUrl' : 'photoTwoUrl']}
            onFileChange={(file) => setFiles((current) => {
              const next: [File | null, File | null] = [...current];
              next[index] = file;
              return next;
            })}
          />
        ))}
      </div>

      <div className="fd-identity-actions">
        <Button type="button" disabled={!canSave || status === 'saving'} onClick={() => void saveIdentity()}>
          {status === 'saving' ? 'Saving identity…' : status === 'saved' ? 'Identity saved' : 'Save my two photos'}
        </Button>
        <p className="fd-identity-hint">Photos stay private and are linked to your authenticated Fundza student profile.</p>
        {status !== 'loading' && !canSave && !saved.photoOneUrl && (
          <p className="fd-identity-hint">Choose both photos to enable saving.</p>
        )}
        {message && <p className="fd-identity-status" role="status">{message}</p>}
        {message.includes('Log in') && <Link href="/login" className="fd-landing-secondary">Log in to save</Link>}
      </div>
    </div>
  );
}
