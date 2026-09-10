/**
 * Casca de navegação persistente da aplicação autenticada.
 *
 * Sidebar escura recolhível (padrão de PEP hospitalar de grande porte —
 * Tasy/MV/Salutem), escondida por padrão e aberta pelo botão de menu na
 * barra superior. Os itens abaixo refletem apenas rotas que de fato existem
 * em App.tsx — nada aqui é decorativo ou aponta para uma tela desconectada.
 */
import { useState, type ReactNode, type SVGProps } from 'react';
import { useSession } from '../context/session-context.js';
import { VitaloopMark } from './VitaloopMark.js';
import { hasAnyRoleGroup, type RoleGroup } from '../lib/role-groups.js';

interface NavLink {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  /** Sobrepõe requiredRoles do grupo — pra um item mais restrito que o resto do grupo. */
  requiredRoles?: readonly RoleGroup[];
}

interface NavGroup {
  title: string;
  requiredRoles: readonly RoleGroup[];
  links: NavLink[];
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IconQueue = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);
const IconPatients = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M17 20v-1.6a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
    <circle cx="10" cy="7.5" r="3.5" />
    <path d="M22 20v-1.6a4 4 0 0 0-3-3.87" />
    <path d="M16 4.2a3.5 3.5 0 0 1 0 6.6" />
  </svg>
);
const IconEncounters = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M8 4h8a2 2 0 0 1 2 2v13a1 1 0 0 1-1.5.87L15 18l-1.5 1.87L12 18l-1.5 1.87L9 18l-1.5 1.87A1 1 0 0 1 6 19V6a2 2 0 0 1 2-2Z" />
    <path d="M9 9h6M9 13h4" />
  </svg>
);
const IconBeds = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M3 18v-7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v7" />
    <path d="M3 14h18" />
    <path d="M13 14v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6" />
    <path d="M3 18v2M21 18v2" />
  </svg>
);
const IconIndicators = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-7" />
  </svg>
);
const IconSchedule = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <path d="M8 13h2M8 17h2M14 13h2M14 17h2" />
  </svg>
);
const IconSettings = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
const IconQuality = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M12 3l8 4v5c0 5-3.4 7.9-8 9-4.6-1.1-8-4-8-9V7l8-4Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconInteroperability = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M4 17V7a2 2 0 0 1 2-2h6l2 2h6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
  </svg>
);
const IconSecurity = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3Z" />
  </svg>
);
const IconObservability = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M3 3v18h18" />
    <path d="M7 12l3 3 6-8" />
    <circle cx="18" cy="6" r="1.6" />
  </svg>
);
const IconDisasterRecovery = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </svg>
);
const IconStaffAccounts = (props: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...iconProps} {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20v-1.5A4 4 0 0 1 7 14.5h4a4 4 0 0 1 4 4V20" />
    <path d="M17 8h4" />
    <path d="M19 6v4" />
  </svg>
);

const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: 'Assistencial',
    requiredRoles: ['assistencial', 'recepcao'],
    links: [
      // Nomenclatura alinhada aos dois setores reais da UPA (2026-09):
      // Pronto Atendimento (fila/triagem/avaliação médica, sem leito físico)
      // e Prontuário de Internação (Sala Vermelha, Internação Adulto,
      // Observação Pediátrica/Adulto — setores com leito). Mesmas rotas de
      // sempre, só o rótulo do menu que ficava genérico e desatualizado.
      { href: '#/filas', label: 'Pronto Atendimento', icon: IconQueue },
      { href: '#/pacientes', label: 'Pacientes', icon: IconPatients },
      { href: '#/atendimentos', label: 'Atendimentos', icon: IconEncounters },
      { href: '#/leitos', label: 'Prontuário de Internação', icon: IconBeds },
    ],
  },
  {
    title: 'Gestão',
    requiredRoles: ['gestao'],
    links: [
      { href: '#/indicadores', label: 'Indicadores', icon: IconIndicators },
      { href: '#/configuracoes/leitos', label: 'Configurações de leitos', icon: IconSettings },
      { href: '#/escala', label: 'Escala de profissionais', icon: IconSchedule },
    ],
  },
  {
    title: 'Sistema',
    requiredRoles: ['ti'],
    links: [
      // Restrito a 'root' (só system_admin) — a tela exige literalmente essa
      // role via RLS nas tabelas de identidade (não uma permissão), então
      // admin (que cai em 'ti') não conseguiria usá-la mesmo vendo o link.
      { href: '#/profissionais', label: 'Gerenciar profissionais', icon: IconStaffAccounts, requiredRoles: ['root'] },
      { href: '#/qualidade', label: 'Qualidade e acessibilidade', icon: IconQuality },
      { href: '#/interoperabilidade', label: 'Interoperabilidade', icon: IconInteroperability },
      { href: '#/seguranca', label: 'Segurança', icon: IconSecurity },
      { href: '#/observabilidade', label: 'Observabilidade', icon: IconObservability },
      { href: '#/disaster-recovery', label: 'Disaster recovery', icon: IconDisasterRecovery },
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
  const visibleGroups = NAV_GROUPS.filter((group) => hasAnyRoleGroup(identity?.roles, group.requiredRoles));

  return (
    <div className={`vl-shell${navOpen ? ' vl-nav-open' : ''}`}>
      <div className="vl-sidebar-wrap">
        <aside className="vl-sidebar">
          <div className="vl-sidebar-brand">
            <VitaloopMark size={30} />
            <span>Vitaloop</span>
          </div>
          <nav className="vl-nav" style={{ flex: 1, overflowY: 'auto' }}>
            {visibleGroups.map((group) => (
              <div className="vl-nav-group" key={group.title}>
                <h4>{group.title}</h4>
                {group.links
                  .filter((link) => hasAnyRoleGroup(identity?.roles, link.requiredRoles ?? group.requiredRoles))
                  .map((link) => {
                  const isActive = currentRoute === link.href.replace(/^#/, '');
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className="vl-nav-item"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setNavOpen(false)}
                    >
                      <Icon />
                      {link.label}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="vl-sidebar-foot">
            <span className="pulse-dot" />
            <span>Sessão ativa</span>
          </div>
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
            <svg {...iconProps} width={17} height={17}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <a href="#/filas" className="vl-topbar-title" onClick={() => setNavOpen(false)}>
            <VitaloopMark size={26} />
            Vitaloop
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
