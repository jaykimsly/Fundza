'use client';

import { useState, useEffect } from 'react';
import { questions as allQuestions } from '@/data/questions';
import { Question } from '@/types';
import Link from 'next/link';
import QuestionComponent from './Question';

interface Props {
  topicId: string | null;
}

export default function Quiz({ topicId }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [retryMode, setRetryMode] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);

  useEffect(() => {
    let filtered = topicId 
      ? allQuestions.filter(q => q.topicId === topicId)
      : allQuestions.slice(0, 5);
    
    if (filtered.length === 0) filtered = allQuestions.slice(0, 3);
    
    setQuestions(filtered);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setScore(0);
    setShowResults(false);
    setRetryMode(false);
    setWrongQuestions([]);
  }, [topicId]);

  const currentQuestion = questions[currentIndex];

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setSubmitted(true);
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
    } else {
      setWrongQuestions(w => [...w, currentQuestion]);
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

  const handleRetry = () => {
    if (wrongQuestions.length > 0) {
      setQuestions(wrongQuestions);
      setWrongQuestions([]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setSubmitted(false);
      setScore(0);
      setShowResults(false);
      setRetryMode(true);
    }
  };

  const handleRestart = () => {
    let filtered = topicId 
      ? allQuestions.filter(q => q.topicId === topicId)
      : allQuestions.slice(0, 5);
    if (filtered.length === 0) filtered = allQuestions.slice(0, 3);
    setQuestions(filtered);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setScore(0);
    setShowResults(false);
    setRetryMode(false);
    setWrongQuestions([]);
  };

  if (questions.length === 0) {
    return (
      <div className="card">
        <h2>Quiz</h2>
        <p>No questions available for this topic yet.</p>
        <Link href="/study" className="btn" style={{ marginTop: '1rem' }}>Back to Study</Link>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="card">
        <h2>{retryMode ? 'Retry Results' : 'Quiz Complete'}</h2>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ 
            fontSize: '3rem', 
            fontWeight: 700, 
            color: percentage >= 80 ? '#059669' : percentage >= 50 ? '#ca8a04' : '#dc2626' 
          }}>
            {percentage}%
          </div>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            {score} correct out of {questions.length}
          </p>
        </div>
        
        {!retryMode && wrongQuestions.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#991b1b', marginBottom: '0.75rem' }}>
              You got {wrongQuestions.length} question{wrongQuestions.length > 1 ? 's' : ''} wrong. Let's fix that.
            </p>
            <button onClick={handleRetry} className="btn btn-secondary">Try Similar Questions</button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleRestart} className="btn">Restart Quiz</button>
          <Link href="/study" className="btn btn-secondary">Back to Study</Link>
          <Link href="/progress" className="btn btn-success">View Progress</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Mathematical Literacy</h2>
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Question {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="card">
        <QuestionComponent 
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          submitted={submitted}
          onSelect={setSelectedAnswer}
        />

        {!submitted ? (
          <button 
            onClick={handleSubmit} 
            className="btn" 
            disabled={!selectedAnswer}
            style={{ opacity: !selectedAnswer ? 0.6 : 1 }}
          >
            Submit
          </button>
        ) : (
          <div>
            <div style={{ 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              background: selectedAnswer === currentQuestion.correctAnswer ? '#ecfdf5' : '#fef2f2',
              color: selectedAnswer === currentQuestion.correctAnswer ? '#166534' : '#991b1b',
              fontWeight: 600
            }}>
              {selectedAnswer === currentQuestion.correctAnswer ? '✓ CORRECT' : '✗ NOT QUITE'}
              {selectedAnswer !== currentQuestion.correctAnswer && (
                <span style={{ display: 'block', marginTop: '0.5rem', fontWeight: 400 }}>
                  Correct answer: {currentQuestion.correctAnswer}
                </span>
              )}
            </div>

            <div className="explanation">
              <strong>Explanation:</strong>
              <p style={{ marginTop: '0.5rem' }}>{currentQuestion.explanation}</p>
              <ol className="steps">
                {currentQuestion.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <button onClick={handleNext} className="btn">
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
        Score so far: {score} / {currentIndex + (submitted ? 1 : 0)}
      </div>

      <nav className="nav">
        <Link href="/">Dashboard</Link>
        <Link href="/study">Study</Link>
        <Link href="/exams">Exams</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </div>
  );
}
