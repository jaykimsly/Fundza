'use client';

import Link from 'next/link';
import { mathLitTopics } from '@/data/subjects';
import TopicCard from '@/components/TopicCard';

export default function StudyPage() {
  const paper1 = mathLitTopics.filter(t => t.paper === 'Paper 1');
  const paper2 = mathLitTopics.filter(t => t.paper === 'Paper 2');

  return (
    <main className="container">
      <h1>Mathematical Literacy</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Target: Level 7 (80%+) — accepted for BA admission at UJ, UP & Wits
      </p>
      
      <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <strong style={{ color: '#1e40af' }}>🎓 BA Pathway Note</strong>
        <p style={{ color: '#334155', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Mathematical Literacy is <strong>accepted</strong> for Bachelor of Arts at all major universities. 
          Your target is 80%+ (Level 7) to maximise your APS score. Focus on weak topics below.
        </p>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2>Paper 1 — Finance & Data Handling</h2>
        <div className="grid grid-2">
          {paper1.map(topic => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2>Paper 2 — Measurement, Maps & Plans</h2>
        <div className="grid grid-2">
          {paper2.map(topic => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/quiz" className="btn">Start Diagnostic Quiz</Link>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/exams">Exams</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </main>
  );
}
