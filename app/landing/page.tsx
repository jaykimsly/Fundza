import Link from 'next/link';
import PhotoIdentityCard from '@/components/identity/PhotoIdentityCard';
import SectionHeader from '@/components/ui/SectionHeader';

const templates = [
  { name: 'ZENITH', subtitle: 'Focus · Discipline · Freedom', tone: 'light' as const, fallbackLabel: 'Z' },
  { name: 'NOVA', subtitle: 'Focus · Discipline · Freedom', tone: 'dark' as const, fallbackLabel: 'N' },
];

export default function LandingPage() {
  return (
    <main id="main-content" className="fd-landing">
      <section className="fd-landing-hero">
        <div className="fd-landing-copy">
          <p className="fd-landing-kicker">FUNDZA V2 · YOUR STUDY JOURNEY</p>
          <h1>Build the version of yourself you are studying for.</h1>
          <p className="fd-landing-lede">A focused study space for South African learners. Track your habits, practise deliberately, understand your progress, and turn consistency into results.</p>
          <div className="fd-landing-actions"><Link className="fd-landing-primary" href="/login">Enter Fundza</Link><a className="fd-landing-secondary" href="#identity">Personalise your space</a></div>
        </div>
        <div className="fd-landing-orbit" aria-hidden="true"><div className="fd-landing-orbit-ring" /><div className="fd-landing-core">F</div><span className="fd-orbit-label fd-orbit-label-one">DISCIPLINE</span><span className="fd-orbit-label fd-orbit-label-two">CONSISTENCY</span><span className="fd-orbit-label fd-orbit-label-three">PROGRESS</span></div>
      </section>

      <section id="identity" className="fd-landing-section">
        <SectionHeader eyebrow="MAKE IT YOURS" title="Your two-photo identity." description="Fundza starts with the template aesthetic below. Upload two photos when you are ready and your personal images become the visual foundation of your space." />
        <div className="fd-photo-grid">{templates.map((template, index) => <PhotoIdentityCard key={template.name} slot={index + 1} {...template} />)}</div>
      </section>

      <section className="fd-landing-showcase" aria-label="Fundza experience">
        <div className="fd-showcase-card"><span className="fd-showcase-number">01</span><h3>Focus</h3><p>One clear priority instead of a dashboard screaming twelve unrelated things at you.</p></div>
        <div className="fd-showcase-card fd-showcase-card-featured"><span className="fd-showcase-number">02</span><h3>Discipline</h3><p>Turn study sessions, habits and practice into a visible streak of actual progress.</p></div>
        <div className="fd-showcase-card"><span className="fd-showcase-number">03</span><h3>Freedom</h3><p>Build the academic options that give your future self more room to choose.</p></div>
      </section>

      <section className="fd-landing-bottom"><div><p className="fd-landing-kicker">THE GRIND LOOKS LONELY</p><h2>Before it looks legendary.</h2></div><Link className="fd-landing-primary" href="/login">Start building</Link></section>
    </main>
  );
}
