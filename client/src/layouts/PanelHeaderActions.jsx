import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { PANEL_HOME, PANELS_WITHOUT_SIDEBAR, ROLE_CODES } from '../constants';
import { logout } from '../redux/slices/authSlice';
import { toggleTheme } from '../redux/slices/uiSlice';
import { disconnectSocket } from '../services/socket';

export default function PanelHeaderActions({ housingStyle = false, menuOpen = false, onMenuToggle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { theme } = useSelector((s) => s.ui);

  const roleCode = user?.role?.code;
  const navInHeader = PANELS_WITHOUT_SIDEBAR.includes(roleCode);

  const settingsPath = roleCode
    ? PANEL_HOME[roleCode]?.replace('/dashboard', '/settings')
    : '/login';

  const profilePath = roleCode === ROLE_CODES.BUYER
    ? '/panel/buyer/profile'
    : settingsPath;

  const handleLogout = async () => {
    disconnectSocket();
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account';

  if (housingStyle) {
    return (
      <div className="home-panel-actions d-flex align-items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          className="home-panel-icon-btn"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle theme"
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
        </button>
        <div className="home-panel-user-combo dropdown">
          <button
            type="button"
            className="home-panel-user-combo-name dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {displayName}
          </button>
          <span className="home-panel-user-combo-divider" aria-hidden />
          <button
            type="button"
            className="home-panel-user-combo-menu"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <span className="dropdown-item-text small text-secondary">{user?.email}</span>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button type="button" className="dropdown-item" onClick={() => navigate(profilePath)}>
                Profile
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="home-panel-actions d-flex align-items-center gap-2">
      <NotificationBell />
      <button
        type="button"
        className="home-panel-icon-btn"
        onClick={() => dispatch(toggleTheme())}
        aria-label="Toggle theme"
      >
        <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
      </button>
      <div className="dropdown">
        <button
          className="home-panel-user-btn dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          {displayName}
        </button>
        <ul className="dropdown-menu dropdown-menu-end">
          <li>
            <span className="dropdown-item-text small text-secondary">{user?.email}</span>
          </li>
          {!navInHeader && (
            <>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => navigate(settingsPath)}
                >
                  Account settings
                </button>
              </li>
            </>
          )}
          <li><hr className="dropdown-divider" /></li>
          <li>
            <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
