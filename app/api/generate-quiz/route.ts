import { NextRequest, NextResponse } from 'next/server';
import { generateJson, isGeminiConfigured, quizSchema } from '@/lib/ai';
import { retrieveKnowledge } from '@/lib/knowledge';

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'LLM not configured', code: 'NO_API_KEY' }, { status: 503 });
    }

    const body = await request.json();
    const { topic, subject, studentLevel, grade } = body;
    if (!topic || !subject) {
      return NextResponse.json({ error: 'Topic and subject required' }, { status: 400 });
    }

    const context = await retrieveKnowledge({
      query: `${subject} ${topic} Grade ${grade || 12}`,
      matchCount: 6,
      grade: grade || null,
    });

    const sourceContext = context.map((row: any, index: number) =>
      `[SOURCE ${index + 1}] ${row.title} | ${row.source_type} | ${row.subject_name || row.subject_code || ''} | Grade ${row.grade || ''}\n${row.content}`
    ).join('\n\n');

    const prompt = `You are Fundza, a South African school study assistant. Generate exactly 5 multiple-choice questions for ${subject}, topic "${topic}". The learner's current mastery is ${studentLevel || 50}%. Target Grade ${grade || 12}.

Use the supplied Fundza knowledge when it is relevant. If the knowledge does not contain enough information, use your general subject knowledge but do not pretend it came from a source. Never invent DBE paper provenance. Questions must be educationally valid, have one unambiguously correct answer, and include explanations.

Knowledge context:
${sourceContext || 'No matching Fundza knowledge was retrieved.'}`;

    const result = await generateJson<{ questions: unknown[] }>(prompt, quizSchema);
    return NextResponse.json({ success: true, questions: result.questions, sources: context.map((x: any) => ({ title: x.title, source_type: x.source_type, similarity: x.similarity })) });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return NextResponse.json({ error: err.message || 'Quiz generation failed', code: 'MODEL_ERROR' }, { status: 500 });
  }
}
