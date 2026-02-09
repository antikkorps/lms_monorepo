<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from 'reka-ui';
import { Search, BookOpen } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';

interface Suggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
}

const open = defineModel<boolean>('open', { default: false });

const { t } = useI18n();
const router = useRouter();

const query = ref('');
const suggestions = ref<Suggestion[]>([]);
const isLoading = ref(false);
const selectedIndex = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchSuggestions(q: string) {
  if (q.length < 2) {
    suggestions.value = [];
    return;
  }

  isLoading.value = true;
  try {
    const response = await fetch(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}`, {
      credentials: 'include',
    });
    if (response.ok) {
      const result = await response.json();
      suggestions.value = result.data;
    }
  } catch {
    suggestions.value = [];
  } finally {
    isLoading.value = false;
  }
}

watch(query, (val) => {
  selectedIndex.value = -1;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchSuggestions(val);
  }, 200);
});

watch(open, (val) => {
  if (val) {
    query.value = '';
    suggestions.value = [];
    selectedIndex.value = -1;
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

function navigateTo(slug: string) {
  open.value = false;
  router.push(`/courses/${slug}`);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (selectedIndex.value < suggestions.value.length - 1) {
      selectedIndex.value++;
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (selectedIndex.value >= 0 && suggestions.value[selectedIndex.value]) {
      navigateTo(suggestions.value[selectedIndex.value].slug);
    } else if (query.value) {
      open.value = false;
      router.push(`/courses?search=${encodeURIComponent(query.value)}`);
    }
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg">
      <VisuallyHidden>
        <DialogTitle>{{ t('search.title') }}</DialogTitle>
      </VisuallyHidden>

      <!-- Search input -->
      <div class="flex items-center border-b px-3">
        <Search class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          :placeholder="t('search.placeholder')"
          class="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          @keydown="handleKeydown"
        />
      </div>

      <!-- Results -->
      <div class="max-h-72 overflow-y-auto">
        <!-- Suggestions -->
        <div v-if="suggestions.length > 0" class="p-2">
          <button
            v-for="(item, index) in suggestions"
            :key="item.id"
            :class="[
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            ]"
            @click="navigateTo(item.slug)"
            @mouseenter="selectedIndex = index"
          >
            <BookOpen class="h-4 w-4 shrink-0 text-muted-foreground" />
            <span class="flex-1 truncate text-left">{{ item.title }}</span>
            <Badge variant="secondary" class="text-xs">
              {{ t(`courses.categories.${item.category}`) }}
            </Badge>
          </button>
        </div>

        <!-- No results -->
        <div v-else-if="query.length >= 2 && !isLoading" class="px-3 py-6 text-center text-sm text-muted-foreground">
          {{ t('search.noResults') }}
        </div>

        <!-- Hint -->
        <div v-if="query.length >= 2" class="border-t px-3 py-2 text-xs text-muted-foreground">
          {{ t('search.hint') }}
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
