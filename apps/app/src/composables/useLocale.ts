/**
 * Locale Composable
 * Easy access to i18n functionality
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  setLocale,
  getCurrentLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/locales';

export interface LocaleOption {
  code: SupportedLocale;
  name: string;
  flag: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export function useLocale() {
  const { t, locale } = useI18n();

  const currentLocale = computed(() => getCurrentLocale());

  const currentLocaleOption = computed(() =>
    LOCALE_OPTIONS.find((l) => l.code === currentLocale.value) || LOCALE_OPTIONS[0]
  );

  const otherLocales = computed(() =>
    LOCALE_OPTIONS.filter((l) => l.code !== currentLocale.value)
  );

  async function changeLocale(newLocale: SupportedLocale): Promise<void> {
    if (newLocale !== currentLocale.value) {
      await setLocale(newLocale);
    }
  }

  return {
    t,
    locale,
    currentLocale,
    currentLocaleOption,
    otherLocales,
    localeOptions: LOCALE_OPTIONS,
    supportedLocales: SUPPORTED_LOCALES,
    changeLocale,
  };
}
