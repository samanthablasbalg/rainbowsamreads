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
          // A suspense hook alongside the plain one for every GET. Screens that fetch
          // unconditionally read through it and have no pending or error branch to
          // write; search keeps the plain hook, because `useSuspenseQuery` omits
          // `enabled` and `placeholderData` and that query needs both.
          //
          // This one is safe to set globally -- orval gates it to GET internally. Its
          // neighbour `useQuery` is not: that one applies to every verb, and a
          // non-GET that generates as a query stops generating as a mutation.
          useSuspenseQuery: true,
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
