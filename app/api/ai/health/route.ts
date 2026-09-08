import { NextResponse } from 'next/server';
import { AI_FALLBACK_MODEL, AI_MODEL, GEMINI_EMBEDDING_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, checkGeminiAvailability, isAiGatewayConfigured, isGeminiConfigured, isGeminiEmbeddingConfigured } from '@/lib/ai';

export const runtime = 'nodejs';

export async function GET() {
  const geminiConfigured = isGeminiConfigured();
  const embeddingsEnabled = process.env.AI_USE_GEMINI_EMBEDDINGS === 'true' && isGeminiEmbeddingConfigured();
  const availability = await checkGeminiAvailability();

  return NextResponse.json({
    ok: availability.status !== 'offline',
    status: availability.status,
    provider: geminiConfigured ? 'gemini' : isAiGatewayConfigured() ? 'vercel-ai-gateway' : 'none',
    gemini: {
      configured: geminiConfigured,
      model: GEMINI_MODEL,
      fallback_model: GEMINI_FALLBACK_MODEL,
      availability,
    },
    gateway: {
      configured: isAiGatewayConfigured(),
      model: AI_MODEL,
      fallback_model: AI_FALLBACK_MODEL,
    },
    embedding_model: GEMINI_EMBEDDING_MODEL,
    embeddings_enabled: embeddingsEnabled,
    rag: true,
    retrieval_mode: embeddingsEnabled ? 'semantic' : 'lexical',
    embedding_dimensions: 768,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
