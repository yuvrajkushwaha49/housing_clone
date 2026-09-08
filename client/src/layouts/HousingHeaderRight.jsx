import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PANEL_HOME } from '../constants';

export default function HousingHeaderRight({
  isBuyerPanel = false,
  menuOpen = false,
  onMenuToggle,
}) {
  const { accessToken, user } = useSelector((s) => s.auth);

  const panelHome = user?.role?.code ? PANEL_HOME[user.role.code] : null;
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Login';
  const loginTarget = accessToken && panelHome ? panelHome : '/login';
  const loginLabel = accessToken && panelHome && isBuyerPanel
    ? displayName
    : (accessToken && panelHome ? 'My panel' : 'Login');

  return (
    <div className="home-housing-actions">
      <Link to="/coming-soon" className="home-housing-action-link d-none d-lg-inline">
        Download App
      </Link>
      <Link to="/register?role=OWNER" className="home-housing-action-link d-none d-md-inline">
        Post Property
        <span className="home-free-badge">FREE</span>
      </Link>

      <div className="home-housing-login-combo">
        <Link to={loginTarget} className="home-housing-login-text">
          {loginLabel}
        </Link>
        <span className="home-housing-login-divider" aria-hidden />
        <button
          type="button"
          className="home-housing-login-menu"
          onClick={onMenuToggle}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} />
        </button>
      </div>
    </div>
  );
}
