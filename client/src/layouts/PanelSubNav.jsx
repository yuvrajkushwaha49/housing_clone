import { NavLink } from 'react-router-dom';
import { NAV_BY_ROLE } from '../constants';

export default function PanelSubNav({
  roleCode,
  menuOpen = false,
  onNavigate,
  variant = 'bar',
}) {
  const items = NAV_BY_ROLE[roleCode] || [];
  const isInline = variant === 'inline';

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className={[
        'panel-sub-nav',
        isInline ? 'panel-sub-nav--inline' : 'home-nav-links',
        menuOpen ? 'open' : '',
      ].filter(Boolean).join(' ')}
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path.endsWith('/dashboard')}
          className={({ isActive }) => `home-nav-link${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          {!isInline && <i className={`bi ${item.icon}`} aria-hidden />}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
