import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Sem `globals: true` no vitest.config.ts, o auto-cleanup do
// @testing-library/react (que depende de hooks globais de teste) não se
// registra sozinho — cada teste deixaria o DOM anterior montado,
// quebrando `getByRole`/`getByLabelText` em testes subsequentes.
afterEach(cleanup);
