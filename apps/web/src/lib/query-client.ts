import { QueryClient } from '@tanstack/react-query';

/**
 * Instância única do TanStack Query (Fase 3 da absorção de arquitetura do
 * Emergency Care, 11/09/2026) — adoção incremental: só as páginas que já
 * foram migradas para o padrão shadcn/ui usam `useQuery`/`useMutation` por
 * enquanto; o resto do app continua com `useState`+`useEffect` manual até
 * ser migrado também.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
