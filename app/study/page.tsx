'use client';

import { useState } from 'react';
import Link from 'next/link';
import AiQuizGenerator from '@/components/AiQuizGenerator';

export default function StudyPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const weakTopics = [
    'Probability', 'Maps & Plans', 'Compound Interest', 
    'Surface Area', 'Blueprints', 'Floor Plans'
  ];

  return (
    <main className="container">
      <h1>Study Hub</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Practice with AI-generated questions tailored to your weak areas.
      </p>

      <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <strong style={{ color: '#1e40af' }}>Tip</strong>
        <p style={{ color: '#334155', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Upload your latest report on the <Link href="/upload" style={{ color: '#2563eb', fontWeight: 600 }}>Analyze page</Link> to get AI-recommended topics.
        </p>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2>AI-Powered Practice</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Select a topic to generate a custom quiz:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {weakTopics.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
            >
              {t}
            </button>
          ))}
        </div>
        {selectedTopic && (
          <AiQuizGenerator topic={selectedTopic} subject="Mathematical Literacy" studentLevel={40} />
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/quiz" className="btn">Start General Quiz</Link>
        <Link href="/upload" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>📄 Upload Report</Link>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/exams">Exams</Link>
        <Link href="/progress">Progress</Link>
        <Link href="/upload">Analyze</Link>
      </nav>
    </main>
  );
}
