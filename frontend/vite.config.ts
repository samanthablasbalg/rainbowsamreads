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
  // @testing-library/dom is a transitive dep pulled in by
  // @storybook/addon-vitest's setup file, and CI's cold dependency scan
  // doesn't discover its own deps in time -- each one hits the browser as a
  // plain CJS file (`exports.foo = ...`) served without interop, which
  // fails as an unresolvable named ESM export (aria-query's `elementRoles`,
  // then lz-string's `default`, one at a time as each got fixed).
  // Listed explicitly instead of chasing them one CI run at a time: every
  // package in @testing-library/dom's own dependency list that has no
  // "module"/dual "exports" entry (checked each package.json by hand) --
  // dom-accessibility-api and @babel/runtime are excluded because both
  // already declare a proper import/require exports map.
  optimizeDeps: {
    include: [
      'aria-query',
      'lz-string',
      'picocolors',
      'pretty-format',
      '@babel/code-frame',
      // Pulled in by badge.tsx's useRender -- undiscovered until a story exercises
      // it, which triggers the same cold-start reload these other deps are listed
      // to avoid (see comment above).
      '@base-ui/react/merge-props',
      '@base-ui/react/use-render',
    ],
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
          // How many browser pages run at once. Left alone, Vitest opens one per CPU
          // minus one -- nine here -- and the run dies before a single test executes:
          // "Browser connection was closed. Was the page closed unexpectedly?", naming
          // a different file each time.
          //
          // The cause is memory, not anything about the stories. A tester page carries
          // the Storybook runtime, axe, msw and the component graph, and measures at
          // roughly 500MB: sampling /proc/meminfo through a four-page run took the VM
          // from 2.1GB available down to 82MB. Nine pages want ~4.5GB that does not
          // exist, so the kernel kills renderers -- reproducible outside Vitest
          // entirely, as `Target crashed` from nine Playwright contexts in one browser.
          //
          // Three keeps ~500MB of headroom at today's numbers. Raise it only against a
          // measurement, not a hunch: the budget is (memory available to the browsers
          // container) / (~500MB per page), and the VM currently has 7.75GB total with
          // ~5.5GB already spent on the rest of the stack. More RAM for the Docker VM
          // buys a higher number here.
          //
          // It has to live on the project, not the CLI: Vitest reads
          // project.config.maxWorkers for the browser pool, so `--maxWorkers` on the
          // command line is silently ignored and you still get nine.
          maxWorkers: 3,
          browser: {
            enabled: true,
            headless: true,
            // Vitest's own orchestration server, which the remote browser
            // connects back to. Must be the compose service's own network
            // alias -- 'localhost' here would mean the browsers container,
            // since that's where the browser actually runs. Unlike
            // playwright.config.ts's wsEndpoint (a pure outbound connection,
            // so any container reaches it identically), this is an inbound
            // bind: the right value depends on which container the process
            // is actually running in, so it comes from an env var compose.yaml
            // sets per-service (VITEST_BROWSER_HOST) rather than a literal.
            api: {
              host: process.env.VITEST_BROWSER_HOST,
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
