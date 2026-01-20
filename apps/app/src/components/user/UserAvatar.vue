<script setup lang="ts">
import { computed } from 'vue';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAvatar, type AvatarStyle } from '@/composables/useAvatar';
import type { HTMLAttributes } from 'vue';

interface Props {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  style?: AvatarStyle;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  style: 'initials',
  size: 'md',
});

const { avatarUrl: generatedAvatarUrl } = useAvatar(
  () => props.userId,
  () => props.firstName,
  () => props.lastName,
  () => props.avatarUrl,
  props.style,
);

const initials = computed(() => {
  const first = props.firstName?.charAt(0) || '';
  const last = props.lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'h-6 w-6 text-xs';
    case 'sm':
      return 'h-8 w-8 text-sm';
    case 'md':
      return 'h-10 w-10 text-base';
    case 'lg':
      return 'h-12 w-12 text-lg';
    case 'xl':
      return 'h-16 w-16 text-xl';
    default:
      return 'h-10 w-10 text-base';
  }
});
</script>

<template>
  <Avatar :class="[sizeClass, props.class]">
    <AvatarImage :src="generatedAvatarUrl" :alt="`${firstName} ${lastName}`" />
    <AvatarFallback>{{ initials }}</AvatarFallback>
  </Avatar>
</template>
