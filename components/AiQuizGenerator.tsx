'use client';

import { useState } from 'react';
import { Question } from '@/types';
import QuestionComponent from './Question';
import Link from 'next/link';

interface Props {
  topic: string;
  subject: string;
  studentLevel?: number;
}

export default function AiQuizGenerator({ topic, subject, studentLevel = 50 }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, studentLevel }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const formatted: Question[] = data.questions.map((q: any, i: number) => ({
        id: `ai-${i}`,
        topicId: 'ai-generated',
        questionText: q.question_text,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        steps: q.steps || [],
        difficulty: q.difficulty,
      }));

      setQuestions(formatted);
      setCurrentIndex(0);
      setScore(0);
      setShowResults(false);
      setSelectedAnswer(null);
      setSubmitted(false);
    } catch (err: any) {
      alert('Failed to generate quiz: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setSubmitted(true);
    if (selectedAnswer === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
    } else {
      setShowResults(true);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h3>🤖 AI Quiz: {topic}</h3>
        <p style={{ color: '#64748b', margin: '1rem 0' }}>
          Generate a custom quiz on <strong>{topic}</strong> tailored to your level.
        </p>
        <button onClick={generate} className="btn" disabled={loading}>
          {loading ? 'Generating...' : 'Generate AI Quiz'}
        </button>
      </div>
    );
  }

  if (showResults) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="card">
        <h3>Quiz Complete</h3>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: pct >= 60 ? '#059669' : '#dc2626' }}>{pct}%</div>
          <p style={{ color: '#64748b' }}>{score} / {questions.length} correct</p>
        </div>
        <button onClick={generate} className="btn">Generate New Quiz</button>
        <Link href="/study" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Back to Study</Link>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>🤖 AI Quiz: {topic}</h3>
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Q{currentIndex + 1}/{questions.length}</span>
      </div>
      <div className="card">
        <QuestionComponent question={q} selectedAnswer={selectedAnswer} submitted={submitted} onSelect={setSelectedAnswer} />
        {!submitted ? (
          <button onClick={handleSubmit} className="btn" disabled={!selectedAnswer} style={{ opacity: !selectedAnswer ? 0.6 : 1 }}>
            Submit
          </button>
        ) : (
          <div>
            <div style={{
              padding: '1rem', borderRadius: '8px', marginBottom: '1rem',
              background: selectedAnswer === q.correctAnswer ? '#ecfdf5' : '#fef2f2',
              color: selectedAnswer === q.correctAnswer ? '#166534' : '#991b1b', fontWeight: 600
            }}>
              {selectedAnswer === q.correctAnswer ? '✓ Correct!' : '✗ Not quite'}
            </div>
            <div className="explanation">
              <strong>Explanation:</strong>
              <p style={{ marginTop: '0.5rem' }}>{q.explanation}</p>
              <ol className="steps">
                {q.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
            <button onClick={handleNext} className="btn">
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
