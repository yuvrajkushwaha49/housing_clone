import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PropertySearchCard from './PropertySearchCard';
import { propertyService } from '../../services';

async function fetchNearbyProperties({ city, locality, excludePropertyId, limit = 8 }) {
  const collected = [];

  const addUnique = (list) => {
    for (const item of list) {
      if (excludePropertyId && item.id === excludePropertyId) continue;
      if (collected.some((p) => p.id === item.id)) continue;
      collected.push(item);
      if (collected.length >= limit) break;
    }
  };

  if (locality?.id) {
    const { data } = await propertyService.search({
      page: 1,
      limit: limit + 1,
      sort: 'newest',
      localityId: locality.id,
    });
    addUnique(data.data || []);
  }

  if (collected.length < limit && city?.id) {
    const { data } = await propertyService.search({
      page: 1,
      limit: limit + 4,
      sort: 'newest',
      cityId: city.id,
    });
    addUnique(data.data || []);
  }

  return collected.slice(0, limit);
}

function resolveLocation(property, location) {
  return {
    city: location?.city ?? property?.city,
    locality: location?.locality ?? property?.locality,
  };
}

export default function PropertyNearbySection({ property, location, excludePropertyId, className = '' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { city, locality } = resolveLocation(property, location);
  const excludeId = excludePropertyId ?? property?.id;

  const locationLabel = [locality?.name, city?.name].filter(Boolean).join(', ');

  const viewAllUrl = useMemo(() => {
    const params = new URLSearchParams({ sort: 'newest' });
    if (city?.id) params.set('cityId', city.id);
    if (locality?.id) params.set('localityId', locality.id);
    return `/search?${params.toString()}`;
  }, [city?.id, locality?.id]);

  useEffect(() => {
    if (!city?.id && !locality?.id) return;
    setLoading(true);
    fetchNearbyProperties({ city, locality, excludePropertyId: excludeId })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [city, locality, excludeId]);

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className={`property-nearby-section ${className}`.trim()}>
      <div className="container">
        <div className="home-prominent-head">
          <div>
            <h2>More properties in this area</h2>
            <p>
              Explore other listings
              {locationLabel ? ` in ${locationLabel}` : ' nearby'}.
            </p>
          </div>
          <Link to={viewAllUrl} className="home-view-all">
            View all in area →
          </Link>
        </div>

        {loading ? (
          <div className="property-search-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="property-search-card property-search-card--skeleton">
                <div className="property-search-card-image skeleton-block" />
                <div className="property-search-card-body">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="property-search-grid">
            {items.map((item) => (
              <PropertySearchCard key={item.id} property={item} showActions={false} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
