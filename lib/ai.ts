import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY || '';
const gatewayBaseUrl = (process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1').replace(/\/$/, '');
const geminiApiKey = process.env.GEMINI_API_KEY || '';

export const AI_MODEL = process.env.AI_MODEL || 'minimax/minimax-m3-free';
export const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || 'poolside/laguna-s-2.1-free';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.7-flash';
export const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

const GEMINI_REQUEST_TIMEOUT_MS = 60000;
const GEMINI_HEALTH_TTL_MS = 30000;

type GatewayMessageContent = string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
type GatewayMessage = { role: 'system' | 'user' | 'assistant'; content: GatewayMessageContent };
type GatewayPayload = { error?: { message?: unknown }; choices?: Array<{ message?: { content?: unknown } }> };
type GatewayError = Error & { status?: number };

type GeminiAvailability = {
  status: 'available' | 'degraded' | 'offline';
  model: string;
  fallback_model: string;
  checked_at: string;
  error?: string;
};

let geminiHealthCache: { expiresAt: number; value: GeminiAvailability } | null = null;

export function isAiGatewayConfigured() { return gatewayApiKey.length > 20 && !gatewayApiKey.toLowerCase().includes('your-gateway'); }
export function isGeminiConfigured() { return geminiApiKey.length > 20 && !geminiApiKey.toLowerCase().includes('your-gemini'); }
export function isGeminiEmbeddingConfigured() { return isGeminiConfigured(); }

function geminiClient() {
  if (!isGeminiConfigured()) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { apiVersion: 'v1', timeout: GEMINI_REQUEST_TIMEOUT_MS } });
}

export async function checkGeminiAvailability(): Promise<GeminiAvailability> {
  const now = Date.now();
  if (geminiHealthCache && geminiHealthCache.expiresAt > now) return geminiHealthCache.value;

  if (!isGeminiConfigured()) {
    const value: GeminiAvailability = {
      status: 'offline',
      model: GEMINI_MODEL,
      fallback_model: GEMINI_FALLBACK_MODEL,
      checked_at: new Date().toISOString(),
      error: 'Provider not configured',
    };
    geminiHealthCache = { expiresAt: now + GEMINI_HEALTH_TTL_MS, value };
    return value;
  }

  const ai = geminiClient();
  let primaryError = '';
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'Reply with the single word OK.',
      config: { maxOutputTokens: 4, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    if (response.text?.trim()) {
      const value: GeminiAvailability = { status: 'available', model: GEMINI_MODEL, fallback_model: GEMINI_FALLBACK_MODEL, checked_at: new Date().toISOString() };
      geminiHealthCache = { expiresAt: now + GEMINI_HEALTH_TTL_MS, value };
      return value;
    }
    primaryError = 'Primary model returned an empty response';
  } catch (error: unknown) {
    primaryError = error instanceof Error ? error.message : 'Primary model request failed';
  }

  if (GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents: 'Reply with the single word OK.',
        config: { maxOutputTokens: 4, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });
      if (response.text?.trim()) {
        const value: GeminiAvailability = { status: 'degraded', model: GEMINI_MODEL, fallback_model: GEMINI_FALLBACK_MODEL, checked_at: new Date().toISOString(), error: primaryError };
        geminiHealthCache = { expiresAt: now + GEMINI_HEALTH_TTL_MS, value };
        return value;
      }
    } catch (error: unknown) {
      const fallbackError = error instanceof Error ? error.message : 'Fallback model request failed';
      primaryError = `${primaryError}; ${fallbackError}`;
    }
  }

  const value: GeminiAvailability = { status: 'offline', model: GEMINI_MODEL, fallback_model: GEMINI_FALLBACK_MODEL, checked_at: new Date().toISOString(), error: primaryError };
  geminiHealthCache = { expiresAt: now + GEMINI_HEALTH_TTL_MS, value };
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function shouldFallbackModel(error: unknown) {
  const candidate = isRecord(error) ? error : {};
  const status = typeof candidate.status === 'number' || typeof candidate.status === 'string' ? candidate.status : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const raw = `${status} ${message}`.toLowerCase();
  return raw.includes('400') || raw.includes('404') || raw.includes('429') || raw.includes('500') || raw.includes('502') || raw.includes('503') || raw.includes('504') || raw.includes('unavailable') || raw.includes('high demand') || raw.includes('overloaded') || raw.includes('rate limit') || raw.includes('timeout') || raw.includes('deadline');
}

