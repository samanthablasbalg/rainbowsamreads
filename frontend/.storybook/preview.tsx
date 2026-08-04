import { useState, useEffect } from 'react';
import { definePreview } from '@storybook/react-vite';
import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import addonMsw from 'msw-storybook-addon';
import { ThemeProvider } from '@/lib/theme-provider';
import '../src/styles.css';

// Same three providers, same order, as src/test/render.tsx and app/provider.tsx.
//
// PascalCase, not the conventional `withX` decorator name: it calls useState below, and
// react-hooks/rules-of-hooks only recognizes a hook call as valid inside something that
// looks like a component or a `use*` hook by name.
const WithProviders: Decorator = (Story) => {
  // useState rather than a plain `new QueryClient()`: decorators re-render on every
  // control/toolbar change, and a plain call would hand every story a fresh client --
  // and fresh cache -- on each one.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

// ThemeProvider resolves its own theme from localStorage/matchMedia and has no prop to
// override it, so the toolbar can't drive ThemeProvider's state directly -- it toggles
// the same `.dark` class on <html> that ThemeProvider's own effect does, independently.
// PascalCase for the same reason as WithProviders above -- it calls useEffect.
const WithTheme: Decorator = (Story, context) => {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', context.globals.theme === 'dark');
  }, [context.globals.theme]);
  return <Story />;
};

const preview = definePreview({
  addons: [addonMsw()],
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

    // Replaces the stock MINIMAL_VIEWPORTS rather than merging with it -- those four
    // match neither a device this owns nor a breakpoint the CSS uses.
    //
    // The five breakpoints are Tailwind v4's defaults, unmodified (this app doesn't
    // override them -- see styles.css). Nothing enforces these staying in sync, since
    // there's no way to import them from Tailwind.
    //
    // Device sizes are measured CSS pixels (devtools width/height), not spec-sheet
    // resolution divided by DPR -- those are not the same number.
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
