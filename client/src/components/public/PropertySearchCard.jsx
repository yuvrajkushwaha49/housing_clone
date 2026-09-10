import { Link } from 'react-router-dom';
import {
  formatPropertyPrice,
  formatPropertyPurpose,
  isPlotProperty,
} from '../properties/propertyUtils';
import { mediaUrl } from '../../services';

function areaValue(property) {
  return [property.area, property.areaUnit?.name].filter(Boolean).join(' ') || null;
}

function configLabel(property) {
  if (isPlotProperty(property)) {
    return property.propertyType?.name || 'Plot';
  }
  if (property.bedrooms) {
    return property.bedrooms === 1 && property.propertyType?.name?.toLowerCase().includes('rk')
      ? '1 RK'
      : `${property.bedrooms} BHK`;
  }
  return property.propertyType?.name || null;
}

function relativeUpdated(value) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `Updated ${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Updated ${days}d ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months}mo ago`;
}

function isNewListing(property) {
  const raw = property.publishedAt || property.createdAt;
  if (!raw) return false;
  const then = new Date(raw).getTime();
  if (Number.isNaN(then)) return false;
  return Date.now() - then < 7 * 24 * 60 * 60 * 1000;
}

function highlightBits(property) {
  const bits = [];
  if (property.parking) bits.push('Parking');
  if (property.balconies) bits.push('Balcony');
  if (property.constructionStatus?.name) bits.push(property.constructionStatus.name);
  if (property.facing?.name) bits.push(`${property.facing.name} facing`);
  if (isPlotProperty(property) && property.plotAmenities) {
    Object.entries(property.plotAmenities)
      .filter(([, v]) => v)
      .slice(0, 3)
      .forEach(([k]) => {
        bits.push(String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim());
      });
  }
  return bits.slice(0, 4);
}

export default function PropertySearchCard({ property, onSave, onCompare, showActions = true }) {
  const thumb = property.primaryImageUrl ? mediaUrl(property.primaryImageUrl) : null;
  const locality = property.locality?.name;
  const city = property.city?.name;
  const area = areaValue(property);
  const config = configLabel(property);
  const furnishing = property.furnishing?.name;
  const sponsored = Boolean(property.isFeatured || property.isPremium);
  const updated = relativeUpdated(property.publishedAt || property.createdAt);
  const highlights = highlightBits(property);
  const purposePhrase =
    property.purpose === 'sale'
      ? 'for sale'
      : formatPropertyPurpose(property.purpose).replace(/^For /, '').toLowerCase();
  const headline = [
    config,
    property.propertyType?.name && !String(config || '').includes(property.propertyType.name)
      ? property.propertyType.name
      : null,
    purposePhrase,
    locality ? `in ${locality}` : city ? `in ${city}` : null,
    locality && city && locality !== city ? `, ${city}` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+,/g, ',');

  const isPlot = isPlotProperty(property);
  const detailPath = `/property/${property.slug}`;
  const listingName = property.title || (isPlot ? 'Plot' : 'Property');

  return (
    <article className={`hs-listing-card${sponsored ? ' is-sponsored' : ''}`}>
      <div className="hs-listing-media">
        <Link to={detailPath} className="hs-listing-media-link" tabIndex={-1} aria-hidden>
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="hs-listing-placeholder" aria-hidden>
              <i className="bi bi-house-door" />
            </div>
          )}
        </Link>
        {isNewListing(property) && <span className="hs-listing-new">New</span>}
        {property.listedBy?.name && (
          <span className="hs-listing-owner">
            <i className="bi bi-person-circle" aria-hidden />
            {property.listedBy.name}
          </span>
        )}
        <span className="hs-listing-photo-count">1/1</span>
      </div>

      <div className="hs-listing-body">
        {sponsored && <span className="hs-listing-sponsored">Sponsored</span>}

        <div className="hs-listing-head">
          <h2 className="hs-listing-title">
            <Link to={detailPath}>{headline || listingName}</Link>
          </h2>
          {(isPlot || (property.title && property.title !== headline)) && (
            <p className="hs-listing-project">{listingName}</p>
          )}
        </div>

        {sponsored ? (
          <>
            <div className="hs-listing-price-lg">{formatPropertyPrice(property.price)}</div>
            {(locality || city) && (
              <p className="hs-listing-loc">{[locality, city].filter(Boolean).join(', ')}</p>
            )}
            {(furnishing || area) && (
              <div className="hs-listing-pill-specs">
                {furnishing && (
                  <span>
                    <em>Furnishing</em> {furnishing}
                  </span>
                )}
                {area && (
                  <span>
                    <em>Built up</em> {area}
                  </span>
                )}
              </div>
            )}
            {property.description && (
              <p className="hs-listing-desc">
                {String(property.description).slice(0, 110)}
                {String(property.description).length > 110 ? '…' : ''}
                {' '}
                <Link to={detailPath}>more</Link>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="hs-listing-stats">
              <div className="hs-listing-stat">
                <strong>{formatPropertyPrice(property.price)}</strong>
                <Link to={detailPath} className="hs-listing-stat-link">see details</Link>
              </div>
              {area && (
                <div className="hs-listing-stat">
                  <strong>{area}</strong>
                  <span>Built-up area</span>
                </div>
              )}
              {furnishing && (
                <div className="hs-listing-stat">
                  <strong>{furnishing}</strong>
                  <span>Furnishing status</span>
                </div>
              )}
              {!furnishing && property.bathrooms != null && (
                <div className="hs-listing-stat">
                  <strong>{property.bathrooms} Bath</strong>
                  <span>Bathrooms</span>
                </div>
              )}
            </div>

            {highlights.length > 0 && (
              <p className="hs-listing-amenities">
                <span>Highlights:</span> {highlights.join(' · ')}
              </p>
            )}
          </>
        )}

        <div className="hs-listing-footer">
          <span className="hs-listing-updated">{updated || 'Recently updated'}</span>
          <div className="hs-listing-actions">
            {showActions && (
              <>
                <button
                  type="button"
                  className="hs-listing-icon-btn"
                  aria-label="Save"
                  onClick={(e) => onSave?.(e, property.id)}
                >
                  <i className="bi bi-heart" aria-hidden />
                </button>
                <button
                  type="button"
                  className="hs-listing-icon-btn"
                  aria-label="Compare"
                  onClick={(e) => onCompare?.(e, property.id)}
                >
                  <i className="bi bi-layout-three-columns" aria-hidden />
                </button>
              </>
            )}
            <Link to={detailPath} className="hs-listing-contact">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
