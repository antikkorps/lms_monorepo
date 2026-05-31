/// <reference types='vitest' />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Library build for the @shared/ui Vue component library.
// Apps consume it from source via path mapping; this build target produces
// a bundled ES artifact (vue kept external) so `nx build` succeeds in CI.
export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/libs/shared/ui',

  plugins: [vue(), nxViteTsPaths()],

  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'shared-ui',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      // Don't bundle peer deps into the library
      external: ['vue'],
    },
  },
});
