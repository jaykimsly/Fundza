import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return NextResponse.json(
      { authenticated: !!user },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
