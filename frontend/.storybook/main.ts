import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      compodoc: true,
      // --disableProtected / --disablePrivate keep implementation members out of the
      // generated docs. Angular host bindings cannot reach `private`, so internals end up
      // `protected`, which compodoc documents as public API without these.
      compodocArgs: ['-e', 'json', '-d', '.', '--disableProtected', '--disablePrivate'],
    },
  },
};
export default config;
