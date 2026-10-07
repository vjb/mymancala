import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { en } from './en';
import { ar } from './ar';
import { es } from './es';
import { Locale, TranslationKey, TranslationCatalog, TranslationParams, I18nContextValue } from './types';

const CATALOGS: Record<Locale, TranslationCatalog> = { en, ar, es };

const I18nContext = createContext<I18nContextValue | null>(null);

export const LANG_STORAGE_KEY = 'mancala_lang_v1';

function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as Locale;
    if (saved && (saved === 'en' || saved === 'ar' || saved === 'es')) return saved;
  } catch {}

  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('ar')) return 'ar';
    if (lang.startsWith('es')) return 'es';
  }
  return 'en';
}

export function formatTranslation(
  locale: Locale,
  key: string,
  params?: TranslationParams
): string {
  const catalog = CATALOGS[locale] || en;
  let template: string | undefined;

  // Pluralization handling using Intl.PluralRules
  if (params && typeof params.count === 'number') {
    try {
      const pluralRules = new Intl.PluralRules(locale);
      const category = pluralRules.select(params.count); // zero, one, two, few, many, other
      const pluralKey = `${key}_${category}` as TranslationKey;
      const fallbackPlural = `${key}_other` as TranslationKey;
      template = catalog[pluralKey] || catalog[fallbackPlural] || catalog[key as TranslationKey] || en[pluralKey] || en[fallbackPlural];
    } catch {
      template = catalog[key as TranslationKey];
    }
  }

  if (!template) {
    template = catalog[key as TranslationKey] || en[key as TranslationKey] || key;
  }

  if (!params) return template;

  // String interpolation with Intl number formatting
  const numFormatter = new Intl.NumberFormat(locale);
  return template.replace(/{(\w+)}/g, (match, paramName) => {
    if (paramName in params) {
      const val = params[paramName];
      return typeof val === 'number' ? numFormatter.format(val) : String(val);
    }
    return match;
  });
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, newLocale);
    } catch {}
  }, []);

  // Synchronize document direction and language attributes
  useEffect(() => {
    const isRtl = locale === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: TranslationKey, params?: TranslationParams): string => {
    return formatTranslation(locale, key, params);
  }, [locale]);

  const value: I18nContextValue = useMemo(() => ({
    locale,
    setLocale,
    t,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    isRtl: locale === 'ar'
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}

export const useT = useTranslation;
