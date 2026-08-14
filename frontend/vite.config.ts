import path from 'node:path';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = import.meta.dirname;

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
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  },
  test: {
    coverage: {
      provider: 'v8',
      exclude: [...coverageConfigDefaults.exclude, 'src/api/generated/**', 'src/components/ui/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          restoreMocks: true,
          unstubGlobals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.spec.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          // Must live on the project: Vitest reads project.config.maxWorkers for the
          // browser pool, so `--maxWorkers` on the CLI is silently ignored.
          maxWorkers: 3,
          browser: {
            enabled: true,
            headless: true,
            api: {
              host: process.env.VITEST_BROWSER_HOST,
            },
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
