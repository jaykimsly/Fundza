import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
export const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

export function isGeminiConfigured() {
  return apiKey.length > 20 && !apiKey.includes('your-gemini');
}

function client() {
  if (!isGeminiConfigured()) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

export async function generateJson<T>(input: string, schema: Record<string, unknown>): Promise<T> {
  const ai = client();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: input,
    config: {
      responseFormat: {
        text: {
          mimeType: 'application/json',
          schema,
        },
      },
      thinkingConfig: { thinkingLevel: 'medium' },
    } as any,
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return JSON.parse(text) as T;
}

export async function generateMultimodalJson<T>(
  prompt: string,
  fileData: string,
  mimeType: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const ai = client();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { text: prompt },
      { inlineData: { data: fileData, mimeType } },
    ],
    config: {
      responseFormat: {
        text: {
          mimeType: 'application/json',
          schema,
        },
      },
      thinkingConfig: { thinkingLevel: 'medium' },
    } as any,
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return JSON.parse(text) as T;
}

export async function embedText(text: string, title?: string) {
  const ai = client();
  const result = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      title,
      outputDimensionality: 768,
      autoTruncate: true,
    } as any,
  });

  const values = result.embeddings?.[0]?.values;
  if (!values || values.length !== 768) {
    throw new Error(`Gemini embedding returned ${values?.length ?? 0} dimensions; expected 768`);
  }
  return values;
}

export async function embedQuery(text: string) {
  const ai = client();
  const result = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
      autoTruncate: true,
    } as any,
  });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length !== 768) throw new Error('Gemini query embedding failed');
  return values;
}

export const reportSchema = {
  type: 'object',
  properties: {
    student_name: { type: ['string', 'null'] },
    school_name: { type: ['string', 'null'] },
    grade: { type: ['integer', 'null'] },
    term: { type: ['string', 'null'] },
    overall_summary: { type: 'string' },
    overall_average: { type: ['number', 'null'] },
    subjects_passed: { type: ['integer', 'null'] },
    subjects_failed: { type: ['integer', 'null'] },
    subjects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          percentage: { type: ['number', 'null'] },
          comment: { type: ['string', 'null'] },
          weak_topics: { type: 'array', items: { type: 'string' } },
          strong_topics: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'percentage', 'comment', 'weak_topics', 'strong_topics'],
      },
    },
    teacher_comments: { type: 'array', items: { type: 'string' } },
    overall_recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'student_name', 'school_name', 'grade', 'term', 'overall_summary',
    'overall_average', 'subjects_passed', 'subjects_failed', 'subjects',
    'teacher_comments', 'overall_recommendations',
  ],
};

export const quizSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          question_text: { type: 'string' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, text: { type: 'string' } },
              required: ['label', 'text'],
            },
          },
          correct_answer: { type: 'string' },
          explanation: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['question_text', 'options', 'correct_answer', 'explanation', 'steps', 'difficulty'],
      },
    },
  },
  required: ['questions'],
};
