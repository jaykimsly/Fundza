import Link from 'next/link';
import ExamCountdown from '@/components/ExamCountdown';

const examTimetable = [
  { date: '20 Oct 2026', subject: 'English FAL Paper 1', time: '09:00' },
  { date: '22 Oct 2026', subject: 'Mathematical Literacy Paper 1', time: '09:00' },
  { date: '24 Oct 2026', subject: 'Mathematical Literacy Paper 2', time: '09:00' },
  { date: '28 Oct 2026', subject: 'Economics Paper 1', time: '09:00' },
  { date: '30 Oct 2026', subject: 'Business Studies Paper 1', time: '09:00' },
  { date: '05 Nov 2026', subject: 'Tourism Paper 1', time: '09:00' },
  { date: '12 Nov 2026', subject: 'SiSwati HL Paper 1', time: '09:00' },
];

export default function ExamsPage() {
  return (
    <main className="container">
      <h1>Exams</h1>
      
      <ExamCountdown />

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Exam Timetable 2026</h2>
        <div style={{ marginTop: '1rem' }}>
          {examTimetable.map((exam, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.875rem',
              borderBottom: i < examTimetable.length - 1 ? '1px solid #e2e8f0' : 'none',
              background: i % 2 === 0 ? '#f8fafc' : 'white',
              borderRadius: '6px',
              marginBottom: '0.5rem'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{exam.subject}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{exam.date}</div>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>{exam.time}</div>
            </div>
          ))}
        </div>
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
