import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'student-identity';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_DIMENSION = 320;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function jsonError(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }

function readPngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24 || new TextDecoder().decode(bytes.slice(1, 4)) !== 'PNG') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readWebpDimensions(bytes: Uint8Array) {
  if (bytes.length < 30) return null;
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== 'RIFF' || new TextDecoder().decode(bytes.slice(8, 12)) !== 'WEBP') return null;
  if (new TextDecoder().decode(bytes.slice(12, 16)) !== 'VP8X') return null;
  return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
}

function readJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    const isSof = marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf;
    if (isSof && length >= 7) return { height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] };
    offset += length;
  }
  return null;
}

function validateDimensions(type: string, bytes: Uint8Array) {
  const dimensions = type === 'image/png' ? readPngDimensions(bytes) : type === 'image/webp' ? readWebpDimensions(bytes) : readJpegDimensions(bytes);
  return Boolean(dimensions && dimensions.width >= MIN_DIMENSION && dimensions.height >= MIN_DIMENSION);
}

async function getStudent(supabase: Awaited<ReturnType<typeof getSupabaseServer>>, userId: string) {
  const { data, error } = await supabase.from('students').select('id').eq('auth_user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET() {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError('Authentication required.', 401);
    const student = await getStudent(supabase, user.id);
    if (!student) return jsonError('Complete your Fundza profile before saving identity photos.', 409);

    const { data, error } = await supabase.from('student_identity_photos').select('photo_one_path, photo_two_path, updated_at').eq('student_id', student.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ identity: null });

    const admin = getSupabaseAdmin();
    const { data: signed, error: signedError } = await admin.storage.from(BUCKET).createSignedUrls([data.photo_one_path, data.photo_two_path], 60 * 60);
    if (signedError) throw signedError;
    return NextResponse.json({ identity: { photoOneUrl: signed[0]?.signedUrl ?? null, photoTwoUrl: signed[1]?.signedUrl ?? null, updatedAt: data.updated_at } });
  } catch (error) {
    console.error('identity GET failed', error);
    return jsonError('Unable to load your identity photos.', 500);
  }
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError('Authentication required.', 401);
    const student = await getStudent(supabase, user.id);
    if (!student) return jsonError('Complete your Fundza profile before saving identity photos.', 409);

    const form = await request.formData();
    const photoOne = form.get('photoOne');
    const photoTwo = form.get('photoTwo');
    if (!(photoOne instanceof File) || !(photoTwo instanceof File)) return jsonError('Both identity photos are required.', 400);
    const files: [File, File] = [photoOne, photoTwo];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) return jsonError('Only JPEG, PNG, and WebP images are supported.', 400);
      if (file.size === 0 || file.size > MAX_FILE_SIZE) return jsonError('Each image must be between 1 byte and 10 MB.', 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validateDimensions(file.type, bytes)) return jsonError('Each image must be at least 320 × 320px and readable.', 400);
    }

    const admin = getSupabaseAdmin();
    const timestamp = Date.now();
    const newPaths = files.map((file, index) => `${user.id}/${timestamp}-${index + 1}.${file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'}`);

    for (let index = 0; index < files.length; index += 1) {
      const { error } = await admin.storage.from(BUCKET).upload(newPaths[index], files[index], { contentType: files[index].type, cacheControl: '3600', upsert: false });
      if (error) throw error;
      uploadedPaths.push(newPaths[index]);
    }

    const { data: previous } = await supabase.from('student_identity_photos').select('photo_one_path, photo_two_path').eq('student_id', student.id).maybeSingle();
    const { error: saveError } = await supabase.from('student_identity_photos').upsert({ student_id: student.id, photo_one_path: newPaths[0], photo_two_path: newPaths[1], updated_at: new Date().toISOString() }, { onConflict: 'student_id' });
    if (saveError) throw saveError;

    const oldPaths = previous ? [previous.photo_one_path, previous.photo_two_path].filter(Boolean) : [];
    if (oldPaths.length) await admin.storage.from(BUCKET).remove(oldPaths);

    const { data: signed, error: signedError } = await admin.storage.from(BUCKET).createSignedUrls(newPaths, 60 * 60);
    if (signedError) throw signedError;
    return NextResponse.json({ identity: { photoOneUrl: signed[0]?.signedUrl ?? null, photoTwoUrl: signed[1]?.signedUrl ?? null } }, { status: 201 });
  } catch (error) {
    console.error('identity POST failed', error);
    if (uploadedPaths.length) {
      try { await getSupabaseAdmin().storage.from(BUCKET).remove(uploadedPaths); } catch (cleanupError) { console.error('identity cleanup failed', cleanupError); }
    }
    return jsonError('Unable to save your identity photos. Please try again.', 500);
  }
}
