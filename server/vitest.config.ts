import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    // Os testes compartilham o mesmo banco; rodar arquivos em sequência evita interferência.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/brevly_test',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
})
