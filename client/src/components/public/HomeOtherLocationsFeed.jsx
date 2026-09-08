import { useEffect, useMemo, useRef, useState } from 'react';
import HomeNewProperties from './HomeNewProperties';
import HomeProminentProjects from './HomeProminentProjects';

const CITIES_PER_BATCH = 2;

export default function HomeOtherLocationsFeed({
  cities = [],
  currentCityId,
  searchPath = '/search',
  heroTab = 'sale',
  tabFilters = null,
}) {
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const otherCities = useMemo(
    () => cities.filter((city) => String(city.id) !== String(currentCityId)),
    [cities, currentCityId]
  );

  const visibleCities = otherCities.slice(0, visibleCount);
  const hasMore = visibleCount < otherCities.length;
  const showProjects = heroTab === 'sale' || heroTab === 'commercial' || heroTab === 'plots';
  const showBuyPlotsExtras = heroTab === 'sale';

  useEffect(() => {
    setVisibleCount(0);
  }, [currentCityId, otherCities.length, heroTab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingRef.current) return;
        loadingRef.current = true;
        setVisibleCount((count) => Math.min(count + CITIES_PER_BATCH, otherCities.length));
      },
      { rootMargin: '240px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, otherCities.length, visibleCount]);

  useEffect(() => {
    loadingRef.current = false;
  }, [visibleCount]);

  if (!otherCities.length) {
    return null;
  }

  const filters = tabFilters || {
    purpose: 'sale',
    listingKind: 'property',
  };

  return (
    <div className="home-other-locations">
      {visibleCities.length > 0 && (
        <div className="container home-other-locations-intro">
          <h2 className="home-other-locations-title">Explore other cities</h2>
          <p className="home-other-locations-subtitle text-secondary mb-0">
            Scroll to discover more {filters.label?.toLowerCase() || 'listings'} across India.
          </p>
        </div>
      )}

      {visibleCities.map((city) => (
        <div key={city.id} className="home-other-location-block">
          {showProjects && (
            <HomeProminentProjects
              cityId={city.id}
              cityName={city.name}
              title={`Projects in ${city.name}`}
              viewAllTo={`/projects?cityId=${encodeURIComponent(city.id)}`}
            />
          )}
          <HomeNewProperties
            cityId={city.id}
            cityName={city.name}
            purpose={filters.purpose}
            categoryId={filters.categoryId}
            propertyTypeId={filters.propertyTypeId}
            listingKind={filters.listingKind}
            title={`${filters.label || 'Properties'} in ${city.name}`}
            searchPath={searchPath}
            className={heroTab === 'plots' ? 'home-new-plots' : ''}
          />
          {showBuyPlotsExtras && (
            <HomeNewProperties
              cityId={city.id}
              cityName={city.name}
              listingKind="plot"
              purpose="sale"
              title={`Plots in ${city.name}`}
              className="home-new-plots"
              searchPath={searchPath}
            />
          )}
        </div>
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="home-scroll-sentinel" aria-hidden>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading more locations…</span>
          </div>
        </div>
      )}
    </div>
  );
}
