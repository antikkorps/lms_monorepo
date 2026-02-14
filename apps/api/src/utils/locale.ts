/**
 * Locale Utilities
 * Helper functions for handling multilingual content
 */

import type { Lesson } from '../database/models/index.js';
import { SupportedLocale } from '../database/models/enums.js';

export const DEFAULT_LOCALE = SupportedLocale.EN;
export const SUPPORTED_LOCALES = Object.values(SupportedLocale);

/**
 * Get localized content for a lesson
 * Falls back to lesson default fields if locale content is not available
 */
export interface LocalizedLessonData {
  title: string;
  videoUrl: string | null;
  videoId: string | null;
  transcript: string | null;
  description: string | null;
  videoPlaybackUrl: string | null;
  videoThumbnailUrl: string | null;
  transcodingStatus: string | null;
}

export function getLocalizedLessonContent(
  lesson: Lesson,
  locale: SupportedLocale = DEFAULT_LOCALE
): LocalizedLessonData {
  // Find content for requested locale
  const content = lesson.contents?.find((c) => c.lang === locale);

  // Find content for default locale as secondary fallback
  const defaultContent =
    locale !== DEFAULT_LOCALE
      ? lesson.contents?.find((c) => c.lang === DEFAULT_LOCALE)
      : null;

  return {
    // Title: prefer locale content, then default locale content, then lesson.title
    title: content?.title || defaultContent?.title || lesson.title,

    // VideoUrl: prefer locale content, then default locale content, then lesson.videoUrl
    videoUrl: content?.videoUrl || defaultContent?.videoUrl || lesson.videoUrl || null,

    // VideoId: prefer locale content, then default locale content, then lesson.videoId
    videoId: content?.videoId || defaultContent?.videoId || lesson.videoId || null,

    // Transcript: only from content (no fallback in Lesson model)
    transcript: content?.transcript || defaultContent?.transcript || null,

    // Description: only from content (no fallback in Lesson model)
    description: content?.description || defaultContent?.description || null,

    // Transcoding fields: only from content (no fallback in Lesson model)
    videoPlaybackUrl: content?.videoPlaybackUrl || defaultContent?.videoPlaybackUrl || null,
    videoThumbnailUrl: content?.videoThumbnailUrl || defaultContent?.videoThumbnailUrl || null,
    transcodingStatus: content?.transcodingStatus || defaultContent?.transcodingStatus || null,
  };
}

/**
 * Get locale from Accept-Language header or query parameter
 */
export function parseLocaleFromRequest(
  acceptLanguage?: string,
  queryLang?: string
): SupportedLocale {
  // Query parameter takes precedence
  if (queryLang && SUPPORTED_LOCALES.includes(queryLang as SupportedLocale)) {
    return queryLang as SupportedLocale;
  }

  // Parse Accept-Language header
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, q = '1'] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(), // Get base language code
          quality: parseFloat(q),
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const lang of languages) {
      if (SUPPORTED_LOCALES.includes(lang.code as SupportedLocale)) {
        return lang.code as SupportedLocale;
      }
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Check if a locale is supported
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
