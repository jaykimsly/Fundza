import { GoogleGenAI } from '@google/genai';

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY || '';
const gatewayBaseUrl = (process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1').replace(/\/$/, '');
const geminiApiKey = process.env.GEMINI_API_KEY || '';

export const AI_MODEL = process.env.AI_MODEL || 'minimax/minimax-m3-free';
export const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || 'poolside/laguna-s-2.1-free';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
export const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

type GatewayMessageContent = string | Array<{
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}>;

type GatewayMessage = { role: 'system' | 'user' | 'assistant'; content: GatewayMessageContent };

type GatewayPayload = {
  error?: { message?: unknown };
  choices?: Array<{ message?: { content?: unknown } }>;
};

type GatewayError = Error & { status?: number };

export function isAiGatewayConfigured() {
  return gatewayApiKey.length > 20 && !gatewayApiKey.includes('your-gateway');
}

export function isGeminiConfigured() {
  return isAiGatewayConfigured();
}

export function isGeminiEmbeddingConfigured() {
  return geminiApiKey.length > 20 && !geminiApiKey.includes('your-gemini');
}

function geminiClient() {
  if (!isGeminiEmbeddingConfigured()) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey: geminiApiKey });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function shouldFallbackModel(error: unknown) {
  const candidate = isRecord(error) ? error : {};
  const status = typeof candidate.status === 'number' || typeof candidate.status === 'string' ? candidate.status : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const raw = `${status} ${message}`.toLowerCase();
  return raw.includes('429') || raw.includes('500') || raw.includes('502') || raw.includes('503') || raw.includes('504') || raw.includes('unavailable') || raw.includes('high demand') || raw.includes('overloaded') || raw.includes('rate limit') || raw.includes('timeout');
}

async function gatewayChat(messages: GatewayMessage[], model: string, options: { json?: boolean; maxOutputTokens?: number } = {}) {
  if (!isAiGatewayConfigured()) throw new Error('AI_GATEWAY_API_KEY is not configured');
  const response = await fetch(`${gatewayBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${gatewayApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: options.maxOutputTokens ?? 8192, ...(options.json ? { response_format: { type: 'json_object' } } : {}) }),
    cache: 'no-store',
  });
  const raw = await response.text();
  let payload: GatewayPayload | null = null;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isRecord(parsed)) {
      payload = parsed as GatewayPayload;
    }
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const errorMessage = payload?.error?.message;
    const message = typeof errorMessage === 'string' ? errorMessage : raw || `AI Gateway request failed with ${response.status}`;
    const error: GatewayError = new Error(message);
    error.status = response.status;
    throw error;
  }
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('AI Gateway returned an empty response');
  return text;
}

async function withGatewayFallback<T>(operation: (model: string) => Promise<T>, allowFallback = true): Promise<T> {
  try { return await operation(AI_MODEL); }
  catch (error) {
    if (!allowFallback || AI_MODEL === AI_FALLBACK_MODEL || !shouldFallbackModel(error)) throw error;
    console.warn(`AI Gateway model ${AI_MODEL} unavailable; retrying with ${AI_FALLBACK_MODEL}.`);
    return operation(AI_FALLBACK_MODEL);
  }
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('AI Gateway returned an empty response');
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(unfenced) as T; } catch {
    const start = unfenced.indexOf('{'); const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1)) as T;
    throw new Error('AI Gateway returned invalid JSON');
  }
}

export async function generateJson<T>(input: string, schema: Record<string, unknown>): Promise<T> {
  const schemaText = JSON.stringify(schema);
  const prompt = `${input}\n\nReturn ONLY valid JSON matching this schema. Do not wrap it in markdown.\nSCHEMA:\n${schemaText}`;
  const text = await withGatewayFallback((model) => gatewayChat([
    { role: 'system', content: 'You are a reliable educational AI. Follow the requested JSON schema exactly.' },
    { role: 'user', content: prompt },
  ], model, { json: true }));
  return parseJsonResponse<T>(text);
}

export async function generateMultimodalJson<T>(prompt: string, fileData: string, mimeType: string, schema: Record<string, unknown>): Promise<T> {
  if (!mimeType.startsWith('image/')) throw new Error('AI Gateway free multimodal mode currently supports image input only');
  const schemaText = JSON.stringify(schema);
  const messages: GatewayMessage[] = [{ role: 'user', content: [
    { type: 'text', text: `${prompt}\n\nReturn ONLY valid JSON matching this schema.\nSCHEMA:\n${schemaText}` },
    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileData}` } },
  ] }];
  const text = await withGatewayFallback((model) => gatewayChat(messages, model, { json: true }), false);
  return parseJsonResponse<T>(text);
}

