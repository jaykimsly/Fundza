import Link from 'next/link';
import ExamCountdown from '@/components/ExamCountdown';
import ExamsBrowser from '@/components/ExamsBrowser';
import AppIcon from '@/components/AppIcon';
import { FundzaBadge, FundzaButton, FundzaCard } from '@/components/Phase14Primitives';

export default function ExamsPage() {
  return (
    <main className="fd-shell-content fd-dashboard">
      <header className="fd-dashboard-head">
        <div>
          <p className="fd-dashboard-kicker">Prepare · practise · perform</p>
          <h1 className="fd-dashboard-title">Exam centre</h1>
          <p className="fd-dashboard-subtitle">Choose a subject and historical paper, then take it, prepare with guidance, practise selected questions, or review attempts.</p>
        </div>
        <div className="fd-dashboard-actions">
          <FundzaButton href="/progress" variant="secondary"><AppIcon name="progress" size={16} /> Progress</FundzaButton>
          <FundzaButton href="/study" variant="ghost"><AppIcon name="book" size={16} /> Study</FundzaButton>
        </div>
      </header>

      <div className="fd-dashboard-grid">
        <div className="fd-dashboard-grid-main">
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Exam schedule</p><h2 className="fd-section-title">What&apos;s coming up?</h2></div><FundzaBadge tone="brand">Past papers</FundzaBadge></div>
            <ExamCountdown />
          </FundzaCard>
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Question bank</p><h2 className="fd-section-title">Choose an exam</h2></div></div>
            <ExamsBrowser />
          </FundzaCard>
        </div>

        <aside className="fd-dashboard-side">
          <FundzaCard className="fd-dashboard-section">
            <div className="fd-dashboard-section-head"><div><p className="fd-section-label">Official source</p><h2 className="fd-section-title">DBE past papers</h2></div></div>
            <p className="fd-dashboard-subtitle">Fundza stores source metadata and verified marking references. Historical papers are sourced from the Department of Basic Education NSC paper catalogue.</p>
            <div className="fd-dashboard-cta-row"><Link className="fd-button fd-button-secondary" href="https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx" target="_blank" rel="noreferrer">Open DBE catalogue</Link></div>
          </FundzaCard>
        </aside>
      </div>
    </main>
  );
}
