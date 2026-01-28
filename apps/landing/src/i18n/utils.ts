/**
 * i18n utilities for Astro landing page
 */

import { translations, defaultLang, type TranslationKey } from './translations';

type Lang = keyof typeof translations;

/**
 * Get the current language from URL or default
 */
export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) {
    return lang as Lang;
  }
  return defaultLang;
}

/**
 * Get translation function for a specific language
 */
export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = translations[lang][key] ?? translations[defaultLang][key] ?? key;

    // Handle string type
    if (typeof text !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = (text as string).replace(`{${k}}`, String(v));
      });
    }

    return text;
  };
}

/**
 * Get raw translation value (for arrays)
 */
export function getTranslation(lang: Lang, key: TranslationKey): string | string[] {
  const value = translations[lang][key] ?? translations[defaultLang][key];
  return value as string | string[];
}

/**
 * Get translated route path
 */
export function getLocalizedPath(path: string, lang: Lang): string {
  if (lang === defaultLang) {
    return path;
  }
  return `/${lang}${path}`;
}

/**
 * Get all localized paths for a given path (for language switcher)
 */
export function getAlternateLinks(path: string): Array<{ lang: Lang; href: string }> {
  return Object.keys(translations).map((lang) => ({
    lang: lang as Lang,
    href: getLocalizedPath(path, lang as Lang),
  }));
}

export { defaultLang, translations, type Lang };
