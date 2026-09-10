import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { APP_NAME, PANEL_HOME, ROLE_CODES } from '../../constants';
import { setSidebarMobileOpen, toggleSidebar } from '../../redux/slices/uiSlice';
import PanelHeaderActions from '../../layouts/PanelHeaderActions';
import HousingHeaderRight from '../../layouts/HousingHeaderRight';
import HousingCitySelect from './HousingCitySelect';
import HousingHeaderNav from './HousingHeaderNav';
import HousingMegaMenu from './HousingMegaMenu';
import BuyerPanelMenu from './BuyerPanelMenu';
import { BrandLogo } from '../BrandAssets';

function HousingHeaderBar({
  logoTo,
  cities,
  selectedCityId,
  cityName,
  localities = [],
  onCityChange,
  isBuyerPanel,
  menuOpen,
  onMenuToggle,
  onNavigate,
}) {
  const [megaMenu, setMegaMenu] = useState(null);

  const handleMegaClose = () => {
    setMegaMenu(null);
  };

  return (
    <div
      className={`home-header-housing${megaMenu ? ' is-mega-open' : ''}`}
      onMouseLeave={megaMenu ? handleMegaClose : undefined}
    >
      <div className="home-header-housing-inner">
        <div className="home-header-housing-left">
          <Link to={logoTo} className="home-logo home-logo--housing text-decoration-none" aria-label={APP_NAME}>
            <BrandLogo className="brand-logo--housing" />
          </Link>
          <HousingCitySelect
            cities={cities}
            selectedCityId={selectedCityId}
            cityName={cityName}
            onCityChange={onCityChange}
          />
        </div>

        <div className="home-header-housing-center d-none d-xl-flex">
          <HousingHeaderNav
            isBuyerPanel={isBuyerPanel}
            onNavigate={onNavigate}
            onMegaMenuChange={setMegaMenu}
            activeMenuId={megaMenu?.id}
            cityId={selectedCityId}
            localities={localities}
          />
        </div>

        <div className="home-header-housing-right">
          <HousingHeaderRight
            menuOpen={menuOpen}
            onMenuToggle={onMenuToggle}
          />
        </div>
      </div>

      {megaMenu && (
        <div className="home-housing-mega-panel">
          <div className="container">
            <HousingMegaMenu
              menu={megaMenu}
              onNavigate={() => {
                handleMegaClose();
                onNavigate?.();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeHeader({
  cities = [],
  selectedCityId,
  selectedCityName,
  onCityChange,
  showAllLocationsOption = false,
  localities = [],
  panelMode = false,
  hideSidebar = false,
  overlay = false,
  solid = false,
}) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const panelHome = user?.role?.code ? PANEL_HOME[user.role.code] : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(Boolean(solid));

  const selectedCity = cities.find((c) => String(c.id) === String(selectedCityId));
  const cityName = selectedCityName || selectedCity?.name;

  const isBuyerPanel = user?.role?.code === ROLE_CODES.BUYER;
  const useHousingLayout = !panelMode || isBuyerPanel;
  const logoTo = (isBuyerPanel || panelMode) && panelHome ? panelHome : '/';
  const showScrolledChrome = solid || (overlay && scrolled);

  useEffect(() => {
    if (solid) {
      setScrolled(true);
      return undefined;
    }
    if (!overlay) {
      setScrolled(false);
      return undefined;
    }

    const panelMain = document.querySelector('.panel-shell .app-main');

    const updateScrolled = () => {
      // Public pages scroll the window; buyer panel scrolls `.app-main`
      const y = Math.max(window.scrollY || 0, panelMain?.scrollTop || 0);
      setScrolled(y > 24);
    };

    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    panelMain?.addEventListener('scroll', updateScrolled, { passive: true });
    window.addEventListener('resize', updateScrolled);
    return () => {
      window.removeEventListener('scroll', updateScrolled);
      panelMain?.removeEventListener('scroll', updateScrolled);
      window.removeEventListener('resize', updateScrolled);
    };
  }, [overlay, solid]);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((v) => !v);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleSidebarMobile = () => {
    dispatch(setSidebarMobileOpen(true));
  };

  if (useHousingLayout) {
    return (
      <header
        className={`home-header home-header--housing${isBuyerPanel ? ' home-header--no-sidebar' : ''}${overlay || solid ? ' home-header--overlay' : ''}${showScrolledChrome ? ' is-scrolled' : ''}${solid ? ' home-header--solid' : ''}`.trim()}
      >
        <div className="home-header-top home-header-top--housing">
          <HousingHeaderBar
            logoTo={logoTo}
            cities={cities}
            selectedCityId={selectedCityId}
            cityName={cityName}
            localities={localities}
            onCityChange={onCityChange}
            isBuyerPanel={isBuyerPanel}
            menuOpen={menuOpen}
            onMenuToggle={toggleMenu}
            onNavigate={closeMenu}
          />
        </div>
        {menuOpen && (
          <>
            <button
              type="button"
              className="home-housing-side-drawer-backdrop"
              aria-label="Close menu"
              onClick={closeMenu}
            />
            <aside
              className="home-housing-side-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={isBuyerPanel ? 'Account menu' : 'Site menu'}
            >
              <div className="home-housing-side-drawer-head">
                <strong>{isBuyerPanel ? 'My menu' : 'Menu'}</strong>
                <button
                  type="button"
                  className="home-housing-side-drawer-close"
                  onClick={closeMenu}
                  aria-label="Close menu"
                >
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              </div>
              <div className="home-housing-side-drawer-body">
                {isBuyerPanel ? (
                  <BuyerPanelMenu roleCode={user?.role?.code} onNavigate={closeMenu} />
                ) : (
                  <HousingHeaderNav
                    isBuyerPanel={false}
                    onNavigate={closeMenu}
                    variant="drawer"
                    cityId={selectedCityId}
                    localities={localities}
                  />
                )}
              </div>
            </aside>
          </>
        )}
        {cityName && (
          <span className="visually-hidden">Properties in {cityName}</span>
        )}
      </header>
    );
  }

  return (
    <header className={`home-header ${panelMode ? 'home-header--panel' : ''}`.trim()}>
      <div className="home-header-top">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {panelMode && (
              <button
                type="button"
                className="home-panel-icon-btn d-none d-lg-inline-flex"
                onClick={() => dispatch(toggleSidebar())}
                aria-label="Toggle sidebar"
              >
                <i className="bi bi-layout-sidebar" />
              </button>
            )}
            <Link to={logoTo} className="home-logo text-decoration-none" aria-label={APP_NAME}>
              <BrandLogo className="brand-logo--panel" />
            </Link>
            {cities.length > 0 && (
              <div className="home-city-select">
                <i className="bi bi-geo-alt-fill" aria-hidden />
                <select
                  className="home-city-select-input"
                  value={selectedCityId || ''}
                  onChange={(e) => onCityChange?.(e.target.value)}
                  aria-label="Select location"
                >
                  {showAllLocationsOption && (
                    <option value="">All locations</option>
                  )}
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <PanelHeaderActions />
            <button
              type="button"
              className="home-menu-toggle d-lg-none"
              onClick={handleSidebarMobile}
              aria-label="Open panel menu"
            >
              <i className="bi bi-list" />
            </button>
          </div>
        </div>
      </div>

      {cityName && (
        <span className="visually-hidden">Properties in {cityName}</span>
      )}
    </header>
  );
}
