import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EVENT } from '../config';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true },
  { to: '/clients', label: 'Clientes', icon: '◷' },
  { to: '/templates', label: 'Plantillas', icon: '▦' },
  { to: '/campaigns', label: 'Campañas', icon: '➤' },
  { to: '/conversations', label: 'Conversaciones', icon: '✉' },
  { to: '/simulator', label: 'Simulador', icon: '⚙' },
  { to: '/help', label: 'Guía de uso', icon: '?' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot">{EVENT.short}</span> {EVENT.name}
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span style={{ width: 18, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <b>{user?.nombre}</b>
            {user?.email} · {user?.rol}
          </div>
          <button className="btn btn-block btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
