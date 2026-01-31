/**
 * Locale Composable
 * Easy access to i18n functionality with backend sync
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  setLocale,
  getCurrentLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/locales';
import { apiClient } from './useApi';
import { useAuthStore } from '@/stores/auth';

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
  const authStore = useAuthStore();

  const currentLocale = computed(() => getCurrentLocale());

  const currentLocaleOption = computed(() =>
    LOCALE_OPTIONS.find((l) => l.code === currentLocale.value) || LOCALE_OPTIONS[0]
  );

  const otherLocales = computed(() =>
    LOCALE_OPTIONS.filter((l) => l.code !== currentLocale.value)
  );

  /**
   * Change locale and sync with backend if authenticated
   */
  async function changeLocale(newLocale: SupportedLocale): Promise<void> {
    if (newLocale !== currentLocale.value) {
      // Update frontend locale
      await setLocale(newLocale);

      // Sync with backend if user is authenticated
      if (authStore.isAuthenticated) {
        try {
          await apiClient.patch('/auth/me/locale', { locale: newLocale });
        } catch (error) {
          // Log but don't fail - local locale change is more important
          console.warn('[useLocale] Failed to sync locale with backend:', error);
        }
      }
    }
  }

  /**
   * Sync frontend locale from user's backend preference
   * Call this after login or when user data is loaded
   */
  async function syncFromUser(): Promise<void> {
    const userLocale = authStore.user?.locale as SupportedLocale | undefined;
    if (userLocale && SUPPORTED_LOCALES.includes(userLocale) && userLocale !== currentLocale.value) {
      await setLocale(userLocale);
    }
  }

  /**
   * Sync backend with current frontend locale
   * Call this after login when frontend locale should take precedence
   */
  async function syncToBackend(): Promise<void> {
    if (authStore.isAuthenticated && currentLocale.value) {
      try {
        await apiClient.patch('/auth/me/locale', { locale: currentLocale.value });
      } catch (error) {
        console.warn('[useLocale] Failed to sync locale to backend:', error);
      }
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
    syncFromUser,
    syncToBackend,
  };
}
