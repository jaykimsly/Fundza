import { GoogleGenAI } from '@google/genai';
import { GEMINI_FALLBACK_MODEL, GEMINI_MODEL } from '@/lib/ai';

const apiKey = process.env.GEMINI_API_KEY || '';

type GeminiError = {
  status?: number | string;
  message?: string;
  code?: string | number;
};

export function isGeminiReportConfigured() {
  return apiKey.length > 20 && !apiKey.includes('your-gemini');
}

function client() {
  if (!isGeminiReportConfigured()) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey });
}

function shouldFallbackModel(error: unknown) {
  const candidate = error as GeminiError;
  const raw = `${candidate?.status ?? ''} ${candidate?.message ?? ''}`.toLowerCase();
  return raw.includes('429') || raw.includes('500') || raw.includes('502') || raw.includes('503') || raw.includes('504') || raw.includes('unavailable') || raw.includes('high demand') || raw.includes('overloaded') || raw.includes('rate limit') || raw.includes('timeout');
}

async function withModelFallback<T>(operation: (model: string) => Promise<T>): Promise<T> {
  try {
    return await operation(GEMINI_MODEL);
  } catch (error) {
    if (GEMINI_MODEL === GEMINI_FALLBACK_MODEL || !shouldFallbackModel(error)) throw error;
    console.warn(`Gemini model ${GEMINI_MODEL} unavailable; retrying with ${GEMINI_FALLBACK_MODEL}.`);
    return operation(GEMINI_FALLBACK_MODEL);
  }
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Gemini returned an empty response');
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1)) as T;
    throw new Error('Gemini returned invalid JSON');
  }
}

export async function generateGeminiJson<T>(input: string, schema: Record<string, unknown>): Promise<T> {
  const ai = client();
  return withModelFallback(async model => {
    const response = await ai.models.generateContent({
      model,
      contents: input,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: 'medium' },
      },
    });
    return parseJsonResponse<T>(response.text || '');
  });
}

export async function generateGeminiMultimodalJson<T>(
  prompt: string,
  fileData: string,
  mimeType: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const ai = client();
  return withModelFallback(async model => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        { inlineData: { data: fileData, mimeType } },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: 'medium' },
      },
    });
    return parseJsonResponse<T>(response.text || '');
  });
}
