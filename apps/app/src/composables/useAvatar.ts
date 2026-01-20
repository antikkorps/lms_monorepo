/**
 * Avatar Composable
 * Generates DiceBear avatar URLs for users
 */

import { computed, type MaybeRef, toValue } from 'vue';

export type AvatarStyle =
  | 'avataaars'
  | 'bottts'
  | 'initials'
  | 'lorelei'
  | 'notionists'
  | 'personas'
  | 'thumbs'
  | 'shapes';

export interface AvatarOptions {
  seed: string;
  style?: AvatarStyle;
  size?: number;
  backgroundColor?: string;
  radius?: number;
}

const DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x';

/**
 * Generate a DiceBear avatar URL
 */
export function generateAvatarUrl(options: AvatarOptions): string {
  const { seed, style = 'initials', size = 128, backgroundColor, radius } = options;

  const params = new URLSearchParams();
  params.set('seed', seed);

  if (size) {
    params.set('size', size.toString());
  }

  if (backgroundColor) {
    params.set('backgroundColor', backgroundColor);
  }

  if (radius !== undefined) {
    params.set('radius', radius.toString());
  }

  return `${DICEBEAR_BASE_URL}/${style}/svg?${params.toString()}`;
}

/**
 * Generate avatar URL from user info
 */
export function getUserAvatarUrl(
  userId: string,
  firstName?: string,
  lastName?: string,
  style: AvatarStyle = 'initials',
): string {
  // For initials style, use the name as seed for better readability
  const seed = style === 'initials'
    ? `${firstName || ''} ${lastName || ''}`.trim() || userId
    : userId;

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
  style: AvatarStyle = 'initials',
) {
  const avatarUrl = computed(() => {
    const url = toValue(customUrl);
    if (url) return url;

    const id = toValue(userId);
    const first = toValue(firstName);
    const last = toValue(lastName);

    return getUserAvatarUrl(id, first, last, style);
  });

  const initialsUrl = computed(() => {
    const id = toValue(userId);
    const first = toValue(firstName);
    const last = toValue(lastName);
    return getUserAvatarUrl(id, first, last, 'initials');
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
  };
}
