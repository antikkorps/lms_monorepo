import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  outDir: '../../dist/apps/landing',
  server: {
    port: 4321,
    host: true,
  },
});
