import Link from 'next/link';
import ExamCountdown from '@/components/ExamCountdown';
import ExamsBrowser from '@/components/ExamsBrowser';

export default function ExamsPage() {
  return (
    <main className="container">
      <header style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ marginTop: '0.6rem' }}>Past Exams</h1>
        <p style={{ color: '#64748b', maxWidth: 720 }}>
          Choose one of your enrolled subjects, pick a historical paper, then take it, prepare with guidance, practise selected questions, or review previous attempts.
        </p>
      </header>

      <ExamCountdown />
      <div style={{ marginTop: '1.5rem' }}><ExamsBrowser /></div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Official source</h2>
        <p style={{ color: '#64748b' }}>Fundza stores source metadata and verified marking references. Historical papers are sourced from the Department of Basic Education's NSC paper catalogue.</p>
        <a href="https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx" target="_blank" rel="noreferrer">View DBE past papers</a>
      </div>

      <nav className="nav" aria-label="Primary">
        <Link href="/">Dashboard</Link>
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
