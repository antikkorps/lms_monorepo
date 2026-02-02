import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { i18n, initI18n } from './locales';
import { errorService } from './services/error.service';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

// Global error handler for Vue errors
app.config.errorHandler = (err, instance, info) => {
  errorService.captureError(err as Error, {
    componentName: instance?.$options?.name || 'Unknown',
    info,
    type: 'vue',
  });
};

// Global warning handler (dev only)
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('[Vue Warning]', msg);
    if (trace) console.warn(trace);
  };
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorService.captureError(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    { type: 'unhandledrejection' }
  );
});

// Handle global errors
window.addEventListener('error', (event) => {
  errorService.captureError(event.error || new Error(event.message), {
    type: 'global',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Initialize i18n and mount app
initI18n().then(() => {
  app.mount('#app');
});
