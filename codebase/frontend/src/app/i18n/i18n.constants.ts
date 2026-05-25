import { LanguageCode } from './language.model';

export const LANGUAGE_STORAGE_KEY = 'atg_lang';
export const DEFAULT_LANGUAGE: LanguageCode = 'vi';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: ReadonlyArray<LanguageOption> = [
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', shortLabel: 'VI' },
  { code: 'en', label: 'English', nativeLabel: 'English', shortLabel: 'EN' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', shortLabel: 'JA' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', shortLabel: 'ZH' }
];
