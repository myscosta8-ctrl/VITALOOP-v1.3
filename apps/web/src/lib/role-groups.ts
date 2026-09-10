/**
 * Papéis reais retornados por /api/v1/me (doctor, nurse, manager,
 * system_admin...) são definidos livremente no backend (tabela app.roles,
 * sem enum fixo) e podem mudar sem aviso. Este mapa os agrupa em 4 grupos
 * amplos usados pela navegação — assistencial, recepção, gestão, TI — sem
 * exigir que o backend use exatamente essas palavras.
 *
 * Um papel pode cair em mais de um grupo: um coordenador que também assume
 * plantão assistencial deveria ter, no cadastro, tanto o papel de
 * enfermagem/medicina quanto um papel de coordenação distinto (não basta
 * ser enfermeiro — só quem de fato coordena tem esse papel extra).
 *
 * 'root' é distinto de 'ti': cobre só quem tem a role literal
 * `system_admin` — as tabelas centrais de identidade/RBAC (app.users,
 * app.roles, app.user_roles...) exigem essa role específica via RLS
 * (migration 0010), não uma permissão, então `admin` (que cai em 'ti')
 * não consegue usar telas restritas a 'root' mesmo tendo acesso ao resto
 * do grupo Sistema — achado de auditoria em 2026-09-10.
 */
export type RoleGroup = 'assistencial' | 'recepcao' | 'gestao' | 'ti' | 'root';

const ROLE_GROUP_MAP: Record<string, readonly RoleGroup[]> = {
  doctor: ['assistencial'],
  nurse: ['assistencial'],
  nursing_technician: ['assistencial'],
  medico: ['assistencial'],
  enfermeiro: ['assistencial'],
  tecnico_enfermagem: ['assistencial'],
  assistencial: ['assistencial'],

  receptionist: ['recepcao'],
  recepcao: ['recepcao'],

  manager: ['gestao'],
  direcao: ['gestao'],
  gestao: ['gestao'],
  coordenador: ['assistencial', 'gestao'],

  admin: ['ti'],
  system_admin: ['ti', 'root'],
  auditoria: ['ti'],
  ti: ['ti'],
};

export const roleGroupsFor = (roles: readonly string[] | undefined): ReadonlySet<RoleGroup> => {
  const groups = new Set<RoleGroup>();
  for (const role of roles ?? []) {
    for (const group of ROLE_GROUP_MAP[role.toLowerCase()] ?? []) {
      groups.add(group);
    }
  }
  return groups;
};

export const hasAnyRoleGroup = (
  roles: readonly string[] | undefined,
  required: readonly RoleGroup[],
): boolean => {
  const groups = roleGroupsFor(roles);
  return required.some((group) => groups.has(group));
};
