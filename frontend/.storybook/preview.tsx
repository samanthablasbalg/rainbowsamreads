import { useState, useEffect } from 'react';
import { definePreview } from '@storybook/react-vite';
import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import addonMsw from 'msw-storybook-addon';
import addonDocs from '@storybook/addon-docs';
import { ThemeProvider } from '@/lib/theme-provider';
import '../src/styles.css';

const WithProviders: Decorator = (Story, context) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  const initialEntries: string[] = context.parameters.initialEntries ?? ['/'];
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const WithTheme: Decorator = (Story, context) => {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', context.globals.theme === 'dark');
  }, [context.globals.theme]);
  return <Story />;
};

const preview = definePreview({
  addons: [addonMsw(), addonDocs()],
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'error',
    },

    // The five breakpoints are Tailwind v4's defaults. Nothing keeps them in sync --
    // there is no way to import them from Tailwind.
    //
    // Device sizes are measured CSS pixels, not spec-sheet resolution divided by DPR.
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
        '2xl': {
          name: '2xl — 1536',
          styles: { width: '1536px', height: '960px' },
          type: 'other',
        },
      },
    },
  },
  globalTypes: {
    theme: {
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [WithTheme, WithProviders],
});

export default preview;
