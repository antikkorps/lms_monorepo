import { ref, watch, onMounted } from 'vue';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'lms-theme';

// Global state shared across components
const theme = ref<Theme>('system');
const isDark = ref(false);

function getSystemPreference(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(dark: boolean): void {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  isDark.value = dark;
}

function updateTheme(): void {
  const shouldBeDark = theme.value === 'dark' || (theme.value === 'system' && getSystemPreference());
  applyTheme(shouldBeDark);
}

export function useDarkMode() {
  onMounted(() => {
    // Load saved preference
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      theme.value = saved;
    }
    updateTheme();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme.value === 'system') {
        updateTheme();
      }
    };
    mediaQuery.addEventListener('change', handleChange);
  });

  // Watch for theme changes
  watch(theme, (newTheme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    updateTheme();
  });

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme;
  }

  function toggleTheme(): void {
    // Cycle: system -> light -> dark -> system
    const order: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = order.indexOf(theme.value);
    theme.value = order[(currentIndex + 1) % order.length];
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
