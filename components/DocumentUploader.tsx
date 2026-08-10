'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  studentId: string;
  onAnalysisComplete: (analysis: any, extractedSubjects?: any[]) => void;
}

const MAX_FILE_SIZE_MB = 10;
const POLL_INTERVAL = 2000; // 2 seconds

export default function DocumentUploader({ studentId, onAnalysisComplete }: Props) {
  const [term, setTerm] = useState('Term 3');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<{ code: string; message: string; setupUrl?: string } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError({ code: 'FILE_TOO_LARGE', message: `File too large. Max ${MAX_FILE_SIZE_MB}MB.` });
      return;
    }

    setFileName(file.name);
    setMimeType(file.type);

    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFileData(base64);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain') {
      const text = await file.text();
      setTextContent(text);
    } else {
      setError({ code: 'UNSUPPORTED_TYPE', message: 'For Word documents, please copy and paste the text below.' });
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const startPolling = (id: string) => {
    setJobId(id);
    setProgress('AI is reading your report...');

    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: id, studentId }),
        });

        const data = await res.json();

        if (data.success && data.analysis) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setJobId(null);
          setUploading(false);
          setProgress('✓ Analysis complete!');

          // Save to Supabase
          if (isSupabaseConfigured()) {
            const { data: doc } = await supabase
              .from('documents')
              .insert({
                student_id: studentId,
                file_name: fileName || 'pasted-text',
                file_url: 'ai-processed',
                file_type: term,
                extracted_text: textContent || '[image/pdf processed]',
              })
              .select()
              .single();

            if (doc) {
              await supabase.from('document_analyses').insert({
                document_id: doc.id,
                student_id: studentId,
                overall_summary: data.analysis.overall_summary,
                subject_analyses: data.analysis.subjects,
                recommendations: data.analysis.overall_recommendations,
                aps_estimate: data.analysis.aps_estimate,
              });
            }
          }

          onAnalysisComplete(data.analysis, data.analysis.subjects);
        } else if (data.error) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setJobId(null);
          setUploading(false);
          setError({ code: data.code || 'ANALYSIS_FAILED', message: data.error });
        }
        // else still pending/processing, keep polling
      } catch (err: any) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setJobId(null);
        setUploading(false);
        setError({ code: 'NETWORK_ERROR', message: 'Connection lost. Please try again.' });
      }
    }, POLL_INTERVAL);
  };

  const analyze = async () => {
    setError(null);
    const payload = fileData
      ? { fileData, mimeType, term, mode: 'vision' }
      : { content: textContent, term, mode: 'text' };

    if (!payload.fileData && !payload.content?.trim()) {
      setError({ code: 'NO_CONTENT', message: 'Please upload a file, take a photo, or paste report text.' });
      return;
    }

    setUploading(true);
    setProgress('Sending to AI...');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, studentId}),
      });

      const data = await res.json();

      if (data.code === 'NO_API_KEY') {
        setUploading(false);
        setError({
          code: 'NO_API_KEY',
          message: data.message,
          setupUrl: data.setupUrl,
        });
        return;
      }

      if (data.error && !data.jobId) {
        setUploading(false);
        setError({ code: data.code || 'API_ERROR', message: data.error });
        return;
      }

      if (data.jobId) {
        startPolling(data.jobId);
      }
    } catch (err: any) {
      setUploading(false);
      setError({ code: 'NETWORK_ERROR', message: 'Failed to connect. Check your internet.' });
    }
  };

  const clear = () => {
    setFileName('');
    setFileData(null);
    setTextContent('');
    setProgress('');
    setError(null);
    if (pollTimer.current) clearInterval(pollTimer.current);
    setJobId(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {/* Term Selector */}
      <div className="card">
        <h3>Which term is this report for?</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Final Exam'].map(t => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '999px',
                border: '1px solid #e2e8f0',
                background: term === t ? '#2563eb' : 'white',
                color: term === t ? 'white' : '#475569',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Options */}
      <div className="card">
        <h3>📄 Upload Report or Test</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Take a photo, pick a file, or paste text.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => cameraRef.current?.click()}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📷 Take Photo
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} style={{ display: 'none' }} />

          <button
            onClick={() => fileRef.current?.click()}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'white',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📁 Choose File
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" onChange={onFileChange} style={{ display: 'none' }} />
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            Or paste report text:
          </label>
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            placeholder="Copy and paste your report text here..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.9375rem',
              marginTop: '0.375rem',
              resize: 'vertical',
            }}
          />
        </div>

        {fileName && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: '#f8fafc',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#475569',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>📎 {fileName} ({term})</span>
            <button onClick={clear} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
          </div>
        )}

        <button
          onClick={analyze}
          disabled={uploading || (!fileData && !textContent.trim())}
          className="btn"
          style={{ width: '100%', marginTop: '1rem', opacity: uploading || (!fileData && !textContent.trim()) ? 0.6 : 1 }}
        >
          {uploading ? 'Analyzing...' : 'Analyze My Report'}
        </button>

        {/* Progress */}
        {uploading && !error && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', color: '#1e40af', fontSize: '0.875rem', textAlign: 'center' }}>
            {progress} {jobId && <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>Job: {jobId.slice(0, 16)}...</span>}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            background: error.code === 'NO_API_KEY' ? '#fff7ed' : '#fef2f2',
            border: `1px solid ${error.code === 'NO_API_KEY' ? '#fdba74' : '#fecaca'}`,
          }}>
            <p style={{ fontWeight: 600, color: error.code === 'NO_API_KEY' ? '#9a3412' : '#991b1b', marginBottom: '0.5rem' }}>
              {error.code === 'NO_API_KEY' ? '⚠️ AI Not Configured' : '❌ Error'}
            </p>
            <p style={{ color: error.code === 'NO_API_KEY' ? '#7c2d12' : '#7f1d1d', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {error.message}
            </p>
            {error.code === 'NO_API_KEY' && error.setupUrl && (
              <a
                href={error.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: '#ea580c',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Get Free Gemini API Key →
              </a>
            )}
            {error.code === 'NO_API_KEY' && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9a3412' }}>
                After getting the key, add it to <code style={{ background: '#fed7aa', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>.env.local</code> as <code style={{ background: '#fed7aa', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>GEMINI_API_KEY=your-key</code> and restart the server.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return url.length > 10 && !url.includes('your-project');
}
