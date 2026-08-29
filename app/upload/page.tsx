'use client';

import { useState, useEffect } from 'react';
import DocumentUploader from '@/components/DocumentUploader';
import AnalysisResults from '@/components/AnalysisResults';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
      <h1>📄 Review My Report</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Upload your report, take a photo, or paste the results so Fundza can help you review your marks and identify what to work on next.
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

      <nav className="nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/study">Study</Link>
        <Link href="/quiz">Practice</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
