import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { NAV_BY_ROLE } from '../../constants';
import { logout } from '../../redux/slices/authSlice';
import { disconnectSocket } from '../../services/socket';

export default function BuyerPanelMenu({ roleCode, onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[roleCode] || [];

  const handleLogout = async () => {
    disconnectSocket();
    await dispatch(logout());
    navigate('/login', { replace: true });
    onNavigate?.();
  };

  if (!items.length) {
    return null;
  }

  return (
    <nav className="home-housing-panel-menu">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path.endsWith('/dashboard')}
          className={({ isActive }) => `home-housing-panel-menu-link${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          <i className={`bi ${item.icon}`} aria-hidden />
          {item.label}
        </NavLink>
      ))}
      <button type="button" className="home-housing-panel-menu-link home-housing-panel-menu-logout" onClick={handleLogout}>
        <i className="bi bi-box-arrow-right" aria-hidden />
        Logout
      </button>
    </nav>
  );
}
