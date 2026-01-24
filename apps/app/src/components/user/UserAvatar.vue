<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAvatar, type AvatarStyle } from '@/composables/useAvatar';
import type { HTMLAttributes } from 'vue';

interface Props {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  style?: AvatarStyle;
  variation?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();

// Use global preference if no style/variation is explicitly provided
const { avatarUrl: generatedAvatarUrl, globalAvatarStyle, globalAvatarVariation } = useAvatar(
  () => props.userId,
  () => props.firstName,
  () => props.lastName,
  () => props.avatarUrl,
  () => props.style ?? globalAvatarStyle.value,
  () => props.variation ?? globalAvatarVariation.value,
);

const imageLoaded = ref(false);
const imageError = ref(false);

// Reset image state when URL changes
watch(generatedAvatarUrl, () => {
  imageLoaded.value = false;
  imageError.value = false;
});

const initials = computed(() => {
  const first = props.firstName?.charAt(0) || '';
  const last = props.lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
});

const sizeClass = computed(() => {
  const size = props.size ?? 'md';
  switch (size) {
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

function onImageLoad() {
  imageLoaded.value = true;
  imageError.value = false;
}

function onImageError() {
  imageError.value = true;
  imageLoaded.value = false;
}
</script>

<template>
  <Avatar :class="[sizeClass, props.class]">
    <img
      v-show="imageLoaded && !imageError"
      :src="generatedAvatarUrl"
      :alt="`${firstName} ${lastName}`"
      class="aspect-square size-full object-cover"
      @load="onImageLoad"
      @error="onImageError"
    />
    <AvatarFallback v-show="!imageLoaded || imageError">{{ initials }}</AvatarFallback>
  </Avatar>
</template>
