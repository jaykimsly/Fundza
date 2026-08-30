import crypto from 'node:crypto';
import { embedQuery, embedText, isGeminiEmbeddingConfigured } from '@/lib/ai';
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
  source_url?: string | null;
  curriculum_year?: number | null;
  curriculum_version?: string | null;
  provenance_type?: 'official' | 'past_paper' | 'teacher' | 'fundza' | 'automated' | 'other';
  verification_status?: 'unverified' | 'verified' | 'needs_review';
  metadata?: Record<string, unknown>;
};

export function normalizeSubjectName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

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

export function contentHash(text: string) { return crypto.createHash('sha256').update(text).digest('hex'); }

export async function ingestKnowledgeDocument(text: string, meta: KnowledgeMetadata) {
  const supabase = getSupabaseAdmin();
  const hash = contentHash(text);
  const { data: existing } = await supabase.from('knowledge_documents').select('id').eq('content_hash', hash).maybeSingle();
  if (existing?.id) return { documentId: existing.id, chunksCreated: 0, duplicate: true };
  const provenanceType = meta.provenance_type ?? 'other';
  const verificationStatus = meta.verification_status ?? 'unverified';
  const { data: document, error: documentError } = await supabase.from('knowledge_documents').insert({
    title: meta.title, source_type: meta.source_type, subject_code: meta.subject_code ?? null, subject_name: meta.subject_name ?? null,
    grade: meta.grade ?? null, paper: meta.paper ?? null, exam_year: meta.exam_year ?? null, exam_session: meta.exam_session ?? null,
    source_name: meta.source_name ?? null, source_url: meta.source_url ?? null, curriculum_year: meta.curriculum_year ?? null,
    curriculum_version: meta.curriculum_version ?? null, provenance_type: provenanceType, verification_status: verificationStatus,
    content_hash: hash, metadata: meta.metadata ?? {},
  }).select('id').single();
  if (documentError) throw documentError;
  const chunks = chunkText(text);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i], meta.title);
    const { error } = await supabase.from('knowledge_chunks').insert({
      document_id: document.id, chunk_index: i, content: chunks[i], token_count: Math.ceil(chunks[i].length / 4), embedding,
      provenance_type: provenanceType, verification_status: verificationStatus, metadata: { ...meta.metadata, chunk_index: i },
    });
    if (error) throw error;
  }
  return { documentId: document.id, chunksCreated: chunks.length, duplicate: false };
}

function lexicalTokens(value: string) { return new Set(normalizeSubjectName(value).split(' ').filter((token) => token.length >= 3)); }
function lexicalSimilarity(query: string, content: string) {
  const queryTokens = lexicalTokens(query); const contentTokens = lexicalTokens(content);
  if (!queryTokens.size || !contentTokens.size) return 0;
  let matches = 0; for (const token of queryTokens) if (contentTokens.has(token)) matches += 1;
  return matches / queryTokens.size;
}

type KnowledgeDocumentRow = { title?: string; source_type?: string; subject_code?: string | null; subject_name?: string | null; grade?: number | null; paper?: string | null; exam_year?: number | null; exam_session?: string | null; source_url?: string | null; provenance_type?: string; verification_status?: string };
type KnowledgeChunkRow = { content?: string; token_count?: number; metadata?: Record<string, unknown>; knowledge_documents?: KnowledgeDocumentRow | null };

async function retrieveKnowledgeLexically(options: { query: string; matchCount?: number; subjectCode?: string | null; grade?: number | null }) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('knowledge_chunks').select('content,token_count,metadata,knowledge_documents(title,source_type,subject_code,subject_name,grade,paper,exam_year,exam_session,source_url,provenance_type,verification_status)').limit(300);
  if (options.grade) query = query.eq('knowledge_documents.grade', options.grade);
  if (options.subjectCode) query = query.eq('knowledge_documents.subject_code', options.subjectCode);
  const { data, error } = await query; if (error) throw error;
  return (data ?? []).map((row: KnowledgeChunkRow) => {
    const doc = row.knowledge_documents || {};
    const similarity = lexicalSimilarity(options.query, `${doc.title || ''} ${doc.subject_name || ''} ${row.content || ''}`);
    return { title: doc.title, source_type: doc.source_type, subject_code: doc.subject_code, subject_name: doc.subject_name, grade: doc.grade, paper: doc.paper, exam_year: doc.exam_year, exam_session: doc.exam_session, source_url: doc.source_url, provenance_type: doc.provenance_type, verification_status: doc.verification_status, content: row.content, token_count: row.token_count, metadata: row.metadata, similarity };
  }).filter((row) => row.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, options.matchCount ?? 8);
}

export async function retrieveKnowledge(options: { query: string; matchCount?: number; subjectCode?: string | null; grade?: number | null }) {
  const useGeminiEmbeddings = process.env.AI_USE_GEMINI_EMBEDDINGS === 'true';
  if (!useGeminiEmbeddings || !isGeminiEmbeddingConfigured()) return retrieveKnowledgeLexically(options);
  const supabase = getSupabaseAdmin();
  const embedding = await embedQuery(options.query);
  const { data, error } = await supabase.rpc('match_knowledge_chunks', { query_embedding: embedding, match_count: options.matchCount ?? 8, filter_subject_code: options.subjectCode ?? null, filter_grade: options.grade ?? null });
  if (error) throw error;
  return (data ?? []).filter((row: { similarity?: number }) => Number(row.similarity) >= 0.45);
}

export async function resolveSubject(subjectName: string) {
  const supabase = getSupabaseAdmin(); const normalized = normalizeSubjectName(subjectName);
  const { data: aliases, error: aliasError } = await supabase.from('subject_aliases').select('subject_id,alias,normalized_alias').eq('normalized_alias', normalized).limit(1);
  if (aliasError) throw aliasError;
  if (aliases?.[0]?.subject_id) {
    const { data: subject } = await supabase.from('subjects_catalog').select('id,name,code').eq('id', aliases[0].subject_id).maybeSingle();
    if (subject) return { ...subject, confidence: 1 };
  }
  const { data: subjects, error } = await supabase.from('subjects_catalog').select('id,name,code').limit(500);
  if (error) throw error;
  const scored = (subjects ?? []).map((subject: { id: string; name: string; code: string }) => {
    const candidate = normalizeSubjectName(subject.name); const a = new Set(normalized.split(' ')); const b = new Set(candidate.split(' '));
    const intersection = [...a].filter((x) => b.has(x)).length; const union = new Set([...a, ...b]).size || 1;
    return { ...subject, confidence: intersection / union };
  }).sort((a, b) => b.confidence - a.confidence);
  const best = scored[0]; return best && best.confidence >= 0.72 ? best : null;
}
