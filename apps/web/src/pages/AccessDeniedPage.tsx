/**
 * Tela de acesso negado (Doc 4 §24/§30). Diferencia claramente:
 * não autenticado vs. autenticado-sem-permissão vs. fora de escopo (NTK).
 * Não revela detalhes internos de segurança.
 */

export type DenialReason = 'unauthenticated' | 'forbidden' | 'out_of_scope' | 'not_found';

const messages: Record<DenialReason, string> = {
  unauthenticated: 'Você precisa entrar para acessar este recurso.',
  forbidden: 'Você está autenticado, mas não tem permissão para esta ação.',
  out_of_scope:
    'Você não possui vínculo com este contexto (Need-to-Know). Solicite acesso ao responsável ou, se aplicável, use o acesso excepcional.',
  not_found: 'Recurso não encontrado ou você não tem acesso a ele.',
};

export const AccessDeniedPage = ({ reason }: { reason: DenialReason }): JSX.Element => {
  return (
    <main aria-labelledby="denied-heading">
      <h1 id="denied-heading">Acesso não concedido</h1>
      <p role="alert">{messages[reason]}</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <a href="#/" style={{ marginTop: 0 }}>
          Ir para Login
        </a>
      </div>
    </main>
  );
};
