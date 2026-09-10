import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import HomeHeroSearch, { getHeroBackground } from './HomeHeroSearch';
import HomeTopPicks from './HomeTopPicks';
import HomeProminentProjects from './HomeProminentProjects';
import HomeFeaturedDevelopers from './HomeFeaturedDevelopers';
import HomeTrustedProjects from './HomeTrustedProjects';
import HomeHighDemandProjects from './HomeHighDemandProjects';
import HomeRecommendedSellers from './HomeRecommendedSellers';
import HomeNewProperties from './HomeNewProperties';
import HomeOtherLocationsFeed from './HomeOtherLocationsFeed';
import HomeResearchTools from './HomeResearchTools';
import { useHomeLocationsContext } from '../../contexts/HomeLocationsContext';
import { cmsService, mediaUrl } from '../../services';
import {
  getCommercialCategoryId,
  getHomeMasters,
  getPlotTypeId,
  resolveHeroTabFilters,
} from '../../utils/homeMastersCache';

function buildFeatureCards(commercialCategoryId, plotTypeId, searchPath = '/search') {
  return [
    {
      title: 'Buy a Home',
      desc: 'Apartments, villas & builder floors',
      icon: 'bi-house-heart',
      to: `${searchPath}?purpose=sale`,
      accent: '#5a2dcf',
    },
    {
      title: 'Rent a Home',
      desc: 'Verified owners & hassle-free search',
      icon: 'bi-key',
      to: `${searchPath}?purpose=rent`,
      accent: '#3f2799',
    },
    {
      title: 'PG & Co-living',
      desc: 'Budget-friendly shared spaces',
      icon: 'bi-people',
      to: `${searchPath}?purpose=pg`,
      accent: '#6d45d8',
    },
    {
      title: 'Commercial',
      desc: 'Shops, offices & warehouses',
      icon: 'bi-building',
      to: commercialCategoryId
        ? `${searchPath}?purpose=sale&categoryId=${commercialCategoryId}`
        : `${searchPath}?purpose=sale`,
      accent: '#2a1a6e',
    },
    {
      title: 'Plots / Land',
      desc: 'Residential & commercial plots',
      icon: 'bi-map',
      to: plotTypeId
        ? `${searchPath}?purpose=sale&propertyTypeId=${plotTypeId}`
        : `${searchPath}?purpose=sale`,
      accent: '#4b28b5',
    },
    {
      title: 'Post Plot',
      desc: 'List your land for free',
      icon: 'bi-pin-map',
      to: '/register?role=OWNER',
      accent: '#3a2088',
      badge: 'FREE',
    },
    {
      title: 'Post Property',
      desc: 'List for free — reach buyers fast',
      icon: 'bi-megaphone',
      to: '/register?role=OWNER',
      accent: '#d8232a',
      badge: 'FREE',
    },
  ];
}

function tabSectionCopy(tab, cityName) {
  const inCity = cityName ? ` in ${cityName}` : '';
  switch (tab) {
    case 'rent':
      return {
        title: 'Homes for rent',
        subtitle: `Verified rentals${inCity} — fresh listings added recently.`,
        viewAllLabel: 'View all rentals →',
      };
    case 'pg':
      return {
        title: 'PG & co-living',
        subtitle: `Shared stays and PGs${inCity} — budget-friendly options.`,
        viewAllLabel: 'View all PG listings →',
      };
    case 'commercial':
      return {
        title: 'Commercial properties',
        subtitle: `Shops, offices and warehouses${inCity}.`,
        viewAllLabel: 'View all commercial →',
      };
    case 'plots':
      return {
        title: 'Plots',
        subtitle: `Residential and commercial plots${inCity} — explore land listings today.`,
        viewAllLabel: 'View all plots →',
      };
    default:
      return {
        title: 'Properties',
        subtitle: `Homes and apartments${inCity} — fresh listings added recently.`,
        viewAllLabel: 'View all properties →',
      };
  }
}

