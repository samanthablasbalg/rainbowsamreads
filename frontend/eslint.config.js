// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'src/api/generated', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'import-x': importX,
    },
    settings: {
      // Lets no-restricted-paths resolve `@/*` imports to real file paths, not just
      // relative ones, since the whole tree imports through the alias.
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/features', from: './src/app' },
            {
              target: ['./src/api', './src/components', './src/config', './src/lib'],
              from: ['./src/features', './src/app'],
            },
            // One zone per feature, blocking imports from every other feature. Only one
            // feature exists so far, so this is currently a no-op -- it starts enforcing
            // the moment a second one is added.
            {
              target: './src/features/currently-reading',
              from: './src/features/!(currently-reading)/**',
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn components are generated into this directory by `npx shadcn add`, and the
    // registry's convention is to export the component alongside its cva variants
    // (`buttonVariants`, `badgeVariants`, ...) so other elements can borrow the styling.
    // That trips react-refresh, which wants a module to export components and nothing else.
    //
    // We own the *contents* of these files and edit them freely; we do not own their export
    // structure, and every future `shadcn add` reintroduces it. The only cost of the rule not
    // firing is that editing one of these full-reloads the page instead of hot-swapping.
    //
    // Deliberately scoped to this directory. Our own code stays under the rule.
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // render.tsx re-exports Testing Library with `export *`, which the rule cannot see
    // through. Test helpers are never part of a hot-reloaded module graph anyway.
    files: ['src/test/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // CSF (Component Story Format) requires a default export (the meta object) plus a
    // named export per story -- neither is a component, which is exactly what this rule
    // disallows. Story files are never part of the app's own hot-reloaded module graph.
    files: ['**/*.stories.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // preview.tsx's decorators are PascalCase, JSX-returning bindings (required for
    // react-hooks/rules-of-hooks to accept the hook calls inside them), but the file's
    // actual export is the `preview` config object, not a component. Same reasoning as
    // src/test/** above: never part of the app's own hot-reloaded module graph.
    files: ['.storybook/preview.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
]);
