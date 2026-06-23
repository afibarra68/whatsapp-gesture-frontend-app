import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EVENT } from '../config';
import { navItemsForRole } from '../navigation';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = navItemsForRole(user?.rol);

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
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <b>{user?.nombre}</b>
            {user?.email} · {user?.rol}
          </div>
          <button type="button" className="btn btn-block btn-sm" onClick={handleLogout}>
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
