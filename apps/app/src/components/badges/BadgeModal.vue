<script setup lang="ts">
import type { Badge } from '@/composables/useBadges';
import { useBadges } from '@/composables/useBadges';
import { computed } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import {
  Trophy,
  GraduationCap,
  Flame,
  HelpCircle,
  Flag,
  Star,
  Lock,
  X,
  Calendar,
  Target,
} from 'lucide-vue-next';

interface Props {
  badge: Badge | null;
  open: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const { getRarityColor, getRarityBgColor, getRarityTextColor, formatEarnedDate } = useBadges();

const isEarned = computed(() => props.badge?.earnedAt !== null);

const categoryIcon = computed(() => {
  if (!props.badge) return Trophy;
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

const categoryLabel = computed(() => {
  if (!props.badge) return '';
  const labels: Record<string, string> = {
    course: 'Course Achievement',
    streak: 'Streak Achievement',
    quiz: 'Quiz Achievement',
    milestone: 'Milestone Achievement',
    special: 'Special Achievement',
  };
  return labels[props.badge.category] || 'Achievement';
});

const rarityLabel = computed(() => {
  if (!props.badge) return '';
  return props.badge.rarity.charAt(0).toUpperCase() + props.badge.rarity.slice(1);
});

function handleOpenChange(value: boolean) {
  emit('update:open', value);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <template v-if="badge">
          <!-- Close button -->
          <DialogClose
            class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X class="h-4 w-4" />
            <span class="sr-only">Close</span>
          </DialogClose>

          <!-- Badge icon -->
          <div class="flex flex-col items-center text-center mb-6">
            <div
              class="relative flex items-center justify-center rounded-full h-24 w-24 ring-4 ring-offset-4 mb-4"
              :class="[
                isEarned ? `bg-gradient-to-br ${getRarityColor(badge.rarity)}` : 'bg-gray-200',
                isEarned ? `ring-${badge.rarity === 'legendary' ? 'yellow' : badge.rarity === 'epic' ? 'purple' : badge.rarity === 'rare' ? 'blue' : badge.rarity === 'uncommon' ? 'green' : 'gray'}-400` : 'ring-gray-300',
              ]"
            >
              <component
                :is="categoryIcon"
                class="h-12 w-12"
                :class="isEarned ? 'text-white' : 'text-gray-400'"
              />
              <div
                v-if="!isEarned"
                class="absolute inset-0 flex items-center justify-center rounded-full bg-black/20"
              >
                <Lock class="h-6 w-6 text-white" />
              </div>
            </div>

            <!-- Rarity badge -->
            <span
              class="px-3 py-1 rounded-full text-xs font-medium mb-2"
              :class="[getRarityBgColor(badge.rarity), getRarityTextColor(badge.rarity)]"
            >
              {{ rarityLabel }}
            </span>

            <DialogTitle class="text-xl font-semibold">
              {{ badge.name }}
            </DialogTitle>

            <DialogDescription class="text-muted-foreground mt-1">
              {{ badge.description }}
            </DialogDescription>
          </div>

          <!-- Badge info -->
          <div class="space-y-3">
            <!-- Category -->
            <div class="flex items-center gap-3 text-sm">
              <div class="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <component :is="categoryIcon" class="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-muted-foreground text-xs">Category</p>
                <p class="font-medium">{{ categoryLabel }}</p>
              </div>
            </div>

            <!-- Earned date or progress -->
            <div v-if="isEarned" class="flex items-center gap-3 text-sm">
              <div class="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <Calendar class="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-muted-foreground text-xs">Earned</p>
                <p class="font-medium">{{ formatEarnedDate(badge.earnedAt!) }}</p>
              </div>
            </div>

            <div v-else class="flex items-center gap-3 text-sm">
              <div class="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <Target class="h-4 w-4 text-muted-foreground" />
              </div>
              <div class="flex-1">
                <p class="text-muted-foreground text-xs">Progress</p>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full transition-all"
                      :style="{ width: `${badge.progress || 0}%` }"
                    />
                  </div>
                  <span class="font-medium text-xs">{{ badge.progress || 0 }}%</span>
                </div>
                <p v-if="badge.requirement" class="text-xs text-muted-foreground mt-1">
                  {{ badge.requirement }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
