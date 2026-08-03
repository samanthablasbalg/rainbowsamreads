import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// The import plugin itself is NOT wired up yet. It has nothing to enforce until
// `features/` exists, and the plugin-vs-plugin-x choice should be made against a
// real folder tree rather than an empty one.
export default defineConfig([
  globalIgnores(['dist']),
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
]);
