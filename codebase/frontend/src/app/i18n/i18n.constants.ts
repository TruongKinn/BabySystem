import { LanguageCode } from './language.model';

export const LANGUAGE_STORAGE_KEY = 'atg_lang';
export const DEFAULT_LANGUAGE: LanguageCode = 'vi';
export const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: LanguageCode; label: string; shortLabel: string }> = [
  { code: 'vi', label: 'Vietnamese', shortLabel: 'VI' },
  { code: 'en', label: 'English', shortLabel: 'EN' }
];
