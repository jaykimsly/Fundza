import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id ?? null,
      error: error?.message ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({
      authenticated: false,
      userId: null,
      error: error?.message ?? 'Unknown server error',
    }, { status: 500 });
  }
}
