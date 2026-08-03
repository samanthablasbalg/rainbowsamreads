import path from 'node:path';
// From 'vitest/config', not 'vite'. It is Vite's own defineConfig re-exported with the
// `test` key below added to the type -- without it, `test` is an unknown property.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['frontend'],
  },
  test: {
    // jsdom is a JavaScript reimplementation of the DOM -- it gives the tests a
    // `document` and a `window`, which Node does not have on its own. It is not a
    // browser: nothing is laid out or painted, so anything asking about real geometry
    // or real pointer behaviour belongs in Playwright instead. See src/test/setup.ts.
    environment: 'jsdom',
    // describe/it/expect/vi available without importing them, and what lets Testing
    // Library register its own cleanup. Paired with "vitest/globals" in
    // tsconfig.app.json, which is what makes TypeScript agree they exist.
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Anchored at src/ rather than left on the default, which would also sweep up
    // anything at the project root. Playwright uses the same .spec extension and is
    // moving into this package later; it scopes itself with its own testDir, so the
    // two stay apart by directory.
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
