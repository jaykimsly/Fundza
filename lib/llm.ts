import { generateJson, quizSchema, reportSchema } from '@/lib/ai';

export function isLlmConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your-gemini'));
}

export async function analyzeDocumentWithAI(content: string, fileType: string = 'report') {
  const prompt = `You are a South African matric academic advisor. Analyze this ${fileType}. Extract only information supported by the document. Never invent a subject, percentage, topic, school, student, grade or term. Return null when unknown.

Document:\n${content}`;
  return generateJson(prompt, reportSchema);
}

export async function generateQuizWithAI(topic: string, subject: string, studentLevel: number) {
  const prompt = `You are a South African Grade 12 ${subject} examiner. Generate exactly 5 multiple-choice questions for ${topic}. The learner's current mastery is ${studentLevel}%. Use CAPS-aligned terminology and South African context. Do not claim that a question came from a DBE paper unless the supplied knowledge context explicitly says so. Include four options, the correct answer, explanation, steps and difficulty.`;
  return generateJson(prompt, quizSchema);
}
