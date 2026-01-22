import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { i18n, initI18n } from './locales';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

// Initialize i18n and mount app
initI18n().then(() => {
  app.mount('#app');
});
