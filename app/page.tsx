'use client';

import Link from 'next/link';
import { subjects, calculateApsStandard, calculateApsStandardTarget, calculateApsWits, getLevel } from '@/data/subjects';
import SubjectCard from '@/components/SubjectCard';
import ExamCountdown from '@/components/ExamCountdown';
import ProgressBar from '@/components/ProgressBar';

export default function Dashboard() {
  const sortedSubjects = [...subjects].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const currentAps = calculateApsStandard(subjects);
  const targetAps = calculateApsStandardTarget(subjects);
  const currentWits = calculateApsWits(subjects);

  const english = subjects.find(s => s.code === 'ENG')!;
  const englishLevel = getLevel(english.currentPercentage);
  const englishTargetLevel = getLevel(english.targetPercentage);

  return (
    <main className="container">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>XOLISILE'S STUDY HUB</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Goal: <strong>Bachelor of Arts (BA) — 2027</strong>
      </p>

      {/* APS Scorecard */}
      <div className="card" style={{ background: '#0f172a', color: 'white' }}>
        <h2 style={{ color: '#fbbf24', marginBottom: '0.75rem' }}>📊 Admission Points Score (APS)</h2>
        
        <div className="grid grid-2">
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UJ / UP Scale (6 subjects)</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{currentAps}</span>
              <span style={{ color: '#94a3b8' }}>/ {targetAps} target</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              {currentAps >= 28 ? (
                <span style={{ color: '#059669', fontSize: '0.875rem', fontWeight: 600 }}>✓ Clears UP & UJ minimum</span>
              ) : currentAps >= 27 ? (
                <span style={{ color: '#ca8a04', fontSize: '0.875rem', fontWeight: 600 }}>⚠ Meets UJ (27), 1 point short of UP (28)</span>
              ) : (
                <span style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>✗ Below minimum — push harder</span>
              )}
            </div>
          </div>

          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wits Scale (7 subjects incl. LO)</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{currentWits}</span>
              <span style={{ color: '#94a3b8' }}>/ 56 max</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              {currentWits >= 36 ? (
                <span style={{ color: '#059669', fontSize: '0.875rem', fontWeight: 600 }}>✓ Clears Wits BA minimum</span>
              ) : currentWits >= 30 ? (
                <span style={{ color: '#ca8a04', fontSize: '0.875rem', fontWeight: 600 }}>⏳ Waitlist zone (30–35)</span>
              ) : (
                <span style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>✗ Below Wits minimum (36)</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
            <strong>English FAL:</strong> Level {englishLevel} ({english.currentPercentage}%) 
            {englishLevel >= 5 ? ' — ✓ Meets BA requirement' : ' — Needs Level 5 (60%+)'}
          </p>
          <ProgressBar current={english.currentPercentage} target={english.targetPercentage} color="#0891b2" />
        </div>
      </div>

      {/* BA Requirements Info */}
      <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <h2 style={{ color: '#1e40af', fontSize: '1.1rem' }}>🎓 BA Admission Requirements 2026</h2>
        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.7 }}>
          <p><strong>UJ BA:</strong> APS 27 • English Level 5 (60%+) • Maths Lit accepted</p>
          <p><strong>UP BA:</strong> APS 28 • English Level 5 (60%+) • Maths Lit accepted</p>
          <p><strong>Wits BA:</strong> APS 36+ • English Level 5 (60%+) • Maths Lit accepted • LO included in APS</p>
          <p style={{ marginTop: '0.5rem', color: '#1d4ed8', fontWeight: 500 }}>
            Mathematical Literacy is fully accepted for BA. No subject change needed.
          </p>
        </div>
      </div>

      {/* English Warning if needed */}
      {englishLevel < 5 && (
        <div className="warning-box">
          <strong>⚠️ English Requirement Alert</strong>
          <p style={{ marginTop: '0.4rem' }}>
            BA programmes require <strong>English Level 5 (60%+)</strong>. Your current mark is {english.currentPercentage}% (Level {englishLevel}). 
            Push English to at least 65% to be safe.
          </p>
        </div>
      )}

      <ExamCountdown />

      <div className="card">
        <h2>Today's Study Plan</h2>
        <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Priority: Mathematical Literacy & Life Orientation (both need +40 points) → English consolidation
        </p>
        <Link href="/study" className="btn">Start Maths Lit Study</Link>
      </div>

      <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Subjects</h2>
      <div className="grid grid-2">
        {sortedSubjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>

      <nav className="nav">
        <Link href="/study">Study</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/exams">Exams</Link>
        <Link href="/progress">Progress</Link>
        <Link href="/english">English</Link>
      </nav>
    </main>
  );
}
