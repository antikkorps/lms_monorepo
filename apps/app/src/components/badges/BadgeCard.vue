<script setup lang="ts">
import type { Badge } from '@/composables/useBadges';
import { computed } from 'vue';
import {
  Trophy,
  GraduationCap,
  Flame,
  HelpCircle,
  Flag,
  Star,
  Lock,
} from 'lucide-vue-next';

interface Props {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showDetails: true,
});

const emit = defineEmits<{
  (e: 'click', badge: Badge): void;
}>();

const isEarned = computed(() => props.badge.earnedAt !== null);

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        container: 'p-2',
        icon: 'h-8 w-8',
        iconWrapper: 'h-12 w-12',
        title: 'text-xs',
        desc: 'text-[10px]',
      };
    case 'lg':
      return {
        container: 'p-4',
        icon: 'h-12 w-12',
        iconWrapper: 'h-20 w-20',
        title: 'text-base',
        desc: 'text-sm',
      };
    default:
      return {
        container: 'p-3',
        icon: 'h-8 w-8',
        iconWrapper: 'h-16 w-16',
        title: 'text-sm',
        desc: 'text-xs',
      };
  }
});

function getRarityGradient(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'from-gray-400 to-gray-500';
    case 'uncommon':
      return 'from-green-400 to-green-600';
    case 'rare':
      return 'from-blue-400 to-blue-600';
    case 'epic':
      return 'from-purple-400 to-purple-600';
    case 'legendary':
      return 'from-yellow-400 via-orange-400 to-red-400';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

function getRarityBorder(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'ring-gray-300';
    case 'uncommon':
      return 'ring-green-400';
    case 'rare':
      return 'ring-blue-400';
    case 'epic':
      return 'ring-purple-400';
    case 'legendary':
      return 'ring-yellow-400';
    default:
      return 'ring-gray-300';
  }
}

const categoryIcon = computed(() => {
  switch (props.badge.category) {
    case 'course':
      return GraduationCap;
    case 'streak':
      return Flame;
    case 'quiz':
      return HelpCircle;
    case 'milestone':
      return Flag;
    case 'special':
      return Star;
    default:
      return Trophy;
  }
});

function handleClick() {
  emit('click', props.badge);
}
</script>

<template>
  <button
    type="button"
    class="group flex flex-col items-center text-center transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
    :class="[sizeClasses.container, !isEarned && 'opacity-60']"
    @click="handleClick"
  >
    <!-- Badge Icon -->
    <div
      class="relative flex items-center justify-center rounded-full ring-2 ring-offset-2 transition-shadow group-hover:ring-4"
      :class="[
        sizeClasses.iconWrapper,
        isEarned ? `bg-gradient-to-br ${getRarityGradient(badge.rarity)}` : 'bg-gray-200',
        isEarned ? getRarityBorder(badge.rarity) : 'ring-gray-300',
      ]"
    >
      <!-- Category Icon -->
      <component
        :is="categoryIcon"
        :class="[sizeClasses.icon, isEarned ? 'text-white' : 'text-gray-400']"
      />

      <!-- Lock overlay for unearned -->
      <div
        v-if="!isEarned"
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/20"
      >
        <Lock class="h-4 w-4 text-white" />
      </div>

      <!-- Progress ring for locked badges -->
      <svg
        v-if="!isEarned && badge.progress"
        class="absolute inset-0 -rotate-90"
        :viewBox="`0 0 ${parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 4} ${parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 4}`"
      >
        <circle
          class="text-gray-300"
          stroke="currentColor"
          stroke-width="3"
          fill="transparent"
          :r="parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2 - 4"
          :cx="parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2"
          :cy="parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2"
        />
        <circle
          class="text-primary"
          stroke="currentColor"
          stroke-width="3"
          fill="transparent"
          stroke-linecap="round"
          :r="parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2 - 4"
          :cx="parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2"
          :cy="parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2"
          :stroke-dasharray="`${(badge.progress / 100) * 2 * Math.PI * (parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2 - 4)} ${2 * Math.PI * (parseInt(sizeClasses.iconWrapper.split(' ')[0].replace('h-', '')) * 2 - 4)}`"
        />
      </svg>
    </div>

    <!-- Badge Details -->
    <div v-if="showDetails" class="mt-2 max-w-[100px]">
      <p class="font-medium truncate" :class="sizeClasses.title">
        {{ badge.name }}
      </p>
      <p v-if="!isEarned && badge.requirement" class="text-muted-foreground" :class="sizeClasses.desc">
        {{ badge.requirement }}
      </p>
    </div>
  </button>
</template>
