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
  globalIgnores(['dist', 'src/api/generated']),
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
            // One zone per feature goes here to block cross-feature imports, added as
            // each feature is created. No features exist yet.
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
  ...storybook.configs['flat/recommended'],
]);
