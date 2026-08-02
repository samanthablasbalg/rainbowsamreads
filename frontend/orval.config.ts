import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: '../backend/openapi.json',
    output: {
      target: './src/api/generated/',
      client: 'react-query',
      httpClient: 'axios',
      mode: 'tags-split',
      clean: true,
      formatter: 'prettier',
      mock: true,
      override: {
        mutator: {
          path: './src/api/mutator/axios-instance.ts',
          name: 'customInstance',
        },
        mock: {
          // Orval's handlers await a 1000ms delay by default. Fine in Storybook,
          // a real second per request in vitest.
          delay: false,
        },
      },
    },
  },
});
