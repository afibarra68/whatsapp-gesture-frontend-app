import type { Role } from './types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: readonly Role[];
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true, roles: ['admin', 'operador', 'agente'] },
  { to: '/clients', label: 'Clientes', icon: '◷', roles: ['admin', 'operador'] },
  { to: '/personas', label: 'Personas', icon: '👤', roles: ['admin', 'operador'] },
  { to: '/pagos', label: 'Pagos', icon: '$', roles: ['admin', 'operador'] },
  { to: '/templates', label: 'Plantillas', icon: '▦', roles: ['admin', 'operador'] },
  { to: '/campaigns', label: 'Campañas', icon: '➤', roles: ['admin', 'operador'] },
  { to: '/conversations', label: 'Conversaciones', icon: '✉', roles: ['admin', 'operador', 'agente'] },
  { to: '/bot', label: 'Bot', icon: '🤖', roles: ['admin', 'operador', 'agente'] },
  { to: '/simulator', label: 'Simulador', icon: '⚙', roles: ['admin', 'operador'] },
  { to: '/users', label: 'Usuarios', icon: '👥', roles: ['admin'] },
  { to: '/help', label: 'Guía de uso', icon: '?', roles: ['admin', 'operador', 'agente'] },
];

export function navItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
