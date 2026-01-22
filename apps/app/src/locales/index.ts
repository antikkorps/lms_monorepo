/**
 * i18n Configuration
 * - Lazy loading of translation files
 * - Auto-detection of browser language
 * - Persistence of user preference
 */

import { createI18n } from 'vue-i18n';
import type { I18n } from 'vue-i18n';

// Supported locales
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Default locale
export const DEFAULT_LOCALE: SupportedLocale = 'en';

// Storage key for persisting locale preference
const LOCALE_STORAGE_KEY = 'lms-locale';

/**
 * Get the user's preferred locale
 * Priority: 1. Stored preference, 2. Browser language, 3. Default
 */
function getPreferredLocale(): SupportedLocale {
  // Check stored preference
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Load messages for a locale (lazy loading)
 */
async function loadLocaleMessages(locale: SupportedLocale): Promise<Record<string, unknown>> {
  const modules = {
    common: () => import(`./${locale}/common.json`),
    auth: () => import(`./${locale}/auth.json`),
    courses: () => import(`./${locale}/courses.json`),
    discussions: () => import(`./${locale}/discussions.json`),
    errors: () => import(`./${locale}/errors.json`),
    nav: () => import(`./${locale}/nav.json`),
  };

  const messages: Record<string, unknown> = {};

  await Promise.all(
    Object.entries(modules).map(async ([namespace, loader]) => {
      try {
        const module = await loader();
        messages[namespace] = module.default || module;
      } catch (error) {
        console.warn(`Failed to load ${namespace} translations for ${locale}`, error);
      }
    })
  );

  return messages;
}

// Create i18n instance (messages will be loaded on init)
export const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getPreferredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {},
  // Pluralization rules
  pluralizationRules: {
    fr: (choice: number) => {
      if (choice === 0 || choice === 1) return 0;
      return 1;
    },
  },
  // Missing key handler
  missing: (locale, key) => {
    console.warn(`Missing translation: [${locale}] ${key}`);
    return key;
  },
});

// Track loaded locales
const loadedLocales = new Set<SupportedLocale>([DEFAULT_LOCALE]);

/**
 * Set the active locale
 * Loads translations if not already loaded
 */
export async function setLocale(locale: SupportedLocale): Promise<void> {
  // Load messages if not already loaded
  if (!loadedLocales.has(locale)) {
    const messages = await loadLocaleMessages(locale);
    i18n.global.setLocaleMessage(locale, messages);
    loadedLocales.add(locale);
  }

  // Set locale
  i18n.global.locale.value = locale;

  // Persist preference
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);

  // Update HTML lang attribute
  document.documentElement.setAttribute('lang', locale);
}

/**
 * Get current locale
 */
export function getCurrentLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale;
}

/**
 * Initialize i18n (load default and user's preferred locale)
 */
export async function initI18n(): Promise<void> {
  // Always load default locale first
  const defaultMessages = await loadLocaleMessages(DEFAULT_LOCALE);
  i18n.global.setLocaleMessage(DEFAULT_LOCALE, defaultMessages);
  loadedLocales.add(DEFAULT_LOCALE);

  // Load and set preferred locale if different
  const preferredLocale = getPreferredLocale();
  if (preferredLocale !== DEFAULT_LOCALE) {
    await setLocale(preferredLocale);
  }

  document.documentElement.setAttribute('lang', preferredLocale);
}

export type { I18n };