async function gatewayChat(messages: GatewayMessage[], model: string, options: { json?: boolean; maxOutputTokens?: number } = {}) {
  if (!isAiGatewayConfigured()) throw new Error('AI_GATEWAY_API_KEY is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${gatewayBaseUrl}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${gatewayApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, max_tokens: options.maxOutputTokens ?? 8192, ...(options.json ? { response_format: { type: 'json_object' } } : {}) }), cache: 'no-store', signal: controller.signal });
    const raw = await response.text();
    let payload: GatewayPayload | null = null;
    try { const parsed: unknown = raw ? JSON.parse(raw) : null; if (isRecord(parsed)) payload = parsed as GatewayPayload; } catch { payload = null; }
    if (!response.ok) { const errorMessage = payload?.error?.message; const message = typeof errorMessage === 'string' ? errorMessage : raw || `AI Gateway request failed with ${response.status}`; const error: GatewayError = new Error(message); error.status = response.status; throw error; }
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('AI Gateway returned an empty response');
    return text;
  } finally { clearTimeout(timeout); }
}

async function withGatewayFallback<T>(operation: (model: string) => Promise<T>, allowFallback = true): Promise<T> {
  try { return await operation(AI_MODEL); } catch (error) { if (!allowFallback || AI_MODEL === AI_FALLBACK_MODEL || !shouldFallbackModel(error)) throw error; console.warn(`AI Gateway model ${AI_MODEL} unavailable; retrying with ${AI_FALLBACK_MODEL}.`); return operation(AI_FALLBACK_MODEL); }
}

async function withGeminiFallback<T>(operation: (model: string) => Promise<T>): Promise<T> {
  try { return await operation(GEMINI_MODEL); } catch (error) { if (GEMINI_MODEL === GEMINI_FALLBACK_MODEL || !shouldFallbackModel(error)) throw error; console.warn(`Gemini model ${GEMINI_MODEL} unavailable; retrying with ${GEMINI_FALLBACK_MODEL}.`); return operation(GEMINI_FALLBACK_MODEL); }
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('AI provider returned an empty response');
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(unfenced) as T; } catch { const start = unfenced.indexOf('{'); const end = unfenced.lastIndexOf('}'); if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1)) as T; throw new Error('AI provider returned invalid JSON'); }
}

function schemaForGemini(schema: Record<string, unknown>) { return schema as any; }

async function generateGeminiJsonInternal<T>(input: string, schema: Record<string, unknown>): Promise<T> {
  const ai = geminiClient();
  const schemaText = JSON.stringify(schema);
  return withGeminiFallback(async model => {
    const response = await ai.models.generateContent({ model, contents: `${input}\n\nReturn ONLY valid JSON matching this schema. Do not wrap it in markdown.\nSCHEMA:\n${schemaText}`, config: { responseMimeType: 'application/json', responseSchema: schemaForGemini(schema), thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } });
    return parseJsonResponse<T>(response.text || '');
  });
}

export async function generateJson<T>(input: string, schema: Record<string, unknown>): Promise<T> {
  if (isGeminiConfigured()) return generateGeminiJsonInternal<T>(input, schema);
  if (!isAiGatewayConfigured()) throw new Error('No AI provider is configured');
  const schemaText = JSON.stringify(schema);
  const text = await withGatewayFallback(model => gatewayChat([{ role: 'system', content: 'You are a reliable educational AI. Follow the requested JSON schema exactly.' }, { role: 'user', content: `${input}\n\nReturn ONLY valid JSON matching this schema. Do not wrap it in markdown.\nSCHEMA:\n${schemaText}` }], model, { json: true }));
  return parseJsonResponse<T>(text);
}

export async function generateMultimodalJson<T>(prompt: string, fileData: string, mimeType: string, schema: Record<string, unknown>): Promise<T> {
  const ai = geminiClient();
  const schemaText = JSON.stringify(schema);
  return withGeminiFallback(async model => {
    const response = await ai.models.generateContent({ model, contents: [{ text: `${prompt}\n\nReturn ONLY valid JSON matching this schema. Do not wrap it in markdown.\nSCHEMA:\n${schemaText}` }, { inlineData: { data: fileData, mimeType } }], config: { responseMimeType: 'application/json', responseSchema: schemaForGemini(schema), thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } });
    return parseJsonResponse<T>(response.text || '');
  });
}
