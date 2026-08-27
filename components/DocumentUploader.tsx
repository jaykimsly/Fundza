'use client';

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  studentId: string;
  onAnalysisComplete: (analysis: any, extractedSubjects?: any[]) => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const REPORT_BUCKET = 'report-documents';
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'report';
}

export default function DocumentUploader({ studentId, onAnalysisComplete }: Props) {
  const [term, setTerm] = useState('Term 3');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<{ code: string; message: string; setupUrl?: string } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setProgress('');
    setTextContent('');

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setFileName('');
      setError({ code: 'FILE_TOO_LARGE', message: `File too large. Max ${MAX_FILE_SIZE_MB}MB.` });
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setSelectedFile(null);
      setFileName('');
      setError({
        code: 'UNSUPPORTED_TYPE',
        message: 'Please upload a PDF or image (JPG, PNG, WEBP, HEIC, or HEIF). Word documents are not supported yet.',
      });
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const uploadToStorage = async (file: File, userId: string) => {
    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (!uploadError) return path;
      lastError = uploadError;
      if (attempt < 3) await sleep(500 * attempt);
    }

    throw lastError || new Error('Storage upload failed');
  };

  const analyze = async () => {
    setError(null);

    if (!selectedFile && !textContent.trim()) {
      setError({ code: 'NO_CONTENT', message: 'Please upload a report, take a photo, or paste report text.' });
      return;
    }

    setUploading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError({ code: 'AUTH_REQUIRED', message: 'Your session has expired. Please sign in again.' });
        return;
      }

      let storagePath: string | null = null;

      if (selectedFile) {
        setProgress('Uploading your report securely...');
        storagePath = await uploadToStorage(selectedFile, user.id);
        setProgress('Report uploaded. AI is reading it...');
      } else {
        setProgress('Sending your report text to AI...');
      }

      let response: Response | null = null;
      let data: any = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath,
            mimeType: selectedFile?.type || null,
            fileName: selectedFile?.name || 'pasted-text',
            content: selectedFile ? undefined : textContent,
            term,
            mode: selectedFile ? 'file' : 'text',
            studentId,
          }),
        });

        data = await response.json().catch(() => null);

        const retryable = response.status === 503 || data?.code === 'AI_TIMEOUT' || data?.code === 'AI_RATE_LIMIT' || data?.code === 'AI_UNAVAILABLE';
        if (!retryable || attempt === 2) break;
        setProgress('The AI service is busy. Retrying securely...');
        await sleep(1500);
      }

      if (!response?.ok || data?.error) {
        setError({
          code: data?.code || 'API_ERROR',
          message: data?.error || 'The report could not be analysed. Please try again.',
          setupUrl: data?.setupUrl,
        });
        return;
      }

      if (!data?.analysis) {
        setError({ code: 'EMPTY_ANALYSIS', message: 'The report was uploaded, but no analysis was returned.' });
        return;
      }

      setProgress('✓ Analysis complete!');
      onAnalysisComplete(data.analysis, data.analysis.subjects);
    } catch (err: any) {
      console.error('Report upload error:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'The report could not be uploaded or analysed. Check your connection and try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setFileName('');
    setSelectedFile(null);
    setTextContent('');
    setProgress('');
    setError(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <div className="card">
        <h3>Which term is this report for?</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Final Exam'].map(t => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              disabled={uploading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '999px',
                border: '1px solid #e2e8f0',
                background: term === t ? '#2563eb' : 'white',
                color: term === t ? 'white' : '#475569',
                fontSize: '0.875rem',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Upload Report or Test</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Take a photo, choose a PDF/image, or paste report text. Maximum file size: {MAX_FILE_SIZE_MB}MB.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1, padding: '0.875rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer' }}
          >
            Take Photo
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} style={{ display: 'none' }} />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1, padding: '0.875rem', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer' }}
          >
            Choose File
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onFileChange} style={{ display: 'none' }} />
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            Or paste report text:
          </label>
          <textarea
            value={textContent}
            onChange={e => {
              setSelectedFile(null);
              setFileName('');
              setTextContent(e.target.value);
            }}
            placeholder="Copy and paste your report text here..."
            rows={4}
            disabled={uploading}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9375rem', marginTop: '0.375rem', resize: 'vertical' }}
          />
        </div>

        {fileName && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{fileName} ({term})</span>
            <button onClick={clear} disabled={uploading} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>Remove</button>
          </div>
        )}

        <button
          onClick={analyze}
          disabled={uploading || (!selectedFile && !textContent.trim())}
          className="btn"
          style={{ width: '100%', marginTop: '1rem', opacity: uploading || (!selectedFile && !textContent.trim()) ? 0.6 : 1 }}
        >
          {uploading ? 'Analyzing...' : 'Analyze My Report'}
        </button>

        {progress && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', color: '#1e40af', fontSize: '0.875rem', textAlign: 'center' }}>
            {progress}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '0.75rem', padding: '1rem', borderRadius: '8px', background: error.code === 'NO_API_KEY' ? '#fff7ed' : '#fef2f2', border: `1px solid ${error.code === 'NO_API_KEY' ? '#fdba74' : '#fecaca'}` }}>
            <p style={{ fontWeight: 600, color: error.code === 'NO_API_KEY' ? '#9a3412' : '#991b1b', marginBottom: '0.5rem' }}>
              {error.code === 'NO_API_KEY' ? 'AI Not Configured' : 'Report Upload Error'}
            </p>
            <p style={{ color: error.code === 'NO_API_KEY' ? '#7c2d12' : '#7f1d1d', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {error.message}
            </p>
            {error.code === 'NO_API_KEY' && error.setupUrl && (
              <a href={error.setupUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', padding: '0.5rem 1rem', background: '#ea580c', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                Get Gemini API Key
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
