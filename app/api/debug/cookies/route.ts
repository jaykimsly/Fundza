import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookies: allCookies.map((cookie) => ({
      name: cookie.name,
      hasValue: Boolean(cookie.value),
      valueLength: cookie.value?.length ?? 0,
    })),
    supabaseCookies: allCookies
      .filter((cookie) => cookie.name.startsWith('sb-'))
      .map((cookie) => ({
        name: cookie.name,
        hasValue: Boolean(cookie.value),
        valueLength: cookie.value?.length ?? 0,
      })),
  });
}
