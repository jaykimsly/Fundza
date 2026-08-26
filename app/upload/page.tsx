'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentUploader from '@/components/DocumentUploader';
import AnalysisResults from '@/components/AnalysisResults';
import StatusScreen from '@/components/StatusScreen';
import { PageSkeleton } from '@/components/Skeleton';

export default function UploadPage() {
  const [studentId, setStudentId] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [routerReady, setRouterReady] = useState(false);
  const router = useRouter();

  useEffect(() => { const id=localStorage.getItem('fundza_student_id'); if(!id){router.push('/setup');return;} setStudentId(id);setRouterReady(true); },[router]);
  if(!routerReady)return <PageSkeleton />;

  return <main className="container"><h1>Document Analyzer</h1><p style={{color:'#64748b',marginBottom:'1.5rem'}}>Upload a report and Fundza can analyse the learner's results and turn them into useful study guidance.</p><DocumentUploader studentId={studentId} onAnalysisComplete={(analysisData)=>setAnalysis(analysisData)}/><AnalysisResults analysis={analysis} studentId={studentId}/></main>;
}
