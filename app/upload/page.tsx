'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentUploader from '@/components/DocumentUploader';
import AnalysisResults from '@/components/AnalysisResults';
import Link from 'next/link';

export default function UploadPage() {
  const [studentId, setStudentId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [extractedSubjects, setExtractedSubjects] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem('fundza_student_id');
    if (!id) {
      router.push('/setup');
      return;
    }
    setStudentId(id);
  }, [router]);

  return (
    <main className="container">
      <h1>📄 Document Analyzer</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Snap a photo of your report or upload a file. Our AI reads the marks automatically.
      </p>

      {studentId && (
        <DocumentUploader
          studentId={studentId}
          onAnalysisComplete={(analysisData, subjects) => {
            setAnalysis(analysisData);
            if (subjects) setExtractedSubjects(subjects);
          }}
        />
      )}

      <AnalysisResults analysis={analysis} studentId={studentId} />

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
