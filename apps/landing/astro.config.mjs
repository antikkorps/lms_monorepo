import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://lms-platform.com',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@shared/config': fileURLToPath(new URL('../../libs/shared/config/src/index.ts', import.meta.url)),
      },
    },
  },
  outDir: '../../dist/apps/landing',
  server: {
    port: 4321,
    host: true,
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          fr: 'fr-FR',
        },
      },
      filter: (page) => !page.includes('/app/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
