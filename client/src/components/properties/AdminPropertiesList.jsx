import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  formatPropertyPrice,
  formatPropertyPurpose,
  formatPropertyStatus,
  PROPERTY_STATUS_BADGE,
} from './propertyUtils';
import { mediaUrl } from '../../services';

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', icon: 'bi-hourglass-split' },
  { key: 'approved', label: 'Live', icon: 'bi-check-circle' },
  { key: 'rejected', label: 'Rejected', icon: 'bi-x-circle' },
  { key: 'draft', label: 'Draft', icon: 'bi-pencil' },
  { key: 'all', label: 'All', icon: 'bi-grid' },
];

function PropertyListCard({ property, propertyBasePath }) {
  const thumb = property.primaryImageUrl ? mediaUrl(property.primaryImageUrl) : null;
  const reviewPath = `${propertyBasePath}/${property.id}/review`;

  if (property.status === 'pending') {
    return (
      <Link to={reviewPath} className="admin-project-card admin-project-card-link">
        {thumb ? (
          <img src={thumb} alt="" className="admin-project-thumb" />
        ) : (
          <div className="admin-project-thumb-placeholder" aria-hidden>
            <i className="bi bi-house" />
          </div>
        )}
        <div className="flex-grow-1 min-width-0">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div className="fw-semibold text-truncate">{property.title}</div>
            <span className={`badge ${PROPERTY_STATUS_BADGE[property.status] || 'text-bg-light border'}`}>
              {formatPropertyStatus(property.status)}
            </span>
          </div>
          <div className="small text-secondary text-truncate">
            {formatPropertyPurpose(property.purpose)}
            {property.city?.name ? ` · ${property.city.name}` : ''}
          </div>
          <div className="small text-secondary mt-1">{formatPropertyPrice(property.price)}</div>
        </div>
        <i className="bi bi-chevron-right text-secondary flex-shrink-0 align-self-center" />
      </Link>
    );
  }

  return (
    <div className="admin-project-card">
      {thumb ? (
        <img src={thumb} alt="" className="admin-project-thumb" />
      ) : (
        <div className="admin-project-thumb-placeholder" aria-hidden>
          <i className="bi bi-house" />
        </div>
      )}
      <div className="flex-grow-1 min-width-0">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div className="fw-semibold text-truncate">{property.title}</div>
          <span className={`badge ${PROPERTY_STATUS_BADGE[property.status] || 'text-bg-light border'}`}>
            {formatPropertyStatus(property.status)}
          </span>
        </div>
        <div className="small text-secondary text-truncate">
          {formatPropertyPurpose(property.purpose)}
          {property.city?.name ? ` · ${property.city.name}` : ''}
        </div>
        <div className="small text-secondary mt-1">{formatPropertyPrice(property.price)}</div>
      </div>
      <div className="d-flex flex-column gap-1 flex-shrink-0">
        <Link className="btn btn-sm btn-outline-secondary" to={`${propertyBasePath}/${property.id}/edit`}>
          Edit
        </Link>
        {property.status === 'approved' && (
          <a className="btn btn-sm btn-outline-primary" href={`/property/${property.slug}`} target="_blank" rel="noreferrer">
            View
          </a>
        )}
      </div>
    </div>
  );
}

export default function AdminPropertiesList({
  allItems,
  items,
  statusFilter,
  search,
  propertyBasePath,
  onStatusFilterChange,
  onSearchChange,
}) {
  const stats = useMemo(() => ({
    pending: allItems.filter((p) => p.status === 'pending').length,
    approved: allItems.filter((p) => p.status === 'approved').length,
    rejected: allItems.filter((p) => p.status === 'rejected').length,
    draft: allItems.filter((p) => p.status === 'draft').length,
    total: allItems.length,
  }), [allItems]);

  return (
    <div className="admin-projects-page">
      <div className="admin-projects-header d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-1">Properties</h1>
          <p className="text-secondary small mb-0">
            Review listings, approve or reject pending properties.
          </p>
        </div>
        <Link to={`${propertyBasePath}/new`} className="btn btn-primary btn-sm">
          Add property
        </Link>
      </div>

      <div className="row g-2 mb-3">
        {[
          ['Pending', stats.pending, 'warning'],
          ['Live', stats.approved, 'success'],
          ['Rejected', stats.rejected, 'danger'],
          ['Draft', stats.draft, 'secondary'],
        ].map(([label, value, tone]) => (
          <div className="col-6 col-md-3" key={label}>
            <div className={`stat-card h-100 admin-stat-card admin-stat-${tone}`}>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-card">
        <div className="row g-3">
          <div className="col-lg-4">
            <h2 className="h6 mb-3">Filters</h2>
            <input
              type="search"
              className="form-control mb-3"
              placeholder="Search title, city…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="d-flex flex-column gap-1">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`btn btn-sm text-start ${statusFilter === filter.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => onStatusFilterChange(filter.key)}
                >
                  <i className={`bi ${filter.icon} me-2`} />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 mb-0">Listings</h2>
              <span className="small text-secondary">{items.length} shown</span>
            </div>
            {items.length === 0 ? (
              <p className="text-secondary small mb-0">No properties match your filters.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {items.map((property) => (
                  <PropertyListCard
                    key={property.id}
                    property={property}
                    propertyBasePath={propertyBasePath}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
