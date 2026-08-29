'use client';

import { useState } from 'react';
import { Question } from '@/types';
import QuestionComponent from './Question';
import StatusScreen from './StatusScreen';
import Link from 'next/link';

interface Props { topic: string; subject: string; studentLevel?: number; }

export default function AiQuizGenerator({ topic, subject, studentLevel = 50 }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setSupportError(null);
    try {
      if (!navigator.onLine) throw new Error('You are offline. Connect to the internet and try again.');
      const res = await fetch('/api/generate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, subject, studentLevel }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const code = data.code || (res.status === 503 ? 'SERVICE_UNAVAILABLE' : 'MODEL_ERROR');
        const messages: Record<string, string> = {
          NO_API_KEY: 'Study Support is not configured yet. This is a Fundza setup problem, not a problem with your question.',
          SERVICE_UNAVAILABLE: 'Study Support is temporarily unavailable. Your study data is safe. Try again later.',
          MODEL_ERROR: 'Study Support could not create reliable practice this time. Try again or choose a simpler topic.',
          INVALID_REQUEST: 'Some practice information is missing. Go back, choose a subject and topic, then try again.',
        };
        throw new Error(messages[code] || data.error || 'Study Support could not complete the request.');
      }
      if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('Study Support returned no practice questions. Try the topic again.');
      const formatted: Question[] = data.questions.map((q: any, i: number) => ({ id: `ai-${i}`, topicId: 'ai-generated', questionText: q.question_text, options: q.options, correctAnswer: q.correct_answer, explanation: q.explanation, steps: q.steps || [], difficulty: q.difficulty }));
      setQuestions(formatted); setCurrentIndex(0); setScore(0); setShowResults(false); setSelectedAnswer(null); setSubmitted(false);
    } catch (err: any) {
      setSupportError(err?.message || 'Study Support could not complete the request.');
    } finally { setLoading(false); }
  };

  const handleSubmit = () => { if (!selectedAnswer) return; setSubmitted(true); if (selectedAnswer === questions[currentIndex].correctAnswer) setScore(s => s + 1); };
  const handleNext = () => { if (currentIndex < questions.length - 1) { setCurrentIndex(i => i + 1); setSelectedAnswer(null); setSubmitted(false); } else setShowResults(true); };

  if (supportError) return <StatusScreen kind="ai" code="SUPPORT" message={supportError} onRetry={generate} />;

  if (questions.length === 0) return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3>Practice: {topic}</h3>
      <p style={{ color: '#64748b', margin: '1rem 0' }}>Create 5 practice questions about <strong>{topic}</strong>, adjusted for your level.</p>
      <button onClick={generate} className="btn" disabled={loading}>{loading ? 'Creating your practice...' : 'Create Practice'}</button>
      {loading && <p style={{ color: '#64748b', marginTop: '.75rem', fontSize: '.85rem' }}>Preparing your practice questions. Please do not close the page.</p>}
    </div>
  );

  if (showResults) { const pct = Math.round((score / questions.length) * 100); return <div className="card"><h3>Practice Complete</h3><div style={{ textAlign: 'center', padding: '1.5rem 0' }}><div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{pct}%</div><p style={{ color: '#64748b' }}>{score} / {questions.length} correct</p></div><button onClick={generate} className="btn">Create New Practice</button><Link href="/study" className="btn btn-secondary" style={{ marginLeft: '.5rem' }}>Back to Study</Link></div>; }

  const q = questions[currentIndex];
  return <div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3>Practice: {topic}</h3><span style={{ color: '#64748b', fontSize: '.875rem' }}>Q{currentIndex + 1}/{questions.length}</span></div><div className="card"><QuestionComponent question={q} selectedAnswer={selectedAnswer} submitted={submitted} onSelect={setSelectedAnswer} />{!submitted ? <button onClick={handleSubmit} className="btn" disabled={!selectedAnswer}>Submit</button> : <div><div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: selectedAnswer === q.correctAnswer ? '#ecfdf5' : '#fef2f2', color: selectedAnswer === q.correctAnswer ? '#166534' : '#991b1b', fontWeight: 600 }}>{selectedAnswer === q.correctAnswer ? 'Correct!' : 'Not quite'}</div><div className="explanation"><strong>Explanation:</strong><p style={{ marginTop: '.5rem' }}>{q.explanation}</p><ol className="steps">{q.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div><button onClick={handleNext} className="btn">{currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}</button></div>}</div></div>;
}
