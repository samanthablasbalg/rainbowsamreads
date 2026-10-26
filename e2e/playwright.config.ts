import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 30 * 1000,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list'], ['blob']] : [['html', { open: 'never' }]],
  use: {
    // The Caddy proxy, resolved by service name on the compose network —
    // the same single origin for /api/* and everything else that a human
    // browsing the published port would see.
    baseURL: 'http://proxy:8080',
    // Browsers run in the `browsers` service, not in whatever container this
    // process is in — so the test process only ever needs Node, and the browser
    // binaries stay out of the dev image. Resolved by service name, which works
    // identically from `workspace` (authoring) and from `e2e` (CI), keeping the
    // two topologies the same.
    //
    // Note the split this introduces: `request` / ApiClient are HTTP clients in
    // *this* process, while `page` and `page.request` run in the remote browser
    // and resolve baseURL from there. Anything pointed at localhost would see
    // two different machines; every URL here is a service name, so nothing does.
    connectOptions: { wsEndpoint: 'ws://browsers:5000/' },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'catalog teardown',
      testMatch: /catalog\.teardown\.ts/,
    },
    {
      name: 'catalog setup',
      testMatch: /catalog\.setup\.ts/,
      teardown: 'catalog teardown',
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['catalog setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['catalog setup'],
    },
    {
      // The only project that exercises the small-screen path: at ≤599px the
      // progress log opens as a bottom sheet instead of a dialog. Pixel 7
      // (412px wide, touch) trips that breakpoint. (Firefox can't do mobile
      // device emulation, so the mobile project is Chromium-engine.)
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      dependencies: ['catalog setup'],
    },
  ],
});
