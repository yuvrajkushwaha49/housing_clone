import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services';
import { getHomeMasters, resolveHeroTabFilters } from '../../utils/homeMastersCache';
import buyHeroBg from '../../assets/hero_bg.png';
import rentHeroBg from '../../assets/rent_bg_hero.png';
import commercialHeroBg from '../../assets/commercial_hero_section.png';
import pgHeroBg from '../../assets/pg_hero_bg.png';
import plotsHeroBg from '../../assets/plots_hero_bg.png';

const TABS = [
  { id: 'sale', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'pg', label: 'PG/Co-living' },
  { id: 'plots', label: 'Plots' },
];

const HERO_BACKGROUNDS = {
  sale: buyHeroBg,
  rent: rentHeroBg,
  commercial: commercialHeroBg,
  pg: pgHeroBg,
  plots: plotsHeroBg,
};

function formatCount(n) {
  if (n == null) return null;
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(k >= 1 ? 0 : 1).replace(/\.0$/, '')}K+`;
  }
  return `${n.toLocaleString('en-IN')}+`;
}

export default function HomeHeroSearch({
  cityId,
  cityName,
  localities = [],
  loadingLocalities = false,
  searchPath = '/search',
  activeTab: activeTabProp,
  onTabChange,
}) {
  const navigate = useNavigate();
  const chipsRef = useRef(null);
  const [internalTab, setInternalTab] = useState('sale');
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = (tab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [propertyCount, setPropertyCount] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    getHomeMasters()
      .then(({ categories: cats, types: tps }) => {
        setCategories(cats);
        setTypes(tps);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tabFilters = resolveHeroTabFilters(activeTab, categories, types);
    propertyService
      .search({
        page: 1,
        limit: 1,
        cityId: cityId || undefined,
        purpose: tabFilters.purpose,
        categoryId: tabFilters.categoryId,
        propertyTypeId: tabFilters.propertyTypeId,
        kind: tabFilters.listingKind,
      })
      .then((res) => setPropertyCount(res.data.meta?.total ?? 0))
      .catch(() => setPropertyCount(null));
  }, [activeTab, cityId, categories, types]);

  const buildSearchParams = (extra = {}) => {
    const tabFilters = resolveHeroTabFilters(activeTab, categories, types);
    const params = new URLSearchParams();

    params.set('purpose', tabFilters.purpose);
    if (cityId) params.set('cityId', cityId);
    if (tabFilters.categoryId) params.set('categoryId', tabFilters.categoryId);
    if (tabFilters.propertyTypeId) params.set('propertyTypeId', tabFilters.propertyTypeId);
    if (q.trim()) params.set('q', q.trim());

    Object.entries(extra).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return params;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`${searchPath}?${buildSearchParams().toString()}`);
  };

  const handleLocalityClick = (locality) => {
    navigate(`${searchPath}?${buildSearchParams({ localityId: locality.id }).toString()}`);
  };

  const scrollChips = (dir) => {
    chipsRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };

  const popularLocalities = localities.slice(0, 8);
  const countLabel = formatCount(propertyCount);
  const headlinePurpose =
    activeTab === 'rent'
      ? 'rent in'
      : activeTab === 'pg'
        ? 'for PG & co-living in'
        : activeTab === 'plots'
          ? 'plots in'
          : activeTab === 'commercial'
            ? 'for commercial in'
            : 'buy in';

  return (
    <section
      className="home-hero"
      style={{ backgroundImage: `url(${HERO_BACKGROUNDS[activeTab] || buyHeroBg})` }}
    >
      <div className="home-hero-overlay" aria-hidden />
      <div className="container home-hero-inner">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Properties to {headlinePurpose} {cityName || 'your city'}
          </h1>
          <p className="home-hero-subtitle">
            {countLabel
              ? `${countLabel} listings available and verified`
              : 'Fresh listings added daily and verified'}
          </p>

          <div className="home-search-widget">
            <div className="home-search-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`home-search-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form className="home-search-form" onSubmit={handleSearch}>
              <div className="home-search-bar">
                <div className="home-search-field home-search-field--grow">
                  <i className="bi bi-search" aria-hidden />
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search for locality, landmark, project, or builder"
                    aria-label="Search keyword"
                  />
                </div>
                <button type="submit" className="home-search-submit">
                  Search
                </button>
              </div>
            </form>
          </div>

          {(loadingLocalities || popularLocalities.length > 0) && (
            <div className="home-popular-localities">
              <span className="home-popular-label">
                <i className="bi bi-geo-alt" aria-hidden />
                Popular Localities
              </span>
              {loadingLocalities ? (
                <span className="home-popular-loading">Loading…</span>
              ) : (
                <div className="home-locality-chips-wrap">
                  <div className="home-locality-chips" ref={chipsRef}>
                    {popularLocalities.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        className="home-locality-chip"
                        onClick={() => handleLocalityClick(loc)}
                      >
                        {loc.name}
                        <i className="bi bi-chevron-right" aria-hidden />
                      </button>
                    ))}
                  </div>
                  {popularLocalities.length > 4 && (
                    <button
                      type="button"
                      className="home-locality-scroll"
                      onClick={() => scrollChips(1)}
                      aria-label="Scroll localities"
                    >
                      <i className="bi bi-chevron-right" aria-hidden />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="home-owner-banner">
            <span>✨ Are you a Property Owner?</span>
            <Link to="/register?role=OWNER">Sell / Rent for FREE &gt;</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
