import crypto from 'node:crypto';
import { embedQuery, embedText } from '@/lib/ai';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type KnowledgeMetadata = {
  source_type: 'school_report' | 'exam_paper' | 'curriculum' | 'exam_timetable' | 'other';
  title: string;
  subject_code?: string | null;
  subject_name?: string | null;
  grade?: number | null;
  paper?: string | null;
  exam_year?: number | null;
  exam_session?: string | null;
  source_name?: string | null;
  metadata?: Record<string, unknown>;
};

export function normalizeSubjectName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function chunkText(text: string, maxChars = 6000, overlap = 500) {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf('\n\n', end);
      const sentence = normalized.lastIndexOf('. ', end);
      end = Math.max(boundary, sentence, start + Math.floor(maxChars * 0.7));
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function contentHash(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function ingestKnowledgeDocument(text: string, meta: KnowledgeMetadata) {
  const supabase = getSupabaseAdmin();
  const hash = contentHash(text);

  const { data: existing } = await supabase
    .from('knowledge_documents')
    .select('id')
    .eq('content_hash', hash)
    .maybeSingle();
  if (existing?.id) return { documentId: existing.id, chunksCreated: 0, duplicate: true };

  const { data: document, error: documentError } = await supabase
    .from('knowledge_documents')
    .insert({
      title: meta.title,
      source_type: meta.source_type,
      subject_code: meta.subject_code ?? null,
      subject_name: meta.subject_name ?? null,
      grade: meta.grade ?? null,
      paper: meta.paper ?? null,
      exam_year: meta.exam_year ?? null,
      exam_session: meta.exam_session ?? null,
      source_name: meta.source_name ?? null,
      content_hash: hash,
      metadata: meta.metadata ?? {},
    })
    .select('id')
    .single();
  if (documentError) throw documentError;

  const chunks = chunkText(text);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i], meta.title);
    const { error } = await supabase.from('knowledge_chunks').insert({
      document_id: document.id,
      chunk_index: i,
      content: chunks[i],
      token_count: Math.ceil(chunks[i].length / 4),
      embedding,
      metadata: { ...meta.metadata, chunk_index: i },
    });
    if (error) throw error;
  }

  return { documentId: document.id, chunksCreated: chunks.length, duplicate: false };
}

export async function retrieveKnowledge(options: {
  query: string;
  matchCount?: number;
  subjectCode?: string | null;
  grade?: number | null;
}) {
  const supabase = getSupabaseAdmin();
  const embedding = await embedQuery(options.query);
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: embedding,
    match_count: options.matchCount ?? 8,
    filter_subject_code: options.subjectCode ?? null,
    filter_grade: options.grade ?? null,
  });
  if (error) throw error;
  return (data ?? []).filter((row: any) => Number(row.similarity) >= 0.45);
}

export async function resolveSubject(subjectName: string) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeSubjectName(subjectName);

  const { data: aliases } = await supabase
    .from('subject_aliases')
    .select('subject_id, alias, normalized_alias, subjects_catalog:subject_id(id,name,code)')
    .eq('normalized_alias', normalized)
    .limit(1);
  if (aliases?.[0]?.subjects_catalog) {
    return { ...aliases[0].subjects_catalog, confidence: 1 };
  }

  const { data: subjects, error } = await supabase
    .from('subjects_catalog')
    .select('id,name,code')
    .limit(500);
  if (error) throw error;

  const scored = (subjects ?? []).map((subject: any) => {
    const candidate = normalizeSubjectName(subject.name);
    const a = new Set(normalized.split(' '));
    const b = new Set(candidate.split(' '));
    const intersection = [...a].filter((x) => b.has(x)).length;
    const union = new Set([...a, ...b]).size || 1;
    return { ...subject, confidence: intersection / union };
  }).sort((a: any, b: any) => b.confidence - a.confidence);

  const best = scored[0];
  return best && best.confidence >= 0.72 ? best : null;
}
