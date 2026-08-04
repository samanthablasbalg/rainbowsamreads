import path from 'node:path';
// From 'vitest/config', not 'vite'. It is Vite's own defineConfig re-exported with the
// `test` key below added to the type -- without it, `test` is an unknown property.
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = import.meta.dirname;

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
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
    coverage: {
      provider: 'v8',
      // No threshold: this is a diagnostic for spotting untouched branches, run by
      // hand with --coverage, not a gate `check` enforces. A threshold turns that
      // into a completeness ratchet instead.
      // src/api/generated is orval output and src/components/ui is shadcn output --
      // neither is logic this app authored, so neither is logic these tests are
      // written against. Revisit components/ui if a primitive ever gains real
      // behaviour rather than a styling change; presentational edits (a new cva
      // variant, a class tweak) still don't belong here.
      exclude: [...coverageConfigDefaults.exclude, 'src/api/generated/**', 'src/components/ui/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          // Named so `vitest run --project unit` can select this one alone --
          // `npm test` needs to mean this, not also the browser-connected
          // 'storybook' project below, which requires the `browsers` service.
          name: 'unit',
          // jsdom is a JavaScript reimplementation of the DOM -- it gives the tests a
          // `document` and a `window`, which Node does not have on its own. It is not a
          // browser: nothing is laid out or painted, so anything asking about real geometry
          // or real pointer behaviour belongs in Playwright instead. See src/test/setup.ts.
          environment: 'jsdom',
          // describe/it/expect/vi available without importing them, and what lets Testing
          // Library register its own cleanup. Paired with "vitest/globals" in
          // tsconfig.app.json, which is what makes TypeScript agree they exist.
          globals: true,
          // Both default to false. Without them, a spy or a vi.stubGlobal from one test
          // silently carries into the next -- the order it happens to run in, not
          // anything the test itself does, decides whether that shows up.
          restoreMocks: true,
          unstubGlobals: true,
          setupFiles: ['./src/test/setup.ts'],
          // Anchored at src/ rather than left on the default, which would also sweep up
          // anything at the project root. Playwright uses the same .spec extension and is
          // moving into this package later; it scopes itself with its own testDir, so the
          // two stay apart by directory.
          include: ['src/**/*.spec.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            // Vitest's own orchestration server, which the remote browser
            // connects back to. Set to the storybook service's own compose
            // name -- 'localhost' here would mean the browsers container,
            // since that's where the browser actually runs.
            api: {
              host: 'storybook',
            },
            // Connects to the browsers service's Playwright server instead of
            // launching a local Chromium, the same way e2e's
            // playwright.config.ts connects to it for Playwright tests.
            provider: playwright({
              connectOptions: {
                wsEndpoint: 'ws://browsers:5000/',
              },
            }),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
});
