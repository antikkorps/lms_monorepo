import { defineConfig } from 'astro/config';
import tailwindcss from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwindcss()],
  outDir: '../../dist/apps/landing',
  server: {
    port: 4321,
  },
});
