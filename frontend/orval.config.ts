import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: '../backend/openapi.json',
    output: {
      target: './src/api/generated/',
      client: 'react-query',
      httpClient: 'axios',
      mode: 'tags-split',
    },
  },
});
