import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { PANEL_HOME } from '../constants';
import { logout } from '../redux/slices/authSlice';
import { setSidebarMobileOpen, toggleSidebar, toggleTheme } from '../redux/slices/uiSlice';
import { disconnectSocket } from '../services/socket';

export default function Topbar({ title, breadcrumbs = [] }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { theme } = useSelector((s) => s.ui);

  const handleLogout = async () => {
    disconnectSocket();
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const settingsPath = user?.role?.code
    ? PANEL_HOME[user.role.code].replace('/dashboard', '/settings')
    : '/login';

  return (
    <header className="app-topbar">
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-lg-none"
          onClick={() => dispatch(setSidebarMobileOpen(true))}
          aria-label="Open menu"
        >
          <i className="bi bi-list" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-none d-lg-inline-flex"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-layout-sidebar" />
        </button>
        <div>
          <nav aria-label="breadcrumb" className="mb-0">
            <ol className="breadcrumb mb-0 small">
              {breadcrumbs.map((b, i) => (
                <li
                  key={b}
                  className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
                >
                  {b}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="h5 mb-0 fw-semibold">{title}</h1>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle theme"
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
        </button>
        <div className="dropdown">
          <button
            className="btn btn-sm btn-outline-secondary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {user?.firstName} {user?.lastName || ''}
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <span className="dropdown-item-text small text-secondary">{user?.email}</span>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button type="button" className="dropdown-item" onClick={() => navigate(settingsPath)}>
                Account settings
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
