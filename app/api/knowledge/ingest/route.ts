import { NextRequest, NextResponse } from 'next/server';
import { ingestKnowledgeDocument } from '@/lib/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.KNOWLEDGE_INGEST_SECRET;
    const supplied = request.headers.get('x-knowledge-ingest-secret');
    if (!secret || supplied !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, ...metadata } = body;
    if (typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json({ error: 'text must contain at least 50 characters' }, { status: 400 });
    }
    if (!metadata.title || !metadata.source_type) {
      return NextResponse.json({ error: 'title and source_type are required' }, { status: 400 });
    }

    const result = await ingestKnowledgeDocument(text, metadata);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Knowledge ingestion failed:', err);
    return NextResponse.json({ error: err.message || 'Knowledge ingestion failed' }, { status: 500 });
  }
}
