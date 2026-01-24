<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { generateAvatarUrl, type AvatarStyle } from '@/composables/useAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Check, Pencil, ChevronLeft } from 'lucide-vue-next';

interface Props {
  userId: string;
  firstName?: string;
  lastName?: string;
  currentStyle?: AvatarStyle;
  currentVariation?: number;
}

const props = withDefaults(defineProps<Props>(), {
  currentStyle: 'initials',
  currentVariation: 0,
});

const emit = defineEmits<{
  (e: 'select', style: AvatarStyle, variation: number): void;
}>();

const { t } = useI18n();

const isOpen = ref(false);
const selectedStyleId = ref<string | null>(null);
const tempSelectedStyle = ref<AvatarStyle>(props.currentStyle);
const tempSelectedVariation = ref<number>(props.currentVariation);

// Avatar style categories
const avatarCategories = [
  {
    id: 'initials',
    label: 'Initiales',
    emoji: '🔤',
    styles: ['initials', 'initials-alt'] as AvatarStyle[],
    variations: 4,
  },
  {
    id: 'thumbs',
    label: 'Pouces',
    emoji: '👍',
    styles: ['thumbs', 'thumbs-alt'] as AvatarStyle[],
    variations: 6,
  },
  {
    id: 'bottts',
    label: 'Robots',
    emoji: '🤖',
    styles: ['bottts', 'bottts-alt'] as AvatarStyle[],
    variations: 8,
  },
  {
    id: 'shapes',
    label: 'Formes',
    emoji: '🔷',
    styles: ['shapes', 'shapes-alt'] as AvatarStyle[],
    variations: 8,
  },
  {
    id: 'avataaars',
    label: 'Cartoon',
    emoji: '😊',
    styles: ['avataaars'] as AvatarStyle[],
    variations: 8,
  },
  {
    id: 'lorelei',
    label: 'Lorelei',
    emoji: '🎨',
    styles: ['lorelei'] as AvatarStyle[],
    variations: 8,
  },
  {
    id: 'notionists',
    label: 'Notion',
    emoji: '✏️',
    styles: ['notionists'] as AvatarStyle[],
    variations: 8,
  },
  {
    id: 'personas',
    label: 'Persona',
    emoji: '👤',
    styles: ['personas'] as AvatarStyle[],
    variations: 8,
  },
];

const currentCategory = computed(() =>
  avatarCategories.find(c => c.id === selectedStyleId.value)
);

const seed = computed(() => {
  return props.firstName && props.lastName
    ? `${props.firstName} ${props.lastName}`
    : props.userId;
});

// Generate preview URL for a category (first style, first variation)
function getCategoryPreviewUrl(category: typeof avatarCategories[0]): string {
  const style = category.styles[0];
  return generateAvatarUrl({
    seed: style.includes('initials') ? seed.value : props.userId,
    style,
    size: 64,
  });
}

// Generate all variations for current category
const variations = computed(() => {
  if (!currentCategory.value) return [];

  const result: Array<{ style: AvatarStyle; variation: number; url: string }> = [];
  const category = currentCategory.value;

  // For each style in the category
  for (const style of category.styles) {
    // Generate variations
    for (let v = 0; v < category.variations; v++) {
      const varSeed = style.includes('initials') && v === 0
        ? seed.value
        : `${props.userId}-v${v}`;

      result.push({
        style,
        variation: v,
        url: generateAvatarUrl({
          seed: varSeed,
          style,
          size: 72,
        }),
      });
    }
  }

  return result;
});

// Get preview URL for selected avatar
function getPreviewUrl(): string {
  const varSeed = tempSelectedStyle.value.includes('initials') && tempSelectedVariation.value === 0
    ? seed.value
    : `${props.userId}-v${tempSelectedVariation.value}`;

  return generateAvatarUrl({
    seed: varSeed,
    style: tempSelectedStyle.value,
    size: 96,
  });
}

