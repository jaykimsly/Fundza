'use client';

import { useState } from 'react';
import Link from 'next/link';

const templates = [
  { id: 'zenith', name: 'ZENITH', subtitle: 'Focus · Discipline · Freedom', tone: 'light' },
  { id: 'nova', name: 'NOVA', subtitle: 'Focus · Discipline · Freedom', tone: 'dark' },
] as const;

export default function LandingPage() {
  const [photos, setPhotos] = useState<(string | null)[]>([null, null]);

  const selectPhoto = (index: number, file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPhotos((current) => {
      const next = [...current];
      if (next[index]) URL.revokeObjectURL(next[index]!);
      next[index] = url;
      return next;
    });
  };

  return (
    <main className="fd-landing">
      <section className="fd-landing-hero">
        <div className="fd-landing-copy">
          <p className="fd-landing-kicker">FUNDZA V2 · YOUR STUDY JOURNEY</p>
          <h1>Build the version of yourself you are studying for.</h1>
          <p className="fd-landing-lede">
            A focused study space for South African learners. Track your habits, practise deliberately,
            understand your progress, and turn consistency into results.
          </p>
          <div className="fd-landing-actions">
            <Link className="fd-landing-primary" href="/login">Enter Fundza</Link>
            <a className="fd-landing-secondary" href="#identity">Personalise your space</a>
          </div>
        </div>
        <div className="fd-landing-orbit" aria-hidden="true">
          <div className="fd-landing-orbit-ring" />
          <div className="fd-landing-core">F</div>
          <span className="fd-orbit-label fd-orbit-label-one">DISCIPLINE</span>
          <span className="fd-orbit-label fd-orbit-label-two">CONSISTENCY</span>
          <span className="fd-orbit-label fd-orbit-label-three">PROGRESS</span>
        </div>
      </section>

      <section id="identity" className="fd-landing-section">
        <div className="fd-section-intro">
          <p className="fd-landing-kicker">MAKE IT YOURS</p>
          <h2>Your two-photo identity.</h2>
          <p>
            Fundza starts with the template aesthetic below. Upload two photos when you are ready and your
            personal images become the visual foundation of your space.
          </p>
        </div>

        <div className="fd-photo-grid">
          {templates.map((template, index) => {
            const selected = photos[index];
            return (
              <article key={template.id} className={`fd-photo-card fd-photo-card-${template.tone}`}>
                <div className="fd-photo-art">
                  {selected ? <img src={selected} alt={`Your uploaded photo ${index + 1}`} /> : <div className="fd-template-character"><span>{template.id === 'zenith' ? 'Z' : 'N'}</span></div>}
                  <div className="fd-photo-vignette" />
                  <div className="fd-photo-title">{template.name}</div>
                  <div className="fd-photo-subtitle">{template.subtitle}</div>
                  {!selected && <span className="fd-template-badge">TEMPLATE</span>}
                </div>
                <label className="fd-upload-control">
                  <input type="file" accept="image/*" onChange={(event) => selectPhoto(index, event.target.files?.[0])} />
                  <span>{selected ? 'Replace photo' : `Upload photo ${index + 1}`}</span>
                </label>
              </article>
            );
          })}
        </div>
      </section>

      <section className="fd-landing-showcase" aria-label="Fundza experience">
        <div className="fd-showcase-card">
          <span className="fd-showcase-number">01</span>
          <h3>Focus</h3>
          <p>One clear priority instead of a dashboard screaming twelve unrelated things at you.</p>
        </div>
        <div className="fd-showcase-card fd-showcase-card-featured">
          <span className="fd-showcase-number">02</span>
          <h3>Discipline</h3>
          <p>Turn study sessions, habits and practice into a visible streak of actual progress.</p>
        </div>
        <div className="fd-showcase-card">
          <span className="fd-showcase-number">03</span>
          <h3>Freedom</h3>
          <p>Build the academic options that give your future self more room to choose.</p>
        </div>
      </section>

      <section className="fd-landing-bottom">
        <div>
          <p className="fd-landing-kicker">THE GRIND LOOKS LONELY</p>
          <h2>Before it looks legendary.</h2>
        </div>
        <Link className="fd-landing-primary" href="/login">Start building</Link>
      </section>
    </main>
  );
}
