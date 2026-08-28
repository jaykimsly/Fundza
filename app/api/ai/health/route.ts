import { NextResponse } from 'next/server';
import { GEMINI_EMBEDDING_MODEL, GEMINI_MODEL, isGeminiConfigured } from '@/lib/ai';

export async function GET() {
  return NextResponse.json({
    ok: isGeminiConfigured(),
    provider: 'gemini',
    model: GEMINI_MODEL,
    embedding_model: GEMINI_EMBEDDING_MODEL,
    rag: true,
    embedding_dimensions: 768,
  });
}
