<script setup lang="ts">
import { ref } from 'vue';
import { Globe, Check, ChevronDown } from 'lucide-vue-next';
import { useLocale } from '@/composables/useLocale';

const { currentLocaleOption, localeOptions, changeLocale } = useLocale();

const isOpen = ref(false);
const isChanging = ref(false);

async function selectLocale(code: string) {
  if (code === currentLocaleOption.value.code) {
    isOpen.value = false;
    return;
  }

  isChanging.value = true;
  try {
    await changeLocale(code as 'en' | 'fr');
  } finally {
    isChanging.value = false;
    isOpen.value = false;
  }
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

// Close on click outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.language-switcher')) {
    isOpen.value = false;
  }
}

// Add/remove event listener
import { onMounted, onUnmounted } from 'vue';
onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
  <div class="language-switcher relative">
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      :disabled="isChanging"
      @click="toggleDropdown"
    >
      <Globe class="h-4 w-4" />
      <span class="hidden sm:inline">{{ currentLocaleOption.name }}</span>
      <span class="sm:hidden">{{ currentLocaleOption.flag }}</span>
      <ChevronDown class="h-3 w-3" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border bg-popover p-1 shadow-md"
      >
        <button
          v-for="option in localeOptions"
          :key="option.code"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          :class="{
            'text-foreground': option.code === currentLocaleOption.code,
            'text-muted-foreground': option.code !== currentLocaleOption.code,
          }"
          @click="selectLocale(option.code)"
        >
          <span>{{ option.flag }}</span>
          <span class="flex-1 text-left">{{ option.name }}</span>
          <Check
            v-if="option.code === currentLocaleOption.code"
            class="h-4 w-4 text-primary"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
