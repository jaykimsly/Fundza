'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Quiz from '@/components/Quiz';

function QuizWrapper() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');
  return <Quiz topicId={topicId} />;
}

export default function QuizPage() {
  return (
    <main className="container">
      <Suspense fallback={<div className="card">Loading quiz...</div>}>
        <QuizWrapper />
      </Suspense>
    </main>
  );
}
