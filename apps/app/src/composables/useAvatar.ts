/**
 * Avatar Composable
 * Generates DiceBear avatar URLs for users
 */

import { computed, ref, type MaybeRef, toValue } from 'vue';

export type AvatarStyle =
  | 'avataaars'
  | 'bottts'
  | 'initials'
  | 'lorelei'
  | 'notionists'
  | 'personas'
  | 'thumbs'
  | 'shapes'
  | 'bottts-alt'
  | 'thumbs-alt'
  | 'shapes-alt'
  | 'initials-alt';

// Style configurations with optional background colors
const STYLE_CONFIG: Record<string, { base: string; backgroundColor?: string }> = {
  'initials': { base: 'initials' },
  'initials-alt': { base: 'initials', backgroundColor: '6366f1' },
  'thumbs': { base: 'thumbs' },
  'thumbs-alt': { base: 'thumbs', backgroundColor: 'f59e0b' },
  'bottts': { base: 'bottts' },
  'bottts-alt': { base: 'bottts', backgroundColor: '10b981' },
  'shapes': { base: 'shapes' },
  'shapes-alt': { base: 'shapes', backgroundColor: 'ec4899' },
  'lorelei': { base: 'lorelei' },
  'notionists': { base: 'notionists' },
  'personas': { base: 'personas' },
  'avataaars': { base: 'avataaars' },
};

export interface AvatarOptions {
  seed: string;
  style?: AvatarStyle;
  size?: number;
  backgroundColor?: string;
  radius?: number;
}

const DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x';
const AVATAR_STYLE_KEY = 'lms-avatar-style';
const AVATAR_VARIATION_KEY = 'lms-avatar-variation';

// Global reactive state for avatar preferences
const globalAvatarStyle = ref<AvatarStyle>(
  (localStorage.getItem(AVATAR_STYLE_KEY) as AvatarStyle) || 'initials'
);
const globalAvatarVariation = ref<number>(
  parseInt(localStorage.getItem(AVATAR_VARIATION_KEY) || '0', 10)
);

/**
 * Get the global avatar style preference
 */
export function getAvatarStyle(): AvatarStyle {
  return globalAvatarStyle.value;
}

/**
 * Get the global avatar variation index
 */
export function getAvatarVariation(): number {
  return globalAvatarVariation.value;
}

/**
 * Set the global avatar style preference (persisted to localStorage)
 */
export function setAvatarStyle(style: AvatarStyle, variation: number = 0): void {
  globalAvatarStyle.value = style;
  globalAvatarVariation.value = variation;
  localStorage.setItem(AVATAR_STYLE_KEY, style);
  localStorage.setItem(AVATAR_VARIATION_KEY, variation.toString());
}

/**
 * Generate a DiceBear avatar URL
 */
export function generateAvatarUrl(options: AvatarOptions): string {
  const { seed, style = 'initials', size = 128, backgroundColor, radius } = options;

  // Get style configuration
  const config = STYLE_CONFIG[style] || { base: style };
  const baseStyle = config.base;
  const bgColor = backgroundColor || config.backgroundColor;

  const params = new URLSearchParams();
  params.set('seed', seed);

  if (size) {
    params.set('size', size.toString());
  }

  if (bgColor) {
    params.set('backgroundColor', bgColor);
  }

  if (radius !== undefined) {
    params.set('radius', radius.toString());
  }

  return `${DICEBEAR_BASE_URL}/${baseStyle}/svg?${params.toString()}`;
}

/**
 * Generate avatar URL from user info
 */
export function getUserAvatarUrl(
  userId: string,
  firstName?: string,
  lastName?: string,
  style: AvatarStyle = 'initials',
  variation: number = 0,
): string {
  // For initials style with variation 0, use the name as seed for better readability
  let seed: string;
  if (style.includes('initials') && variation === 0) {
    seed = `${firstName || ''} ${lastName || ''}`.trim() || userId;
  } else if (variation === 0) {
    seed = userId;
  } else {
    seed = `${userId}-v${variation}`;
  }

  return generateAvatarUrl({ seed, style });
}

/**
 * Composable for avatar generation
 */
export function useAvatar(
  userId: MaybeRef<string>,
  firstName?: MaybeRef<string | undefined>,
  lastName?: MaybeRef<string | undefined>,
  customUrl?: MaybeRef<string | null | undefined>,
  style: MaybeRef<AvatarStyle> = 'initials',
  variation: MaybeRef<number> = 0,
) {
  const avatarUrl = computed(() => {
    const url = toValue(customUrl);
    if (url) return url;

    const id = toValue(userId);
    const first = toValue(firstName);
    const last = toValue(lastName);
    const avatarStyle = toValue(style);
    const avatarVariation = toValue(variation);

    return getUserAvatarUrl(id, first, last, avatarStyle, avatarVariation);
  });

  const initialsUrl = computed(() => {
    const id = toValue(userId);
    const first = toValue(firstName);
    const last = toValue(lastName);
    return getUserAvatarUrl(id, first, last, 'initials', 0);
  });

  const funAvatarUrl = computed(() => {
    const id = toValue(userId);
    return generateAvatarUrl({ seed: id, style: 'lorelei' });
  });

  return {
    avatarUrl,
    initialsUrl,
    funAvatarUrl,
    generateAvatarUrl,
    getUserAvatarUrl,
    globalAvatarStyle,
    globalAvatarVariation,
    setAvatarStyle,
  };
}