export default function HomePageContent({
  searchPath = '/search',
  className = '',
  showHero = true,
  header = null,
  cityId: cityIdProp,
  setCityId: setCityIdProp,
  cityName: cityNameProp,
  localities: localitiesProp,
  loadingLocalities: loadingLocalitiesProp,
}) {
  const [blogs, setBlogs] = useState([]);
  const [heroTab, setHeroTab] = useState('sale');
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const contextLocations = useHomeLocationsContext();
  const {
    cities,
    localities,
    cityId,
    setCityId,
    cityName,
    loadingLocalities,
  } = {
    cities: contextLocations.cities,
    localities: localitiesProp ?? contextLocations.localities,
    cityId: cityIdProp ?? contextLocations.cityId,
    setCityId: setCityIdProp ?? contextLocations.setCityId,
    cityName: cityNameProp ?? contextLocations.cityName,
    loadingLocalities: loadingLocalitiesProp ?? contextLocations.loadingLocalities,
  };

  useEffect(() => {
    cmsService.listBlogs({ limit: 3 }).then((res) => setBlogs(res.data.data)).catch(() => {});
    getHomeMasters()
      .then(({ categories: cats, types: tps }) => {
        setCategories(cats);
        setTypes(tps);
      })
      .catch(() => {});
  }, []);

  const commercialCategoryId = useMemo(() => getCommercialCategoryId(categories), [categories]);
  const plotTypeId = useMemo(() => getPlotTypeId(types), [types]);
  const tabFilters = useMemo(
    () => resolveHeroTabFilters(heroTab, categories, types),
    [heroTab, categories, types]
  );
  const sectionCopy = useMemo(() => tabSectionCopy(heroTab, cityName), [heroTab, cityName]);
  const showProjects = heroTab === 'sale' || heroTab === 'commercial' || heroTab === 'plots';
  const showBuyPlotsExtras = heroTab === 'sale';

  const featureCards = useMemo(
    () => buildFeatureCards(commercialCategoryId, plotTypeId, searchPath),
    [commercialCategoryId, plotTypeId, searchPath]
  );

  return (
    <div className={className}>
      {header}

      {showHero ? (
        <div
          className="home-masthead"
          style={{ backgroundImage: `url(${getHeroBackground(heroTab)})` }}
        >
          <div className="home-masthead-overlay" aria-hidden />
          <HomeHeroSearch
            cityId={cityId}
            cityName={cityName}
            cities={cities}
            localities={localities}
            loadingLocalities={loadingLocalities}
            onCityChange={setCityId}
            searchPath={searchPath}
            activeTab={heroTab}
            onTabChange={setHeroTab}
            embedded
          />
        </div>
      ) : null}

      {showProjects && <HomeTopPicks cityId={cityId} />}

      {showProjects && <HomeProminentProjects cityId={cityId} cityName={cityName} />}

      {showProjects && <HomeFeaturedDevelopers cityId={cityId} />}

      {showProjects && <HomeTrustedProjects cityId={cityId} />}

      {showProjects && <HomeHighDemandProjects cityId={cityId} />}

      {showProjects && <HomeRecommendedSellers cityId={cityId} />}

      <HomeNewProperties
        key={`hero-listings-${heroTab}-${cityId || 'all'}`}
        cityId={cityId}
        cityName={cityName}
        purpose={tabFilters.purpose}
        categoryId={tabFilters.categoryId}
        propertyTypeId={tabFilters.propertyTypeId}
        listingKind={tabFilters.listingKind}
        title={sectionCopy.title}
        subtitle={sectionCopy.subtitle}
        viewAllLabel={sectionCopy.viewAllLabel}
        searchPath={searchPath}
        showEmpty
        className={heroTab === 'plots' ? 'home-new-plots' : ''}
      />

      {showBuyPlotsExtras && (
        <HomeNewProperties
          cityId={cityId}
          cityName={cityName}
          listingKind="plot"
          purpose="sale"
          title="Plots"
          searchPath={searchPath}
          className="home-new-plots"
        />
      )}

      <HomeResearchTools />

      <HomeOtherLocationsFeed
        cities={cities}
        currentCityId={cityId}
        searchPath={searchPath}
        heroTab={heroTab}
        tabFilters={tabFilters}
      />

      <section className="home-features">
        <div className="container">
          <div className="home-section-head home-section-head--left">
            <h2>We&apos;ve got properties for everyone</h2>
            <p>Whether you&apos;re buying, renting, or listing — start your journey with {cityName || 'us'}.</p>
          </div>
          <div className="home-feature-grid">
            {featureCards.map((card) => (
              <Link key={card.title} to={card.to} className="home-feature-card text-decoration-none">
                <div className="home-feature-icon" style={{ background: card.accent }}>
                  <i className={`bi ${card.icon}`} aria-hidden />
                </div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                {card.badge && <span className="home-feature-badge">{card.badge}</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-quick-links">
        <div className="container">
          <div className="row g-3">
            <div className="col-md-4">
              <Link to="/projects" className="home-quick-card">
                <i className="bi bi-buildings" aria-hidden />
                <div>
                  <strong>New Projects</strong>
                  <span>Explore builder launches &amp; floor plans</span>
                </div>
              </Link>
            </div>
            <div className="col-md-4">
              <Link to={`${searchPath}?purpose=rent`} className="home-quick-card">
                <i className="bi bi-calendar-check" aria-hidden />
                <div>
                  <strong>Schedule a Visit</strong>
                  <span>Book site visits for shortlisted homes</span>
                </div>
              </Link>
            </div>
            <div className="col-md-4">
              <Link to="/register" className="home-quick-card">
                <i className="bi bi-person-plus" aria-hidden />
                <div>
                  <strong>Create Account</strong>
                  <span>Save, compare &amp; track your search</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {blogs.length > 0 && (
        <section className="home-blog">
          <div className="container">
            <div className="home-prominent-head">
              <div>
                <h2>News &amp; Guides</h2>
                <p>Tips for buyers, sellers, and investors</p>
              </div>
              <Link to="/blog" className="home-view-all">View all →</Link>
            </div>
            <div className="row g-3">
              {blogs.map((b) => {
                const cover = b.coverImage ? mediaUrl(b.coverImage) : null;
                return (
                  <div className="col-md-4" key={b.id}>
                    <article className="home-blog-card">
                      {cover && (
                        <Link to={`/blog/${b.slug}`} className="home-blog-card-media">
                          <img src={cover} alt="" loading="lazy" />
                        </Link>
                      )}
                      <div className="home-blog-card-body">
                        <h3>
                          <Link to={`/blog/${b.slug}`}>{b.title}</Link>
                        </h3>
                        <p>{b.excerpt}</p>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
