'use client';

import { Question as QuestionType } from '@/types';

interface Props {
  question: QuestionType;
  selectedAnswer: string | null;
  submitted: boolean;
  onSelect: (label: string) => void;
}

export default function QuestionComponent({ question, selectedAnswer, submitted, onSelect }: Props) {
  return (
    <div>
      <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {question.questionText}
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        {question.options.map((option) => {
          let className = 'quiz-option';
          if (selectedAnswer === option.label) className += ' selected';
          if (submitted) {
            if (option.label === question.correctAnswer) className += ' correct';
            else if (selectedAnswer === option.label) className += ' incorrect';
          }

          return (
            <button
              key={option.label}
              className={className}
              onClick={() => !submitted && onSelect(option.label)}
              disabled={submitted}
            >
              <strong style={{ marginRight: '0.75rem' }}>[ {option.label} ]</strong>
              {option.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
