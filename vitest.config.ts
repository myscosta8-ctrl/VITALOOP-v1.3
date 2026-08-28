import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/src/**/*.test.ts',
      'apps/**/src/**/*.test.ts',
      'apps/**/src/**/*.test.tsx',
      'tests/**/*.test.ts',
    ],
    environment: 'node',
    // Componentes React (apps/web) precisam de DOM — cada arquivo de teste
    // de UI declara `/** @vitest-environment jsdom */` no topo (override por
    // arquivo); o restante da suíte (domínio/API/integração) continua 'node'.
    setupFiles: ['./apps/web/vitest.setup.ts'],
    reporters: 'default',
    passWithNoTests: false,
  },
});
