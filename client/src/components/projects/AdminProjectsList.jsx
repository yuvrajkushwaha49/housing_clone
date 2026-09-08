import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  formatPriceRange,
  formatProjectStatus,
  PROJECT_STATUS_BADGE,
} from './projectUtils';
import { mediaUrl } from '../../services';

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', icon: 'bi-hourglass-split' },
  { key: 'published', label: 'Published', icon: 'bi-check-circle' },
  { key: 'rejected', label: 'Rejected', icon: 'bi-x-circle' },
  { key: 'draft', label: 'Draft', icon: 'bi-pencil' },
  { key: 'all', label: 'All', icon: 'bi-grid' },
];

function ProjectListCard({ project, projectBasePath }) {
  const thumb = project.primaryImage ? mediaUrl(project.primaryImage) : null;

  return (
    <Link
      to={`${projectBasePath}/${project.id}/review`}
      className="admin-project-card admin-project-card-link"
    >
      {thumb ? (
        <img src={thumb} alt="" className="admin-project-thumb" />
      ) : (
        <div className="admin-project-thumb-placeholder" aria-hidden>
          <i className="bi bi-buildings" />
        </div>
      )}
      <div className="flex-grow-1 min-width-0">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div className="fw-semibold text-truncate">{project.name}</div>
          <span className={`badge ${PROJECT_STATUS_BADGE[project.status] || 'text-bg-light border'}`}>
            {formatProjectStatus(project.status)}
          </span>
        </div>
        <div className="small text-secondary text-truncate">
          {project.builder?.companyName || '—'}
          {project.city?.name ? ` · ${project.city.name}` : ''}
        </div>
        {(project.minPrice != null || project.maxPrice != null) && (
          <div className="small text-secondary mt-1">
            {formatPriceRange(project.minPrice, project.maxPrice)}
          </div>
        )}
      </div>
      <i className="bi bi-chevron-right text-secondary flex-shrink-0 align-self-center" />
    </Link>
  );
}

export default function AdminProjectsList({
  allItems,
  items,
  statusFilter,
  search,
  projectBasePath,
  onStatusFilterChange,
  onSearchChange,
}) {
  const stats = useMemo(() => ({
    pending: allItems.filter((p) => p.status === 'pending').length,
    published: allItems.filter((p) => p.status === 'published').length,
    rejected: allItems.filter((p) => p.status === 'rejected').length,
    draft: allItems.filter((p) => p.status === 'draft').length,
    total: allItems.length,
  }), [allItems]);

  return (
    <div className="admin-projects-page">
      <div className="admin-projects-header">
        <h1 className="h4 mb-1">Project approvals</h1>
        <p className="text-secondary small mb-0">
          Select a project to review fields, rate 1–10, and publish or reject.
        </p>
      </div>

      <div className="row g-2 mb-3">
        {[
          ['Pending', stats.pending, 'warning'],
          ['Published', stats.published, 'success'],
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
            <div className="input-group input-group-sm mb-3">
              <span className="input-group-text"><i className="bi bi-search" /></span>
              <input
                type="search"
                className="form-control"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="admin-filter-tabs">
              {STATUS_FILTERS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`admin-filter-tab ${statusFilter === key ? 'active' : ''}`}
                  onClick={() => onStatusFilterChange(key)}
                >
                  <i className={`bi ${icon} me-1`} />
                  {label}
                  {key !== 'all' && (
                    <span className="ms-1 opacity-75">({stats[key] ?? stats.total})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="col-lg-8">
            <h2 className="h6 mb-3">
              Projects
              <span className="text-secondary fw-normal ms-2">({items.length})</span>
            </h2>
            <div className="admin-project-queue admin-project-queue-full">
              {items.length === 0 ? (
                <div className="text-center text-secondary py-5 small">
                  <i className="bi bi-inbox d-block mb-2 fs-4" />
                  Nothing in this queue
                </div>
              ) : (
                items.map((project) => (
                  <ProjectListCard
                    key={project.id}
                    project={project}
                    projectBasePath={projectBasePath}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
