import Link from 'next/link';

export default function EnglishPage() {
  return (
    <main className="container">
      <h1>English FAL</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Current: 63% (Level 5) → Target: 70% (Level 6)</p>

      <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
        <strong style={{ color: '#991b1b' }}>⚠️ BA Requirement</strong>
        <p style={{ color: '#7f1d1d', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          All BA programmes require <strong>English Level 5 (60%+)</strong> minimum. You are currently at 63% — 
          you meet the minimum but it is tight. Push to 65%+ for safety, 70%+ for a stronger application.
        </p>
      </div>

      <div className="card">
        <h2>Language Practice</h2>
        <ul style={{ paddingLeft: '1.25rem', color: '#334155', lineHeight: 1.8, marginTop: '0.5rem' }}>
          <li>Comprehension skills — practice past paper Section A</li>
          <li>Summary writing — 150 words, own words</li>
          <li>Language structures — tenses, reported speech, active/passive</li>
          <li>Essay planning — narrative / descriptive / argumentative</li>
          <li>Literature — revise prescribed poems and short stories</li>
        </ul>
      </div>

      <div className="card">
        <h2>This Week&apos;s Focus</h2>
        <p style={{ color: '#475569' }}>
          Complete one past paper (2019–2023) under timed conditions. Mark yourself strictly using the memorandum.
          Target: push from 63% to 68% on your next assessment.
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
