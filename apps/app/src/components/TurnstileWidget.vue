<script setup lang="ts">
/**
 * Cloudflare Turnstile captcha widget.
 *
 * Loads the Turnstile script once (explicit-render mode), renders a widget, and
 * emits the resulting token. Renders nothing when no site key is configured, so
 * the signup form stays usable in local dev without keys.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ siteKey?: string }>();
const emit = defineEmits<{
  verified: [token: string];
  expired: [];
  error: [];
}>();

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const container = ref<HTMLElement | null>(null);
let widgetId: string | undefined;

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function renderWidget() {
  if (!props.siteKey || !container.value || !window.turnstile) return;
  widgetId = window.turnstile.render(container.value, {
    sitekey: props.siteKey,
    callback: (token: string) => emit('verified', token),
    'expired-callback': () => emit('expired'),
    'error-callback': () => emit('error'),
  });
}

/** Reset the widget so the user can solve a fresh challenge (e.g. after a failed submit). */
function reset() {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
}

defineExpose({ reset });

onMounted(async () => {
  if (!props.siteKey) return;
  try {
    await loadScript();
    renderWidget();
  } catch {
    emit('error');
  }
});

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId);
  }
});
</script>

<template>
  <div v-if="siteKey" ref="container" class="flex justify-center" />
</template>
