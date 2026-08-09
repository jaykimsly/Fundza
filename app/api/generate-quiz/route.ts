import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey.length > 10 ? new GoogleGenerativeAI(apiKey) : null;

function isLlmConfigured() {
  return Boolean(genAI && !apiKey.includes('your-gemini'));
}

async function tryGenerate(modelName: string, prompt: string) {
  if (!genAI) throw new Error('LLM not initialized');
  const model = genAI.getGenerativeModel({ model: modelName });
  return model.generateContent(prompt);
}

export async function POST(request: NextRequest) {
  try {
    if (!isLlmConfigured()) {
      return NextResponse.json({ error: 'LLM not configured', code: 'NO_API_KEY' }, { status: 503 });
    }

    const body = await request.json();
    const { topic, subject, studentLevel } = body;

    if (!topic || !subject) {
      return NextResponse.json({ error: 'Topic and subject required' }, { status: 400 });
    }

    const prompt = `You are a South African matric ${subject} examiner. Generate 5 multiple choice questions for the topic: "${topic}"

The student is currently at ${studentLevel || 50}% mastery. Generate questions that will help them improve. Include a mix of easy and medium questions.

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

    const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
    let result;
    let lastError;

    for (const modelName of models) {
      try {
        result = await tryGenerate(modelName, prompt);
        break;
      } catch (e: any) {
        lastError = e;
        if (e.message?.includes('404')) continue;
        throw e;
      }
    }

    if (!result) throw lastError || new Error('All models failed');

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    return NextResponse.json({ success: true, questions: JSON.parse(jsonMatch[0]).questions });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return NextResponse.json({ error: err.message || 'Quiz generation failed', code: 'MODEL_ERROR' }, { status: 500 });
  }
}