export async function generateUploadedFileJson<T>(prompt: string, filePath: string, mimeType: string, schema: Record<string, unknown>): Promise<T> {
  if (mimeType.startsWith('image/')) {
    const { promises: fs } = await import('node:fs');
    const data = (await fs.readFile(filePath)).toString('base64');
    return generateMultimodalJson(prompt, data, mimeType, schema);
  }
  throw new Error('PDF_GATEWAY_UNSUPPORTED');
}

export async function embedText(text: string, title?: string) {
  const ai = geminiClient();
  const result = await ai.models.embedContent({ model: GEMINI_EMBEDDING_MODEL, contents: text, config: { taskType: 'RETRIEVAL_DOCUMENT', title, outputDimensionality: 768, autoTruncate: true } as unknown as Parameters<typeof ai.models.embedContent>[0]['config'] });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length !== 768) throw new Error(`Gemini embedding returned ${values?.length ?? 0} dimensions; expected 768`);
  return values;
}

export async function embedQuery(text: string) {
  const ai = geminiClient();
  const result = await ai.models.embedContent({ model: GEMINI_EMBEDDING_MODEL, contents: text, config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768, autoTruncate: true } as unknown as Parameters<typeof ai.models.embedContent>[0]['config'] });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length !== 768) throw new Error('Gemini query embedding failed');
  return values;
}

export const reportSchema = {
  type: 'object', properties: {
    student_name: { type: ['string', 'null'] }, school_name: { type: ['string', 'null'] }, grade: { type: ['integer', 'null'] }, term: { type: ['string', 'null'] }, overall_summary: { type: 'string' }, overall_average: { type: ['number', 'null'] }, subjects_passed: { type: ['integer', 'null'] }, subjects_failed: { type: ['integer', 'null'] },
    subjects: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, percentage: { type: ['number', 'null'] }, comment: { type: ['string', 'null'] }, weak_topics: { type: 'array', items: { type: 'string' } }, strong_topics: { type: 'array', items: { type: 'string' } } }, required: ['name', 'percentage', 'comment', 'weak_topics', 'strong_topics'] } },
    teacher_comments: { type: 'array', items: { type: 'string' } }, overall_recommendations: { type: 'array', items: { type: 'string' } },
  }, required: ['student_name', 'school_name', 'grade', 'term', 'overall_summary', 'overall_average', 'subjects_passed', 'subjects_failed', 'subjects', 'teacher_comments', 'overall_recommendations'],
};

export const reportExtractionSchema = {
  type: 'object',
  properties: {
    learner_name: { type: ['string', 'null'] },
    school_name: { type: ['string', 'null'] },
    grade: { type: ['integer', 'null'] },
    term: { type: ['string', 'null'] },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject_original: { type: 'string' },
          mark: { type: ['number', 'null'] },
          mark_type: { type: 'string' },
          mark_denominator: { type: ['number', 'null'] },
          level: { type: ['string', 'null'] },
          source_text: { type: ['string', 'null'] },
          confidence: { type: 'number' },
        },
        required: ['subject_original', 'mark', 'mark_type', 'mark_denominator', 'level', 'source_text', 'confidence'],
      },
    },
    extraction_warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['learner_name', 'school_name', 'grade', 'term', 'results', 'extraction_warnings'],
};

export const quizSchema = {
  type: 'object', properties: {
    questions: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'object', properties: {
      question_text: { type: 'string' }, options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'object', properties: { label: { type: 'string' }, text: { type: 'string' } }, required: ['label', 'text'] } }, correct_answer: { type: 'string' }, explanation: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } }, difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    }, required: ['question_text', 'options', 'correct_answer', 'explanation', 'steps', 'difficulty'] } },
  }, required: ['questions'],
};
