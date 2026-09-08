import { Link } from 'react-router-dom';
import PropertyQualityBadge from '../properties/PropertyQualityBadge';
import { formatPropertyPrice, formatPropertyPurpose, isPlotProperty } from '../properties/propertyUtils';
import { mediaUrl } from '../../services';

export default function PropertySearchCard({ property, onSave, onCompare, showActions = true }) {
  const thumb = property.primaryImageUrl ? mediaUrl(property.primaryImageUrl) : null;
  const location = [property.locality?.name, property.city?.name].filter(Boolean).join(', ');
  const spec = isPlotProperty(property)
    ? [property.area, property.areaUnit?.name].filter(Boolean).join(' ') || property.propertyType?.name
    : property.bedrooms
      ? `${property.bedrooms} BHK`
      : property.propertyType?.name;

  return (
    <article className="property-search-card">
      <Link to={`/property/${property.slug}`} className="property-search-card-link text-decoration-none">
        <div className="property-search-card-image">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="property-search-card-placeholder" aria-hidden>
              <i className="bi bi-house-door" />
            </div>
          )}
          <span className="property-search-card-purpose">
            {formatPropertyPurpose(property.purpose)}
          </span>
        </div>
        <div className="property-search-card-body">
          <h2 className="property-search-card-title">{property.title}</h2>
          {location && (
            <p className="property-search-card-location">
              <i className="bi bi-geo-alt" aria-hidden />
              {location}
            </p>
          )}
          <div className="property-search-card-price-row">
            <span className="property-search-card-price">
              {formatPropertyPrice(property.price)}
            </span>
            <div className="property-search-card-badges">
              {spec && <span className="property-search-spec">{spec}</span>}
              <PropertyQualityBadge rating={property.reviewAverageRating} />
            </div>
          </div>
        </div>
      </Link>
      {showActions && (
        <div className="property-search-card-actions">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={(e) => onSave?.(e, property.id)}>
            <i className="bi bi-heart" aria-hidden /> Save
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={(e) => onCompare?.(e, property.id)}>
            <i className="bi bi-layout-three-columns" aria-hidden /> Compare
          </button>
        </div>
      )}
    </article>
  );
}
