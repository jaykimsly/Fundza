import Link from 'next/link';
import ExamCountdown from '@/components/ExamCountdown';

export default function ExamsPage() {
  return (
    <main className="container">
      <h1>My Exams</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Your timetable is personalised from the Grade 12 preparatory examination schedule and the subjects in your Fundza profile.
      </p>

      <ExamCountdown />

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>How the countdown works</h2>
        <p style={{ color: '#64748b', lineHeight: 1.7 }}>
          Fundza only shows upcoming papers for subjects you selected in your student record. Each paper uses the timetable date, session time and duration supplied by the examination schedule.
        </p>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
