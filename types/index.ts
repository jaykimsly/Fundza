export interface Subject {
  id: string;
  name: string;
  code: string;
  currentPercentage: number;
  targetPercentage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  color: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  paper: string;
  masteryLevel: 'not-mastered' | 'developing' | 'almost-there' | 'mastered';
  masteryPercentage: number;
}

export interface Question {
  id: string;
  topicId: string;
  questionText: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  topicId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}
