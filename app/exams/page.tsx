import { FundzaBadge, FundzaCard } from '@/components/Phase14Primitives';
import ExamCountdown from '@/components/ExamCountdown';
import ExamsBrowser from '@/components/ExamsBrowser';

export default function ExamsPage() {
  return (
    <main className="fd-learning-page">
      <header className="fd-page-hero">
        <div className="fd-page-hero-copy">
          <p className="fd-kicker">EXAM ARENA</p>
          <h1 className="fd-page-title">Past papers, without the paperwork chaos.</h1>
          <p className="fd-page-subtitle">Choose an enrolled subject, then prepare, practise, take a timed paper or review an attempt. Fundza keeps the workflow in one place.</p>
        </div>
        <FundzaBadge tone="brand">NSC · Past Papers</FundzaBadge>
      </header>

      <div className="fd-learning-stack">
        <ExamCountdown />
        <ExamsBrowser />
        <FundzaCard className="fd-panel fd-dark-hero">
          <p className="fd-kicker">SOURCE OF TRUTH</p>
          <h2>Official Department of Basic Education papers</h2>
          <p>Fundza keeps source and verification metadata with the paper. For the master archive, use the DBE catalogue.</p>
          <a className="fd-button fd-button-secondary" href="https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx" target="_blank" rel="noreferrer" style={{ marginTop: '1rem' }}>Open DBE archive ↗</a>
        </FundzaCard>
      </div>
    </main>
  );
}
