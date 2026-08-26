'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Quiz from '@/components/Quiz';
import { PageSkeleton } from '@/components/Skeleton';

function QuizWrapper() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');
  return <Quiz topicId={topicId} />;
}

export default function QuizPage() {
  return <main className="container"><Suspense fallback={<PageSkeleton />}><QuizWrapper /></Suspense></main>;
}
