import type { en } from './en';

export type Locale = 'en' | 'ar' | 'es';

export type TranslationKey = keyof typeof en;

/** Strict catalog contract: all keys in `en` MUST exist in `ar` and `es` */
export type TranslationCatalog = Record<TranslationKey, string>;

export type TranslationParams = Record<string, string | number>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
}
