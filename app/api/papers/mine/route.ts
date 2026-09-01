import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Please sign in.' }, { status: 401 });

  const { data, error } = await supabase.from('papers')
    .select('id,year,exam_type,province,source_name,storage_path,visibility,sharing_status,review_status,verification_status,created_at,updated_at,page_count,is_immutable')
    .eq('uploaded_by', user.id)
    .gte('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: 'Your recent uploads could not be loaded.' }, { status: 500 });
  return NextResponse.json({ success: true, papers: data || [] });
}
