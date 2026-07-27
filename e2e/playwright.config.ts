import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { AUTH_FILE } from './auth-file'

dotenv.config({ path: path.resolve(__dirname, '.env') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI']
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }]],
  use: {
    // Resolved by service name on the compose network.
    baseURL: 'http://frontend:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'db setup',
      testMatch: /db\.setup\.ts/,
    },
    {
      // Logs in once via the env-gated /auth/test-login bypass and saves the
      // session to AUTH_FILE; the projects below load it as storageState so
      // every page/request starts already authenticated.
      name: 'auth setup',
      testMatch: /auth\.setup\.ts/,
      dependencies: ['db setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['db setup', 'auth setup'],
      testIgnore: /seed\.spec\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: AUTH_FILE },
      dependencies: ['db setup', 'auth setup'],
      testIgnore: /seed\.spec\.ts/,
    },
    {
      // The only project that exercises the small-screen path: at ≤599px the
      // progress log opens as a bottom sheet instead of a dialog. Pixel 7
      // (412px wide, touch) trips that breakpoint. (Firefox can't do mobile
      // device emulation, so the mobile project is Chromium-engine.)
      name: 'mobile',
      use: { ...devices['Pixel 7'], storageState: AUTH_FILE },
      dependencies: ['db setup', 'auth setup'],
      testIgnore: /seed\.spec\.ts/,
    },
    // Authoring seed for the playwright-new-test skill: a single paused
    // session to drive with playwright cli under --debug=cli. timeout: 0 so
    // the pause never expires — never run in CI, only interactively.
    ...(process.env['CI']
      ? []
      : [
          {
            name: 'seed',
            testMatch: /seed\.spec\.ts/,
            timeout: 0,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['db setup'],
          },
        ]),
  ],
})
