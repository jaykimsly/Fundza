import { NextResponse } from 'next/server';
import { AI_FALLBACK_MODEL, AI_MODEL, GEMINI_EMBEDDING_MODEL, isAiGatewayConfigured, isGeminiEmbeddingConfigured } from '@/lib/ai';

export async function GET() {
  return NextResponse.json({
    ok: isAiGatewayConfigured(),
    provider: 'vercel-ai-gateway',
    model: AI_MODEL,
    fallback_model: AI_FALLBACK_MODEL,
    embedding_model: GEMINI_EMBEDDING_MODEL,
    embeddings_enabled: process.env.AI_USE_GEMINI_EMBEDDINGS === 'true' && isGeminiEmbeddingConfigured(),
    rag: true,
    retrieval_mode: process.env.AI_USE_GEMINI_EMBEDDINGS === 'true' && isGeminiEmbeddingConfigured() ? 'semantic' : 'lexical',
    embedding_dimensions: 768,
  });
}
