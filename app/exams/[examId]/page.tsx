import Link from 'next/link';
import ExamRunner from '@/components/ExamRunner';

export default async function ExamPaperPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return (
    <main className="container">
      <div style={{ marginBottom: '1rem' }}><Link href="/exams" style={{ color: '#64748b', textDecoration: 'none' }}>← Back to exams</Link></div>
      <ExamRunner key={examId} />
    </main>
  );
}
