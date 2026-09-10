import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropertyQualityBadge from '../properties/PropertyQualityBadge';
import { formatPropertyPrice, formatPropertyPurpose, isPlotProperty } from '../properties/propertyUtils';
import { mediaUrl, propertyService } from '../../services';
import { useSaveProperty } from '../../hooks/useSaveItem';

function PropertyCard({ property, onSave }) {
  const saveProperty = useSaveProperty();
  const thumb = property.primaryImageUrl ? mediaUrl(property.primaryImageUrl) : null;
  const location = [property.locality?.name, property.city?.name].filter(Boolean).join(', ');
  const spec = isPlotProperty(property)
    ? [property.area, property.areaUnit?.name].filter(Boolean).join(' ') || property.propertyType?.name
    : property.bedrooms
      ? `${property.bedrooms} BHK`
      : property.propertyType?.name;

  const handleSave = (e) => {
    if (onSave) {
      onSave(e, property.id);
      return;
    }
    saveProperty(e, property.id);
  };

  const saveLabel = isPlotProperty(property) ? 'Save plot' : 'Save property';

  return (
    <article className="home-card-wrap home-card-wrap-prominent">
      <button
        type="button"
        className="home-card-save-btn"
        onClick={handleSave}
        aria-label={saveLabel}
      >
        <i className="bi bi-heart" aria-hidden />
      </button>
      <Link to={`/property/${property.slug}`} className="home-property-card text-decoration-none">
        <div className="home-property-card-image">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="home-property-card-placeholder" aria-hidden>
              <i className="bi bi-house-door" />
            </div>
          )}
          <span className="home-property-purpose-badge">
            {formatPropertyPurpose(property.purpose)}
          </span>
        </div>
        <div className="home-property-card-body">
          <h3 className="home-property-card-title">{property.title}</h3>
          {location && (
            <p className="home-property-card-location">
              <i className="bi bi-geo-alt" aria-hidden />
              {location}
            </p>
          )}
          <div className="home-property-card-footer">
            <span className="home-property-card-price">
              {formatPropertyPrice(property.price)}
            </span>
            <div className="home-property-card-meta">
              {spec && <span className="home-property-spec-badge">{spec}</span>}
              <PropertyQualityBadge rating={property.reviewAverageRating} />
            </div>
          </div>
          <span className="home-property-contact">Contact</span>
        </div>
      </Link>
    </article>
  );
}

export default function HomeNewProperties({
  cityId,
  cityName,
  excludePropertyId,
  className = '',
  title = 'Newly-added properties',
  subtitle,
  propertyTypeId,
  excludePropertyTypeId,
  listingKind,
  categoryId,
  purpose,
  viewAllTo,
  viewAllLabel,
  embedded = false,
  searchPath = '/search',
  showEmpty = false,
}) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const isPlotSection = listingKind === 'plot' || Boolean(propertyTypeId);
  const defaultTitle = isPlotSection ? 'Plots' : 'Properties';
  const defaultSubtitle = isPlotSection
    ? `Residential and commercial plots${cityName ? ` in ${cityName}` : ''} — explore land listings today.`
    : `Fresh listings to check out${cityName ? ` in ${cityName}` : ''}.`;

  useEffect(() => {
    setLoading(true);
    propertyService
      .search({
        page: 1,
        limit: excludePropertyId ? 9 : 8,
        sort: 'newest',
        cityId: cityId || undefined,
        purpose: purpose || undefined,
        kind: listingKind || undefined,
        propertyTypeId: listingKind ? undefined : (propertyTypeId || undefined),
        excludePropertyTypeId: listingKind ? undefined : (excludePropertyTypeId || undefined),
        categoryId: categoryId || undefined,
      })
      .then((res) => {
        let items = res.data.data || [];
        if (excludePropertyId) {
          items = items.filter((item) => item.id !== excludePropertyId);
        }
        setProperties(items.slice(0, 8));
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [cityId, excludePropertyId, propertyTypeId, excludePropertyTypeId, listingKind, categoryId, purpose]);

  const viewAllUrl = viewAllTo || (() => {
    const params = new URLSearchParams({ sort: 'newest' });
    if (cityId) params.set('cityId', cityId);
    if (purpose) params.set('purpose', purpose);
    if (categoryId) params.set('categoryId', categoryId);
    if (propertyTypeId) params.set('propertyTypeId', propertyTypeId);
    if (isPlotSection && !purpose) params.set('purpose', 'sale');
    return `${searchPath}?${params.toString()}`;
  })();

  const sectionTitle = title || defaultTitle;
  const sectionViewAllLabel = viewAllLabel || (isPlotSection ? 'View all plots →' : 'View all properties →');

  if (!loading && properties.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <section className={`home-new-properties ${className} ${embedded ? 'is-embedded panel-card' : ''}`.trim()}>
      <div className={embedded ? 'home-embedded-section-inner' : 'container'}>
        <div className="home-prominent-head">
          <div>
            <h2>{sectionTitle}</h2>
            <p>{subtitle ?? defaultSubtitle}</p>
          </div>
          <Link to={viewAllUrl} className="home-view-all">
            {sectionViewAllLabel}
          </Link>
        </div>

        {loading ? (
          <div className="home-property-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-property-card home-property-card--skeleton">
                <div className="home-property-card-image skeleton-block" />
                <div className="home-property-card-body">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <p className="text-secondary mb-0 py-3">No listings found for this filter. Try another city or tab.</p>
        ) : (
          <div className="home-property-grid">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
