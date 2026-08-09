import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export function isLlmConfigured() {
  return apiKey.length > 10 && !apiKey.includes('your-gemini');
}

export async function analyzeDocumentWithAI(content: string, fileType: string = 'report') {
  if (!isLlmConfigured()) throw new Error('LLM not configured');

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert South African matric academic advisor. Analyze this student ${fileType} and extract structured information.

Return ONLY a valid JSON object (no markdown, no backticks) in this exact format:

{
  "overall_summary": "Brief 2-sentence summary of overall performance",
  "subjects": [
    {
      "name": "Exact subject name",
      "current_percentage": 65,
      "nsc_level": 5,
      "weak_topics": ["Specific weak topic 1", "Weak topic 2"],
      "strong_topics": ["Strong topic 1"],
      "recommendations": ["Specific actionable recommendation"]
    }
  ],
  "overall_recommendations": ["Study recommendation 1", "Recommendation 2"],
  "aps_estimate": 28
}

Student document content:
"""
${content}
"""`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from possible markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM did not return valid JSON');
  
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuizWithAI(topic: string, subject: string, studentLevel: number) {
  if (!isLlmConfigured()) throw new Error('LLM not configured');

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a South African matric ${subject} examiner. Generate 5 multiple choice questions for the topic: "${topic}"

The student is currently at ${studentLevel}% mastery. Generate questions that will help them improve. Include a mix of easy and medium questions.

Each question must have:
- Clear question text (use South African context, rand values, local examples)
- 4 options labeled A, B, C, D
- Correct answer (just the letter)
- Detailed explanation with step-by-step working
- Difficulty level

Return ONLY valid JSON (no markdown) in this exact format:

{
  "questions": [
    {
      "question_text": "...",
      "options": [{"label": "A", "text": "..."}, {"label": "B", "text": "..."}, {"label": "C", "text": "..."}, {"label": "D", "text": "..."}],
      "correct_answer": "A",
      "explanation": "Detailed explanation...",
      "steps": ["Step 1: ...", "Step 2: ..."],
      "difficulty": "medium"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM did not return valid JSON');
  
  return JSON.parse(jsonMatch[0]);
}
