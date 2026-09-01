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

type GeneratedQuestion = {
  question_text: string;
  options: Question['options'];
  correct_answer: string;
  explanation: string;
  steps?: string[];
  difficulty?: Question['difficulty'];
};

type GenerateResponse = {
  success?: boolean;
  code?: string;
  error?: string;
  questions?: unknown;
};

function isGeneratedQuestion(value: unknown): value is GeneratedQuestion {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.question_text === 'string' &&
    Array.isArray(item.options) &&
    item.options.every(
      (option): option is { label: string; text: string } =>
        Boolean(option) &&
        typeof option === 'object' &&
        typeof (option as Record<string, unknown>).label === 'string' &&
        typeof (option as Record<string, unknown>).text === 'string',
    ) &&
    typeof item.correct_answer === 'string' &&
    typeof item.explanation === 'string'
  );
}

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
    setLoading(true);
    setSupportError(null);
    try {
      if (!navigator.onLine) throw new Error('You are offline. Connect to the internet and try again.');

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, studentLevel }),
      });
      const data = (await res.json().catch(() => ({}))) as GenerateResponse;

      if (!res.ok || !data.success) {
        const code = data.code || (res.status === 503 ? 'SERVICE_UNAVAILABLE' : 'MODEL_ERROR');
        const messages: Record<string, string> = {
          NO_API_KEY: 'Practice generation is not configured yet. You can still use verified practice questions when available.',
          SERVICE_UNAVAILABLE: 'Practice generation is temporarily unavailable. Your study data is safe. Try again later.',
          MODEL_ERROR: 'New practice questions could not be prepared right now. Try again or choose another topic.',
          INVALID_REQUEST: 'Some practice information is missing. Choose a subject and topic, then try again.',
        };
        throw new Error(messages[code] || data.error || 'New practice questions could not be prepared.');
      }

      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      const formatted = rawQuestions.filter(isGeneratedQuestion).map((question, index): Question => ({
        id: `practice-${index}`,
        topicId: 'generated-practice',
        questionText: question.question_text,
        options: question.options,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        steps: question.steps || [],
        difficulty: question.difficulty || 'medium',
      }));

      if (!formatted.length) throw new Error('No practice questions were available for this request.');

      setQuestions(formatted);
      setCurrentIndex(0);
      setScore(0);
      setShowResults(false);
      setSelectedAnswer(null);
      setSubmitted(false);
    } catch (err: unknown) {
      setSupportError(err instanceof Error ? err.message : 'New practice questions could not be prepared.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedAnswer || !questions[currentIndex]) return;
    setSubmitted(true);
    if (selectedAnswer === questions[currentIndex].correctAnswer) setScore((current) => current + 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((current) => current + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
    } else {
      setShowResults(true);
    }
  };

  if (supportError) {
    return (
      <div className="card" role="alert" style={{ border: '1px solid #fed7aa', background: '#fffaf5' }}>
        <p style={{ margin: 0, color: '#9a3412', fontWeight: 700 }}>Practice generation unavailable</p>
        <p style={{ color: '#7c2d12', margin: '.5rem 0 1rem' }}>{supportError}</p>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button onClick={generate} className="btn" disabled={loading}>{loading ? 'Preparing…' : 'Try again'}</button>
          <Link href="/quiz" className="btn btn-secondary">Choose another practice</Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: '.25rem' }}>Create practice</p>
        <h3 style={{ marginTop: 0 }}>Practise {topic}</h3>
        <p style={{ color: '#64748b', margin: '1rem 0' }}>Create five practice questions about <strong>{topic}</strong>, adjusted for your current level.</p>
        <button onClick={generate} className="btn" disabled={loading}>{loading ? 'Preparing practice…' : 'Create Practice'}</button>
        {loading && <p style={{ color: '#64748b', marginTop: '.75rem', fontSize: '.85rem' }}>Preparing your questions. Please keep this page open.</p>}
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="card">
        <p style={{ color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: '.25rem' }}>Practice complete</p>
        <h3 style={{ marginTop: 0 }}>Good work</h3>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{percentage}%</div>
          <p style={{ color: '#64748b' }}>{score} / {questions.length} correct</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button onClick={generate} className="btn">Create New Practice</button>
          <Link href="/quiz" className="btn btn-secondary">Back to Practice</Link>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <p style={{ color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: '.25rem' }}>{subject}</p>
          <h3 style={{ margin: 0 }}>Practise {topic}</h3>
        </div>
        <span style={{ color: '#64748b', fontSize: '.875rem' }}>Q{currentIndex + 1}/{questions.length}</span>
      </div>
      <div className="card">
        <QuestionComponent question={question} selectedAnswer={selectedAnswer} submitted={submitted} onSelect={setSelectedAnswer} />
        {!submitted ? (
          <button onClick={handleSubmit} className="btn" disabled={!selectedAnswer}>Submit</button>
        ) : (
          <div>
            <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: selectedAnswer === question.correctAnswer ? '#ecfdf5' : '#fef2f2', color: selectedAnswer === question.correctAnswer ? '#166534' : '#991b1b', fontWeight: 600 }}>
              {selectedAnswer === question.correctAnswer ? 'Correct!' : 'Not quite'}
            </div>
            <div className="explanation">
              <strong>Explanation:</strong>
              <p style={{ marginTop: '.5rem' }}>{question.explanation}</p>
              {question.steps.length > 0 && <ol className="steps">{question.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}
            </div>
            <button onClick={handleNext} className="btn">{currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
