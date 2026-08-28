'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props { studentId: string; onAnalysisComplete: (analysis: any, extractedSubjects?: any[]) => void; }
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REPORT_BUCKET = 'report-documents';
const ALLOWED_MIME_TYPES = new Set(['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']);
const ACTIVE = new Set(['queued','processing','extracting','validating','retrying']);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'report'; }

export default function DocumentUploader({ studentId, onAnalysisComplete }: Props) {
  const [term, setTerm] = useState('Term 3');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const handledJobs = useRef(new Set<string>());
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyJob = useCallback((job: any) => {
    if (!job) return;
    setJobId(job.id); setJobStatus(job.status);
    if (job.status === 'queued') { setUploading(true); setProgress('Report queued. The AI reader will start it in the background.'); }
    if (job.status === 'processing' || job.status === 'extracting' || job.status === 'validating') { setUploading(true); setProgress('AI is reading your report in the background...'); }
    if (job.status === 'retrying') { setUploading(true); setProgress('The AI service is busy. Your report is being retried automatically...'); }
    if (job.status === 'completed' && !handledJobs.current.has(job.id)) {
      handledJobs.current.add(job.id); setUploading(false); setProgress('✓ Analysis complete!');
      if (job.result) onAnalysisComplete(job.result, job.result.subjects);
    }
    if (job.status === 'failed') {
      setUploading(false); setProgress(''); setError({ code: job.error_code || 'ANALYSIS_FAILED', message: job.error_message || 'The report could not be analysed.' });
    }
  }, [onAnalysisComplete]);

  useEffect(() => {
    let alive = true;
    const recover = async () => {
      const { data, error: recoveryError } = await supabase.from('analysis_jobs')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['queued','processing','extracting','validating','retrying','completed'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (recoveryError) console.error('Analysis job recovery failed:', recoveryError);
      if (alive && data?.[0]) applyJob(data[0]);
    };
    void recover();
    const channel = supabase.channel(`analysis-jobs-${studentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'analysis_jobs', filter: `student_id=eq.${studentId}` }, payload => applyJob(payload.new))
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [studentId, applyJob]);

  const handleFile = useCallback((file: File) => {
    setError(null); setProgress('');
    if (file.size > MAX_FILE_SIZE) { setSelectedFile(null); setFileName(''); setError({ code:'FILE_TOO_LARGE', message:'File too large. Maximum is 10MB.' }); return; }
    if (!ALLOWED_MIME_TYPES.has(file.type)) { setSelectedFile(null); setFileName(''); setError({ code:'UNSUPPORTED_TYPE', message:'Please upload a PDF or image (JPG, PNG, WEBP, HEIC, or HEIF).' }); return; }
    setSelectedFile(file); setFileName(file.name); setTextContent('');
  }, []);

  const uploadToStorage = async (file: File, userId: string) => {
    const path = `${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase.storage.from(REPORT_BUCKET).upload(path, file, { cacheControl:'3600', contentType:file.type, upsert:false });
      if (!error) return path;
      lastError = error; if (attempt < 3) await sleep(500 * attempt);
    }
    throw lastError || new Error('Storage upload failed');
  };

  const analyze = async () => {
    setError(null);
    if (!selectedFile && !textContent.trim()) { setError({ code:'NO_CONTENT', message:'Please upload a report, take a photo, or paste report text.' }); return; }
    setUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setUploading(false); setError({ code:'AUTH_REQUIRED', message:'Your session has expired. Please sign in again.' }); return; }
      let storagePath: string | null = null;
      if (selectedFile) { setProgress('Uploading your report securely...'); storagePath = await uploadToStorage(selectedFile, user.id); }
      else setProgress('Queueing your report text...');
      const res = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ storagePath, mimeType:selectedFile?.type || null, fileName:selectedFile?.name || 'pasted-text', content:selectedFile ? undefined : textContent, term, mode:selectedFile ? 'file' : 'text', studentId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) { setUploading(false); setError({ code:data?.code || 'API_ERROR', message:data?.error || 'The report could not be queued for analysis.' }); return; }
      if (!data?.job?.id) { setUploading(false); setError({ code:'JOB_ID_MISSING', message:'The report was received but no background job was created.' }); return; }
      applyJob(data.job);
    } catch (err) { console.error('Report queue error:', err); setUploading(false); setError({ code:'NETWORK_ERROR', message:'The report could not be uploaded. Check your connection and try again.' }); }
  };

  const clear = () => { setFileName(''); setSelectedFile(null); setTextContent(''); setProgress(''); setError(null); setJobId(null); setJobStatus(null); if (cameraRef.current) cameraRef.current.value=''; if (fileRef.current) fileRef.current.value=''; };
  const busy = uploading || ACTIVE.has(jobStatus || '');

  return <div>
    <div className="card"><h3>Which term is this report for?</h3><div style={{display:'flex',gap:'0.5rem',marginTop:'0.75rem',flexWrap:'wrap'}}>{['Term 1','Term 2','Term 3','Term 4','Final Exam'].map(t=><button key={t} onClick={()=>setTerm(t)} disabled={busy} style={{padding:'0.5rem 1rem',borderRadius:'999px',border:'1px solid #e2e8f0',background:term===t?'#2563eb':'white',color:term===t?'white':'#475569',fontSize:'0.875rem',fontWeight:500}}>{t}</button>)}</div></div>
    <div className="card"><h3>Upload Report or Test</h3><p style={{color:'#64748b',fontSize:'0.875rem',marginBottom:'1rem'}}>Take a photo, choose a PDF/image, or paste report text. Maximum file size: 10MB.</p>
      <div style={{display:'flex',gap:'0.75rem',marginBottom:'1rem',flexWrap:'wrap'}}><button onClick={()=>cameraRef.current?.click()} disabled={busy} style={{flex:1,padding:'0.875rem',background:'#0f172a',color:'white',border:'none',borderRadius:'8px'}}>Take Photo</button><input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} style={{display:'none'}}/><button onClick={()=>fileRef.current?.click()} disabled={busy} style={{flex:1,padding:'0.875rem',background:'white',color:'#0f172a',border:'1px solid #e2e8f0',borderRadius:'8px'}}>Choose File</button><input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} style={{display:'none'}}/></div>
      <label style={{fontSize:'0.8rem',color:'#64748b',fontWeight:500}}>Or paste report text:</label><textarea value={textContent} onChange={e=>{setSelectedFile(null);setFileName('');setTextContent(e.target.value)}} placeholder="Copy and paste your report text here..." rows={4} disabled={busy} style={{width:'100%',padding:'0.75rem',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'0.9375rem',marginTop:'0.375rem',resize:'vertical'}}/>
      {fileName&&<div style={{marginTop:'0.75rem',padding:'0.75rem',background:'#f8fafc',borderRadius:'8px',fontSize:'0.875rem',display:'flex',justifyContent:'space-between'}}><span>{fileName} ({term})</span><button onClick={clear} disabled={busy} style={{background:'none',border:'none',color:'#dc2626'}}>Remove</button></div>}
      <button onClick={analyze} disabled={busy||(!selectedFile&&!textContent.trim())} className="btn" style={{width:'100%',marginTop:'1rem',opacity:busy||(!selectedFile&&!textContent.trim())?0.6:1}}>{busy?'Analysis running in background...':'Analyze My Report'}</button>
      {progress&&<div style={{marginTop:'0.75rem',padding:'0.75rem',background:'#eff6ff',borderRadius:'8px',color:'#1e40af',fontSize:'0.875rem',textAlign:'center'}}>{progress}{jobId&&<div style={{fontSize:'0.75rem',marginTop:'0.35rem',opacity:0.75}}>Job {jobId.slice(0,8)} · {jobStatus}</div>}</div>}
      {error&&<div style={{marginTop:'0.75rem',padding:'1rem',borderRadius:'8px',background:'#fef2f2',border:'1px solid #fecaca'}}><p style={{fontWeight:600,color:'#991b1b'}}>Report Upload Error</p><p style={{color:'#7f1d1d',fontSize:'0.875rem'}}>{error.message}</p></div>}
    </div>
  </div>;
}
