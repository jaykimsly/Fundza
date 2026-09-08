import { fetchDbeSourcePage, extractDbeLinks, DBE_PAST_PAPERS_INDEX } from '@/lib/exams/dbe';

function authorised(request: Request) {
  const configured = process.env.EXAMS_INGEST_KEY;
  const supplied = request.headers.get('x-fundza-ingest-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(configured && supplied && supplied === configured);
}

export async function GET(request: Request) {
  try {
    if (!authorised(request)) return Response.json({ error: 'Not authorised' }, { status: 401 });
    const url = new URL(request.url).searchParams.get('url') || DBE_PAST_PAPERS_INDEX;
    if (!url.startsWith('https://www.education.gov.za/')) return Response.json({ error: 'Only the official DBE source is supported' }, { status: 400 });
    const html = await fetchDbeSourcePage(url);
    return Response.json({ source: 'DBE', url, links: extractDbeLinks(html) });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unable to read DBE source' }, { status: 500 });
  }
}