function selectCategory(categoryId: string) {
  selectedStyleId.value = categoryId;
  // Pre-select first variation
  const category = avatarCategories.find(c => c.id === categoryId);
  if (category) {
    tempSelectedStyle.value = category.styles[0];
    tempSelectedVariation.value = 0;
  }
}

function selectVariation(style: AvatarStyle, variation: number) {
  tempSelectedStyle.value = style;
  tempSelectedVariation.value = variation;
}

function goBack() {
  selectedStyleId.value = null;
}

function confirmSelection() {
  emit('select', tempSelectedStyle.value, tempSelectedVariation.value);
  isOpen.value = false;
}

function openDialog() {
  tempSelectedStyle.value = props.currentStyle;
  tempSelectedVariation.value = props.currentVariation;
  // Always start at category selection
  selectedStyleId.value = null;
  isOpen.value = true;
}

// Reset to category view when dialog closes
watch(isOpen, (open) => {
  if (!open) {
    selectedStyleId.value = null;
  }
});
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button variant="outline" size="sm" class="gap-2" @click="openDialog">
        <Pencil class="h-4 w-4" />
        {{ t('common.profile.changeAvatar') }}
      </Button>
    </DialogTrigger>
    <DialogContent class="max-h-[85vh] max-w-lg overflow-hidden p-0">
      <DialogHeader class="border-b px-4 py-3">
        <DialogTitle class="flex items-center gap-2">
          <button
            v-if="selectedStyleId"
            type="button"
            class="rounded p-1 hover:bg-muted"
            @click="goBack"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span v-if="selectedStyleId && currentCategory">
            {{ currentCategory.emoji }} {{ currentCategory.label }}
          </span>
          <span v-else>{{ t('common.profile.chooseAvatar') }}</span>
        </DialogTitle>
      </DialogHeader>

      <!-- Step 1: Choose category -->
      <div v-if="!selectedStyleId" class="p-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="category in avatarCategories"
            :key="category.id"
            type="button"
            class="group flex flex-col items-center gap-2 rounded-xl border-2 border-transparent p-3 transition-all hover:border-primary/30 hover:bg-muted/50"
            @click="selectCategory(category.id)"
          >
            <img
              :src="getCategoryPreviewUrl(category)"
              :alt="category.label"
              class="h-12 w-12 rounded-lg transition-transform group-hover:scale-110"
            />
            <div class="flex items-center gap-1">
              <span>{{ category.emoji }}</span>
              <span class="text-xs font-medium">{{ category.label }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2: Choose variation -->
      <div v-else class="flex gap-4 p-4">
        <!-- Variations grid -->
        <div class="flex-1 overflow-y-auto pr-1" style="max-height: 300px;">
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="(item, index) in variations"
              :key="`${item.style}-${item.variation}`"
              type="button"
              class="group relative rounded-lg border-2 p-1.5 transition-all"
              :class="[
                tempSelectedStyle === item.style && tempSelectedVariation === item.variation
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
              ]"
              @click="selectVariation(item.style, item.variation)"
            >
              <img
                :src="item.url"
                :alt="`Variation ${index + 1}`"
                class="h-full w-full rounded transition-transform group-hover:scale-105"
              />
              <div
                v-if="tempSelectedStyle === item.style && tempSelectedVariation === item.variation"
                class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Check class="h-2.5 w-2.5" />
              </div>
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div class="flex w-28 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3">
          <img
            :src="getPreviewUrl()"
            alt="Preview"
            class="h-20 w-20 rounded-full shadow-lg ring-2 ring-background"
          />
          <p class="mt-2 text-xs font-medium text-muted-foreground">
            {{ t('common.profile.preview') }}
          </p>
        </div>
      </div>

      <DialogFooter class="border-t px-4 py-3">
        <Button variant="ghost" size="sm" @click="isOpen = false">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button size="sm" :disabled="!selectedStyleId" @click="confirmSelection">
          {{ t('common.actions.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
