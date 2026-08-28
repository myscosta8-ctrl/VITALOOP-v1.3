/**
 * Contexto do usuário / perfil-vínculo (Doc 4 §29). Mostra identidade e papéis;
 * não expõe dados clínicos. Diferencia claramente carregando/erro/sucesso.
 */

import { useSession } from '../context/session-context.js';

export const ProfilePage = (): JSX.Element => {
  const { identity, status, error, logout } = useSession();

  if (status === 'authenticating') return <p role="status">Carregando…</p>;
  if (status === 'error') return <p role="alert">{error ?? 'Erro ao carregar perfil.'}</p>;
  if (!identity) return <p role="status">Nenhuma identidade carregada.</p>;

  return (
    <main aria-labelledby="profile-heading">
      <h1 id="profile-heading">Meu perfil</h1>
      <dl>
        <dt>Identidade institucional</dt>
        <dd>{identity.appUserId ?? 'não provisionada'}</dd>
        <dt>Status</dt>
        <dd>{identity.status ?? '—'}</dd>
        <dt>Papéis (RBAC)</dt>
        <dd>{identity.roles.length > 0 ? identity.roles.join(', ') : 'nenhum papel atribuído'}</dd>
      </dl>
      {!identity.appUserId && (
        <p role="status">
          Sua credencial está confirmada, mas ainda não há identidade institucional
          ativa nem papéis atribuídos — acesso permanece negado por padrão.
        </p>
      )}
      <p>
        <a href="#/pacientes">Buscar/cadastrar paciente</a>
      </p>
      <button type="button" onClick={() => void logout()}>
        Sair
      </button>
    </main>
  );
};
