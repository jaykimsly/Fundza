export const DBE_PAST_PAPERS_INDEX = 'https://www.education.gov.za/Examinations/NSCPastExaminationpapers/tabid/593/Default.aspx';

const SUBJECT_ALIASES: Record<string, string> = {
  accounting: 'ACCOUNT',
  'agricultural sciences': 'AGRI_SCI',
  'business studies': 'BUS',
  'computer application technology': 'CAT',
  'computer applications technology': 'CAT',
  'consumer studies': 'CONSUMER',
  economics: 'ECON',
  geography: 'GEO',
  history: 'HISTORY',
  'information technology': 'IT',
  'life sciences': 'LIFE_SCI',
  'mathematical literacy': 'MATH_LIT',
  mathematics: 'MATH',
  'physical sciences': 'PHY_SCI',
};

export function subjectCodeForDbeTitle(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (const [name, code] of Object.entries(SUBJECT_ALIASES)) {
    if (normalized.includes(name)) return code;
  }
  if (normalized.includes('english hl') || normalized.includes('english home language')) return 'ENG_HL';
  if (normalized.includes('english fal') || normalized.includes('english first additional')) return 'ENG_FAL';
  if (normalized.includes('afrikaans hl') || normalized.includes('afrikaans home language')) return 'AFR_HL';
  if (normalized.includes('afrikaans fal') || normalized.includes('afrikaans first additional')) return 'AFR_FAL';
  return null;
}

export function dbeSession(year: number, label: string) {
  const text = label.toLowerCase();
  if (text.includes('may/june') || text.includes('may june')) return { examType: 'NSC/SC', session: 'may-june' };
  if (text.includes('november')) return { examType: 'NSC', session: 'november' };
  return { examType: 'NSC', session: `other-${year}` };
}

export async function fetchDbeSourcePage(url = DBE_PAST_PAPERS_INDEX) {
  const response = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'Fundza exam ingestion/1.0' } });
  if (!response.ok) throw new Error(`DBE source returned ${response.status}`);
  return response.text();
}

export function extractDbeLinks(html: string) {
  const links: { title: string; url: string }[] = [];
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!url || !title || !/download/i.test(title)) continue;
    links.push({ title, url: new URL(url, DBE_PAST_PAPERS_INDEX).toString() });
  }
  return links;
}
