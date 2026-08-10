export const LEGAL_VERSION = '1.0';

export const LEGAL_EFFECTIVE_DATE = '10 August 2026';

export const LEGAL_DOCUMENTS = {
  terms: {
    type: 'terms',
    title: 'Fundza Terms & Conditions',
    version: LEGAL_VERSION,
  },
  privacy: {
    type: 'privacy',
    title: 'Fundza Privacy Notice',
    version: LEGAL_VERSION,
  },
  copyright: {
    type: 'copyright',
    title: 'Fundza Copyright Notice',
    version: LEGAL_VERSION,
  },
} as const;
