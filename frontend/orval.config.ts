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
        query: {
          // Safe to set globally: orval gates it to GET internally. Its neighbour
          // `useQuery` is not -- that one applies to every verb, and a non-GET generated
          // as a query stops generating as a mutation.
          useSuspenseQuery: true,
        },
        mock: {
          // Orval's handlers await a 1000ms delay by default -- a real second per request
          // in vitest.
          delay: false,
        },
      },
    },
  },
});
