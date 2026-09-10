import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomeMasters } from '../../utils/homeMastersCache';
import { buildHeaderMegaMenus, HEADER_NAV_ITEMS } from '../../utils/headerNavConfig';

export default function HousingHeaderNav({
  isBuyerPanel = false,
  onNavigate,
  onMegaMenuChange,
  activeMenuId,
  variant = 'bar',
  cityId,
  localities = [],
}) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedMobileId, setExpandedMobileId] = useState(null);
  const [masters, setMasters] = useState({ categories: [], types: [] });

  const searchPath = isBuyerPanel ? '/panel/buyer/search' : '/search';

  useEffect(() => {
    getHomeMasters()
      .then(({ categories, types }) => setMasters({ categories, types }))
      .catch(() => {});
  }, []);

  const megaMenus = useMemo(
    () => buildHeaderMegaMenus({
      searchPath,
      cityId,
      localities,
      types: masters.types,
      categories: masters.categories,
      isBuyerPanel,
    }),
    [searchPath, cityId, localities, masters, isBuyerPanel]
  );

  const handleOpen = (menuId) => {
    setOpenMenuId(menuId);
    onMegaMenuChange?.(megaMenus[menuId] || null);
  };

  const handleNavigate = (to) => {
    setOpenMenuId(null);
    setExpandedMobileId(null);
    onMegaMenuChange?.(null);
    onNavigate?.();
    if (to) navigate(to);
  };

  useEffect(() => () => {
    onMegaMenuChange?.(null);
  }, [onMegaMenuChange]);

  useEffect(() => {
    if (!activeMenuId) setOpenMenuId(null);
  }, [activeMenuId]);

  const isDrawer = variant === 'drawer';

  return (
    <div
      className={`home-housing-nav-wrap${isDrawer ? ' home-housing-nav-wrap--drawer' : ''}${openMenuId ? ' is-mega-open' : ''}`.trim()}
    >
      <nav className={`home-housing-nav${isDrawer ? ' home-housing-nav--drawer' : ''}`}>
        {HEADER_NAV_ITEMS.map((item) => {
          const menu = megaMenus[item.id];
          const isOpen = isDrawer ? expandedMobileId === item.id : openMenuId === item.id;

          return (
            <div
              key={item.id}
              className={`home-housing-nav-item${isOpen ? ' is-open' : ''}`}
              onMouseEnter={!isDrawer ? () => handleOpen(item.id) : undefined}
            >
              {isDrawer ? (
                <button
                  type="button"
                  className="home-housing-nav-btn home-housing-nav-btn--toggle"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedMobileId((current) => (current === item.id ? null : item.id))}
                >
                  {item.label}
                  <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="home-housing-nav-btn"
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  onClick={() => handleOpen(item.id)}
                  onFocus={() => handleOpen(item.id)}
                >
                  {item.label}
                  <i className="bi bi-chevron-down" aria-hidden />
                </button>
              )}

              {isDrawer && isOpen && menu && (
                <div className="home-housing-mega home-housing-mega--drawer">
                  <div className="home-housing-mega-inner">
                    <div className="home-housing-mega-grid home-housing-mega-grid--drawer">
                      {menu.columns.map((column) => (
                        <div key={column.title} className="home-housing-mega-drawer-group">
                          <h3 className="home-housing-mega-col-title">{column.title}</h3>
                          <ul className="home-housing-mega-list">
                            {column.items.map((linkItem) => (
                              <li key={`${column.title}-${linkItem.label}`}>
                                <button
                                  type="button"
                                  className="home-housing-mega-link home-housing-mega-link--drawer"
                                  onClick={() => handleNavigate(linkItem.to)}
                                >
                                  {linkItem.icon && <i className={`bi ${linkItem.icon}`} aria-hidden />}
                                  <span>{linkItem.label}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
