import type { Preview } from '@storybook/angular-vite';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
setCompodocJson(docJson);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },

    // The five breakpoints are Tailwind v4's defaults, unmodified. Nothing enforces these
    // staying in sync because there is no way to import them from Tailwind.
    viewport: {
      options: {
        pixel8Pro: {
          name: 'Pixel 8 Pro',
          styles: { width: '448px', height: '998px' },
          type: 'mobile',
        },
        tabS9FE: {
          name: 'Tab S9 FE',
          styles: { width: '744px', height: '1190px' },
          type: 'tablet',
        },
        sm: { name: 'sm — 640', styles: { width: '640px', height: '960px' }, type: 'other' },
        md: { name: 'md — 768', styles: { width: '768px', height: '960px' }, type: 'other' },
        lg: { name: 'lg — 1024', styles: { width: '1024px', height: '960px' }, type: 'other' },
        xl: { name: 'xl — 1280', styles: { width: '1280px', height: '960px' }, type: 'other' },
        '2xl': { name: '2xl — 1536', styles: { width: '1536px', height: '960px' }, type: 'other' },
      },
    },
  },
};

export default preview;
