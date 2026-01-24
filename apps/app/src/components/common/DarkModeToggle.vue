<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDarkMode, type Theme } from '@/composables/useDarkMode';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor } from 'lucide-vue-next';

const { t } = useI18n();
const { theme, isDark, setTheme } = useDarkMode();

const currentIcon = computed(() => {
  if (theme.value === 'system') return Monitor;
  return isDark.value ? Moon : Sun;
});

const themes: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'common.theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'common.theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'common.theme.system' },
];
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon">
        <component :is="currentIcon" class="h-5 w-5" />
        <span class="sr-only">{{ t('common.theme.toggle') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="item in themes"
        :key="item.value"
        @click="setTheme(item.value)"
        class="cursor-pointer"
        :class="{ 'bg-accent': theme === item.value }"
      >
        <component :is="item.icon" class="mr-2 h-4 w-4" />
        {{ t(item.labelKey) }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
