import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const BUCKET = 'question-papers';

function fail(error: string, code: string, status = 400) {
  return NextResponse.json({ success: false, error, code }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Please sign in before sharing a question paper.', 'AUTH_REQUIRED', 401);

  const form = await request.formData().catch(() => null);
  if (!form) return fail('The upload request could not be read.', 'INVALID_REQUEST');

  const file = form.get('file');
  const grade = Number(form.get('grade'));
  const year = Number(form.get('year'));
  const examType = String(form.get('examType') || '').trim();
  const subjectId = String(form.get('subjectId') || '').trim();
  const province = String(form.get('province') || '').trim() || null;

  if (!(file instanceof File)) return fail('Choose a PDF or supported image first.', 'FILE_REQUIRED');
  if (!Number.isInteger(grade) || ![10, 11, 12].includes(grade)) return fail('Choose Grade 10, 11 or 12.', 'INVALID_GRADE');
  if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() + 1) return fail('Enter a valid paper year.', 'INVALID_YEAR');
  if (!examType) return fail('Select the examination type.', 'INVALID_EXAM_TYPE');
  if (!ALLOWED.has(file.type)) return fail('Only PDF, JPG, PNG and WEBP files are supported.', 'UNSUPPORTED_FILE');
  if (file.size > MAX_FILE_SIZE) return fail('Question papers must be 25MB or smaller.', 'FILE_TOO_LARGE', 413);

  if (subjectId) {
    const { data: subject } = await supabase.from('subjects_catalog').select('id').eq('id', subjectId).maybeSingle();
    if (!subject) return fail('The selected subject could not be verified.', 'INVALID_SUBJECT');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const { data: duplicate } = await supabase.from('papers').select('id,visibility,sharing_status,review_status').eq('content_hash', contentHash).limit(1).maybeSingle();
  if (duplicate) return NextResponse.json({ success: true, duplicate: true, paper: duplicate });

  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '86400', upsert: false });
  if (uploadError) return fail('The question paper could not be stored securely.', 'STORAGE_UPLOAD_FAILED', 502);

  const { data: paper, error: insertError } = await supabase.from('papers').insert({
    uploaded_by: user.id,
    grade_id: null,
    subject_id: subjectId || null,
    year,
    exam_type: examType,
    province,
    source_name: file.name,
    storage_path: path,
    content_hash: contentHash,
    extraction_status: 'pending',
    provenance_type: 'past_paper',
    verification_status: 'unverified',
    visibility: 'fundza',
    sharing_status: 'submitted',
    review_status: 'needs_review',
    copyright_status: 'unknown',
    reported: false,
    metadata: { mime_type: file.type, size: file.size, original_name: file.name },
  }).select('id,year,exam_type,source_name,sharing_status,review_status,verification_status,created_at').single();

  if (insertError || !paper) {
    await supabase.storage.from(BUCKET).remove([path]);
    return fail('The paper record could not be created.', 'PAPER_CREATE_FAILED', 500);
  }

  return NextResponse.json({ success: true, paper }, { status: 201 });
}
