export interface School {
  id: string;
  name: string;
  province: string;
  town: string;
  type: string;
  curriculum: string;
}

export interface Grade {
  id: string;
  grade_number: number;
  description: string;
  next_pathway: string;
}

export interface SubjectCatalog {
  id: string;
  name: string;
  code: string;
  grade_id: string;
  curriculum: string;
  category: string;
  is_compulsory: boolean;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  current_percentage: number;
  target_percentage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface Topic {
  id: string;
  subject_id: string;
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

export interface StudentProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  school_id: string;
  school_name?: string;
  grade_id: string;
  grade_number?: number;
  career_pathway: 'next_grade' | 'university' | 'college' | 'both';
  target_degree: string;
  target_university: string;
}
