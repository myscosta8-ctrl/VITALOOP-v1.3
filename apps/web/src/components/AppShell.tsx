/**
 * Casca de navegação persistente da aplicação autenticada.
 *
 * Sidebar escura recolhível (padrão de PEP hospitalar de grande porte —
 * Tasy/MV/Salutem), escondida por padrão e aberta pelo botão de menu na
 * barra superior. Os itens abaixo refletem apenas rotas que de fato existem
 * em App.tsx — nada aqui é decorativo ou aponta para uma tela desconectada.
 */
import { useState, type ReactNode } from 'react';
import { useSession } from '../context/session-context.js';

interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: 'Assistencial',
    links: [
      { href: '#/filas', label: 'Fila de atendimento' },
      { href: '#/pacientes', label: 'Pacientes' },
      { href: '#/atendimentos', label: 'Atendimentos' },
      { href: '#/leitos', label: 'Mapa de leitos' },
    ],
  },
  {
    title: 'Gestão',
    links: [
      { href: '#/indicadores', label: 'Indicadores' },
      { href: '#/qualidade', label: 'Qualidade e acessibilidade' },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '#/interoperabilidade', label: 'Interoperabilidade' },
      { href: '#/seguranca', label: 'Segurança' },
      { href: '#/observabilidade', label: 'Observabilidade' },
      { href: '#/disaster-recovery', label: 'Disaster recovery' },
    ],
  },
];

const initials = (roles: readonly string[] | undefined): string => {
  const label = roles && roles.length > 0 ? roles[0]! : 'VL';
  return label.slice(0, 2).toUpperCase();
};

export const AppShell = ({ children }: { children: ReactNode }): JSX.Element => {
  const { identity, logout } = useSession();
  const currentRoute = window.location.hash.replace(/^#/, '') || '/';
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className={`vl-shell${navOpen ? ' vl-nav-open' : ''}`}>
      <div className="vl-sidebar-wrap">
        <aside className="vl-sidebar">
          <div className="vl-sidebar-brand">
            <div className="dot" />
            <span>VITALOOP</span>
          </div>
          {NAV_GROUPS.map((group) => (
            <div className="vl-nav-group" key={group.title}>
              <h4>{group.title}</h4>
              {group.links.map((link) => {
                const isActive = currentRoute === link.href.replace(/^#/, '');
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="vl-nav-item"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          ))}
        </aside>
      </div>

      <div className="vl-main-col">
        <div className="vl-topbar">
          <button
            type="button"
            className="vl-menu-toggle"
            aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            ☰
          </button>
          <a href="#/filas" className="vl-topbar-title">
            VITALOOP
          </a>
          <div className="vl-topbar-right">
            {identity?.roles && identity.roles.length > 0 && (
              <span className="vl-unit-chip">{identity.roles.join(', ')}</span>
            )}
            <div className="vl-user-chip">
              <div className="vl-avatar">{initials(identity?.roles)}</div>
              <a href="#/perfil">Perfil</a>
            </div>
            <button type="button" className="vl-btn-ghost" onClick={() => void logout()}>
              Sair
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};
