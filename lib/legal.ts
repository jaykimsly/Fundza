export const LEGAL_VERSION = '2026.08.26';
export const LEGAL_EFFECTIVE_DATE = '26 August 2026';

export const LEGAL_DOCUMENTS = {
  terms: { type: 'terms', title: 'Fundza Terms & Conditions', version: LEGAL_VERSION, href: '/terms' },
  privacy: { type: 'privacy', title: 'Fundza Privacy Notice', version: LEGAL_VERSION, href: '/privacy' },
  copyright: { type: 'copyright', title: 'Fundza Copyright Notice', version: LEGAL_VERSION, href: '/copyright' },
  legal: { type: 'legal', title: 'Fundza Legal Notice', version: LEGAL_VERSION, href: '/legal/notice' },
} as const;

export type LegalDocumentType = keyof typeof LEGAL_DOCUMENTS;
