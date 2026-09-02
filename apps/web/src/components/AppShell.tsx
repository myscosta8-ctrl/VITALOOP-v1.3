/**
 * Casca de navegação persistente da aplicação autenticada.
 *
 * Antes: cada rota substituía a tela inteira (App.tsx trocava componente
 * via hash-router sem nenhum header/menu fixo) — em um sistema onde o
 * profissional alterna constantemente entre fila, paciente e atendimento,
 * isso obrigava a memorizar URLs de hash em vez de navegar visualmente.
 *
 * Este componente só envolve rotas autenticadas (ver App.tsx). As páginas
 * de login/recuperação de senha continuam de tela cheia, sem navegação.
 */
import type { ReactNode } from 'react';
import { useSession } from '../context/session-context.js';

const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#/filas', label: 'Filas' },
  { href: '#/pacientes', label: 'Pacientes' },
  { href: '#/atendimentos', label: 'Atendimentos' },
  { href: '#/leitos', label: 'Leitos' },
  { href: '#/indicadores', label: 'Indicadores' },
  { href: '#/interoperabilidade', label: 'Interoperabilidade' },
  { href: '#/qualidade', label: 'Qualidade' },
  { href: '#/seguranca', label: 'Segurança' },
  { href: '#/observabilidade', label: 'Observabilidade' },
  { href: '#/disaster-recovery', label: 'Disaster Recovery' },
];

export const AppShell = ({ children }: { children: ReactNode }): JSX.Element => {
  const { identity, logout } = useSession();
  const currentRoute = window.location.hash.replace(/^#/, '') || '/';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '10px var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
          <a
            href="#/filas"
            style={{
              fontWeight: 700,
              fontSize: 'var(--text-lg)',
              color: 'var(--color-text)',
              textDecoration: 'none',
            }}
          >
            VITALOOP
          </a>
          <nav aria-label="Navegação principal" style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {NAV_LINKS.map((link) => {
              const isActive = currentRoute === link.href.replace(/^#/, '');
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    padding: '6px 4px',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                    textDecoration: 'none',
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {identity?.roles && identity.roles.length > 0 && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              {identity.roles.join(', ')}
            </span>
          )}
          <a href="#/perfil" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Perfil
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            style={{
              marginTop: 0,
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border-strong)',
              padding: '6px 12px',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
