'use client';

import Link from 'next/link';
import { subjects, mathLitTopics, calculateApsStandard, calculateApsWits, getLevel } from '@/data/subjects';
import ProgressBar from '@/components/ProgressBar';

export default function ProgressPage() {
  const weakTopics = mathLitTopics
    .filter(t => t.masteryLevel === 'not-mastered' || t.masteryLevel === 'developing')
    .sort((a, b) => a.masteryPercentage - b.masteryPercentage)
    .slice(0, 5);

  const currentAps = calculateApsStandard(subjects);
  const currentWits = calculateApsWits(subjects);

  return (
    <main className="container">
      <h1>Progress</h1>

      <div className="card" style={{ background: '#0f172a', color: 'white' }}>
        <h2 style={{ color: '#fbbf24' }}>APS Tracker</h2>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>UJ / UP (6 subjects)</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{currentAps} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ 42</span></p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Wits (7 subjects)</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{currentWits} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ 56</span></p>
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Bachelor's Pass</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#059669' }}>✓ Required</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Subject Breakdown & NSC Levels</h2>
        <div style={{ marginTop: '0.75rem' }}>
          {subjects.map(s => (
            <div key={s.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.625rem 0',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: s.color, 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  L{getLevel(s.currentPercentage)}
                </span>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{s.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600 }}>{s.currentPercentage}%</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>→ {s.targetPercentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
        <h2 style={{ color: '#9a3412' }}>Recommended Revision</h2>
        <p style={{ color: '#c2410c', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Focus on these weak Maths Lit topics first:
        </p>
        <ol style={{ paddingLeft: '1.25rem' }}>
          {weakTopics.map((topic) => (
            <li key={topic.id} style={{ marginBottom: '0.75rem', color: '#7c2d12' }}>
              <strong>{topic.name}</strong> — {topic.masteryPercentage}% mastered
              <span style={{ marginLeft: '0.5rem' }}>
                {topic.masteryLevel === 'not-mastered' ? '🔴' : '🟠'}
              </span>
            </li>
          ))}
        </ol>
        {weakTopics.length === 0 && <p style={{ color: '#059669' }}>All topics progressing well! 🎉</p>}
        <Link href="/study" className="btn" style={{ marginTop: '1rem' }}>Start Revision</Link>
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/exams">Exams</Link>
      </nav>
    </main>
  );
}
