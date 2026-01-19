import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      $definitions: fileURLToPath(new URL('../src/definitions', import.meta.url)),
      $data: fileURLToPath(new URL('./src/lib/data', import.meta.url)),
      $components: fileURLToPath(new URL('./src/lib/components', import.meta.url)),
      $utils: fileURLToPath(new URL('./src/lib/utils', import.meta.url))
    }
  }
});
