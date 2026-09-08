'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type Question = { id: string; question_text: string; question_type: string | null; difficulty: string | null; marks: number | null; question_order: number | null; source_question_number: string | null; options: any };
type Attempt = { id: string; mode: string; status: string; started_at: string; submitted_at?: string; percentage?: number; score_marks?: number; total_marks?: number };

const modes = new Set(['take', 'prep', 'practice', 'review']);

export default function ExamRunner() {
  const params = useParams<{ examId: string }>();
  const search = useSearchParams();
  const requestedMode = search.get('mode') || 'take';
  const mode = modes.has(requestedMode) ? requestedMode : 'take';
  const [paper, setPaper] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, any>>({});
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [paperRes, questionsRes] = await Promise.all([
          fetch(`/api/exams/${params.examId}`, { cache: 'no-store' }),
          fetch(`/api/exams/${params.examId}/questions`, { cache: 'no-store' }),
        ]);
        const paperData = await paperRes.json();
        const questionData = await questionsRes.json();
        if (!paperRes.ok) throw new Error(paperData.error || 'Unable to load paper');
        if (!questionsRes.ok) throw new Error(questionData.error || 'Unable to load questions');
        setPaper(paperData.paper);
        setAttempts(paperData.attempts || []);
        setQuestions(questionData.questions || []);
        if (mode !== 'review') {
          const attemptRes = await fetch('/api/exam-attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paperId: params.examId, mode }) });
          const attemptData = await attemptRes.json();
          if (!attemptRes.ok) throw new Error(attemptData.error || 'Unable to start attempt');
          setAttempt(attemptData.attempt);
        }
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
    };
    load();
  }, [params.examId, mode]);

  useEffect(() => {
    if (!attempt || mode !== 'take' || !paper?.duration_minutes || attempt.status !== 'in_progress') return;
    const duration = Number(paper.duration_minutes) * 60;
    const started = new Date(attempt.started_at).getTime();
    const tick = () => setSecondsLeft(Math.max(0, duration - Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt, mode, paper]);

  const current = questions[index];
  const answer = current ? answers[current.id] || '' : '';
  const canGoBack = index > 0;
  const canGoNext = index < questions.length - 1;

  const formattedTime = useMemo(() => {
    if (secondsLeft === null) return '';
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [secondsLeft]);

  async function saveAnswer(questionId: string) {
    const value = answers[questionId];
    if (!attempt || !value.trim()) return;
    setBusy(true); setError('');
    try {
      const question = questions.find((q) => q.id === questionId);
      const isChoice = Array.isArray(question?.options) && question.options.length > 0;
      const res = await fetch(`/api/exam-attempts/${attempt.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, ...(isChoice ? { selectedOption: value } : { responseText: value }) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save answer');
      setFeedback((prev) => ({ ...prev, [questionId]: data.answer }));
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!attempt) return;
    setBusy(true); setError('');
    try {
      for (const question of questions) await saveAnswer(question.id);
      const res = await fetch(`/api/exam-attempts/${attempt.id}/submit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to submit');
      setAttempt(data.attempt);
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function explain() {
    if (!attempt || !current || !answer) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/exam-attempts/${attempt.id}/explain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: current.id, learnerAnswer: answer }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to explain answer');
      setExplanations((prev) => ({ ...prev, [current.id]: data.explanation }));
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="card">Loading paper…</div>;
  if (error && !paper) return <div className="card" role="alert">{error}</div>;
  if (!paper) return null;

  if (mode === 'review') {
    return <section className="card"><h1>{paper.subjects_catalog?.name} · {paper.year}</h1><p style={{ color: '#64748b' }}>Completed attempts for this paper.</p>{attempts.length === 0 ? <p>No completed attempts yet.</p> : attempts.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}><span>{item.mode} · {new Date(item.started_at).toLocaleString()}</span><strong>{item.status === 'submitted' ? `${item.percentage ?? 0}%` : 'In progress'}</strong></div>)}</section>;
  }

  if (attempt?.status === 'submitted') {
    return <section className="card"><h1>Exam complete</h1><p style={{ fontSize: '2rem', fontWeight: 800 }}>{attempt.percentage ?? 0}%</p><p>{attempt.score_marks ?? 0} / {attempt.total_marks ?? 0} marks</p><p style={{ color: '#64748b' }}>Your score was calculated from the stored marking reference for this paper.</p></section>;
  }

  if (!current) return <section className="card"><h1>No extracted questions yet</h1><p style={{ color: '#64748b' }}>The paper is catalogued, but its question set has not been ingested.</p></section>;

  const choices = Array.isArray(current.options) ? current.options : [];
  return (
    <section>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div><strong>{paper.subjects_catalog?.name} · {paper.year}</strong><div style={{ color: '#64748b', fontSize: '0.85rem' }}>{mode === 'take' ? 'Exam conditions' : mode === 'prep' ? 'Guided preparation' : 'Practice'} · Question {index + 1} of {questions.length}</div></div>
          {mode === 'take' && secondsLeft !== null && <strong aria-label="Time remaining">{formattedTime}</strong>}
        </div>
      </div>
      <article className="card">
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{current.source_question_number ? `Question ${current.source_question_number}` : `Question ${index + 1}`} · {current.marks ?? 0} marks</p>
        <h1 style={{ fontSize: '1.35rem', lineHeight: 1.45 }}>{current.question_text}</h1>
        {choices.length ? <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>{choices.map((choice: any) => { const label = choice.label ?? ''; const text = choice.text ?? choice.option_text ?? ''; return <button key={label + text} type="button" className="button" style={{ textAlign: 'left' }} onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: label }))} aria-pressed={answer === label}>{label}. {text}</button>; })}</div> : <textarea value={answer} onChange={(event) => setAnswers((prev) => ({ ...prev, [current.id]: event.target.value }))} rows={7} placeholder="Write your answer here…" style={{ width: '100%', marginTop: '1rem', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.8rem', font: 'inherit' }} />}
        {feedback[current.id] && mode !== 'take' && <div style={{ marginTop: '1rem', padding: '0.9rem', borderRadius: 10, background: '#f8fafc' }}><strong>{feedback[current.id].is_correct ? 'Correct' : 'Check your answer'}</strong><p>{feedback[current.id].feedback}</p><button className="button" type="button" onClick={explain} disabled={busy}>Explain this answer</button>{explanations[current.id] && <div style={{ marginTop: '0.8rem' }}><p>{explanations[current.id].explanation}</p><ol>{(explanations[current.id].steps || []).map((step: string) => <li key={step}>{step}</li>)}</ol><p><strong>Next tip:</strong> {explanations[current.id].next_tip}</p></div>}</div>}
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'space-between', marginTop: '1.2rem', flexWrap: 'wrap' }}>
          <button className="button" type="button" disabled={!canGoBack || busy} onClick={() => setIndex((value) => value - 1)}>Previous</button>
          <button className="button" type="button" disabled={!answer.trim() || busy} onClick={async () => { await saveAnswer(current.id); if (canGoNext) setIndex((value) => value + 1); }}>Save & next</button>
          {!canGoNext && <button className="button" type="button" disabled={busy} onClick={submit}>Submit paper</button>}
        </div>
      </article>
    </section>
  );
}
