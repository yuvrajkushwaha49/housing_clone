import { Link } from 'react-router-dom';
import { mediaUrl } from '../../services';
import { formatLocation, formatPriceRange, formatDetailValue, formatAdminPriceRange, formatAdminLocation, PROJECT_STATUS_BADGE } from './projectUtils';

export default function ProjectDetailsView({
  project,
  showAdminMeta = false,
  showPublicLink = false,
  footer,
}) {
  if (!project) return null;

  const dv = (value) => (showAdminMeta ? formatDetailValue(value) : (value || '—'));
  const priceRange = showAdminMeta
    ? formatAdminPriceRange(project.minPrice, project.maxPrice)
    : formatPriceRange(project.minPrice, project.maxPrice);

  const images = project.media?.filter((m) => m.mediaType === 'image') || [];
  const primaryImage = images[0]?.url || project.primaryImage;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h2 className="h5 mb-1">{dv(project.name)}</h2>
          <div className="text-secondary">
            {dv(project.builder?.companyName)}
            {project.city?.name ? ` · ${project.city.name}` : ''}
            {project.locality?.name ? ` · ${project.locality.name}` : ''}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${PROJECT_STATUS_BADGE[project.status] || 'text-bg-light border'}`}>
            {project.status}
          </span>
          {showPublicLink && (project.publiclyVisible || project.status === 'published') && (
            <Link className="btn btn-sm btn-outline-secondary" to={`/project/${project.slug}`} target="_blank">
              Public page
            </Link>
          )}
        </div>
      </div>

      {primaryImage && (
        <figure className="mb-3">
          <img
            src={mediaUrl(primaryImage)}
            alt={images[0]?.caption || project.name}
            className="w-100"
            style={{ maxHeight: 280, objectFit: 'cover', borderRadius: 12 }}
          />
          {images[0]?.caption && (
            <figcaption className="small text-secondary mt-1">{images[0].caption}</figcaption>
          )}
        </figure>
      )}

      {images.length > 1 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {images.slice(1, 6).map((m) => (
            <figure key={m.id} className="mb-0" style={{ maxWidth: 120 }}>
              <img
                src={mediaUrl(m.url)}
                alt={m.caption || project.name}
                height={64}
                style={{ borderRadius: 8, objectFit: 'cover', width: '100%' }}
              />
              {m.caption && (
                <figcaption className="small text-secondary mt-1 text-truncate">{m.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {(project.description || showAdminMeta) && (
        <p className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>{dv(project.description)}</p>
      )}

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <h3 className="h6">Overview</h3>
          <ul className="list-unstyled small mb-0">
            <li><strong>Category:</strong> {dv(project.category?.name)}</li>
            <li><strong>Price range:</strong> {priceRange}</li>
            <li><strong>RERA ID:</strong> {dv(project.reraId)}</li>
            <li><strong>Builder RERA:</strong> {dv(project.builder?.reraNumber)}</li>
            <li><strong>Launch date:</strong> {dv(project.launchDate)}</li>
            <li><strong>Possession:</strong> {dv(project.possessionDate)}</li>
          </ul>
        </div>
        <div className="col-md-6">
          <h3 className="h6">Location</h3>
          <ul className="list-unstyled small mb-0">
            <li><strong>Address:</strong> {dv(project.addressLine)}</li>
            <li><strong>Area:</strong> {showAdminMeta ? formatAdminLocation(project) : formatLocation(project)}</li>
            {(project.latitude || project.longitude) && (
              <li><strong>Coordinates:</strong> {project.latitude}, {project.longitude}</li>
            )}
            {project.viewsCount != null && (
              <li><strong>Views:</strong> {project.viewsCount}</li>
            )}
          </ul>
        </div>
      </div>

      {showAdminMeta && (
        <ul className="list-unstyled small mb-3">
          <li><strong>Submissions:</strong> {project.submissionCount ?? 0}</li>
          {project.publishedAt && <li><strong>Published at:</strong> {project.publishedAt}</li>}
        </ul>
      )}

      {project.rejectionReason && (
        <div className="alert alert-danger py-2 small mb-3">
          <strong>Rejection reason:</strong> {project.rejectionReason}
        </div>
      )}

      {project.resubmitNote && (
        <div className="alert alert-info py-2 small mb-3">
          <strong>Builder reply:</strong> {project.resubmitNote}
        </div>
      )}

      {project.structure && (
        <div className="row g-2 mb-3">
          {[
            ['Buildings', project.structure.buildingCount],
            ['Towers', project.structure.towerCount],
            ['Total floors', project.structure.totalFloors],
          ].map(([label, value]) => (
            <div className="col-4" key={label}>
              <div className="border rounded p-2 text-center small">
                <div className="text-secondary">{label}</div>
                <div className="fw-semibold">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {project.buildings?.length > 0 && (
        <div className="mb-3">
          <h3 className="h6">Buildings & towers</h3>
          {project.buildings.map((building) => (
            <div key={building.id} className="border rounded p-2 mb-2 small">
              <strong>{building.name}</strong>
              {building.isActive === false && (
                <span className="badge text-bg-secondary ms-1">Inactive</span>
              )}
              <span className="text-secondary ms-2">
                ({(building.activeTowerCount ?? building.towerCount) || 0} towers · {building.totalFloors || 0} floors)
              </span>
              {building.towers?.length > 0 && (
                <ul className="mb-0 mt-1">
                  {building.towers.map((tower) => (
                    <li key={tower.id} className={tower.isActive === false ? 'text-secondary' : ''}>
                      {tower.name}
                      {tower.isActive === false ? ' (inactive)' : ''}: {tower.totalFloors ?? '—'} floors
                      {tower.totalUnits != null ? `, ${tower.totalUnits} units` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {project.unassignedTowers?.length > 0 && (
        <div className="mb-3">
          <h3 className="h6">Standalone towers</h3>
          <ul className="small mb-0">
            {project.unassignedTowers.map((tower) => (
              <li key={tower.id} className={tower.isActive === false ? 'text-secondary' : ''}>
                {tower.name}{tower.isActive === false ? ' (inactive)' : ''}: {tower.totalFloors ?? '—'} floors
                {tower.totalUnits != null ? `, ${tower.totalUnits} units` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!project.buildings?.length && project.towers?.length > 0 && !project.unassignedTowers?.length && (
        <div className="mb-3">
          <h3 className="h6">Towers</h3>
          <div className="d-flex flex-wrap gap-1">
            {project.towers.map((t) => (
              <span key={t.id} className="badge text-bg-light border">
                {t.name}{t.totalFloors != null ? ` (${t.totalFloors} floors)` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {showAdminMeta && !project.amenities?.length && (
        <div className="mb-3">
          <h3 className="h6">Amenities</h3>
          <p className="small text-secondary mb-0">0 amenities selected</p>
        </div>
      )}

      {showAdminMeta && !images.length && (
        <div className="mb-3">
          <h3 className="h6">Gallery</h3>
          <p className="small text-secondary mb-0">0 images uploaded</p>
        </div>
      )}

      {showAdminMeta && !project.media?.some((m) => m.mediaType === 'document') && (
        <div className="mb-3">
          <h3 className="h6">Documents</h3>
          <p className="small text-secondary mb-0">0 documents uploaded</p>
        </div>
      )}

      {project.amenities?.length > 0 && (
        <div className="mb-3">
          <h3 className="h6">Amenities</h3>
          <div className="row g-2">
            {project.amenities.map((a) => (
              <div className="col-md-4" key={a.id}>
                <div className="border rounded p-2 h-100">
                  {a.imageUrl ? (
                    <img
                      src={mediaUrl(a.imageUrl)}
                      alt={a.name}
                      className="w-100 mb-2"
                      style={{ height: 88, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center bg-light border rounded mb-2 text-secondary"
                      style={{ height: 88 }}
                    >
                      <i className={`bi ${a.icon || 'bi-star'} fs-4`} />
                    </div>
                  )}
                  <div className="small fw-medium">{a.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.inventory && (
        <div className="small mb-3 text-secondary">
          <strong>Inventory:</strong> {project.inventory.available} available · {project.inventory.held} held ·
          {' '}{project.inventory.sold} sold · {project.inventory.total} total
        </div>
      )}

      {project.units?.length > 0 && (
        <div className="mb-3">
          <h3 className="h6">Units</h3>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Tower</th>
                  <th>Area</th>
                  <th>Price</th>
                  <th>Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {project.units.slice(0, 10).map((u) => (
                  <tr key={u.id}>
                    <td>{u.unitNumber}</td>
                    <td>{u.unitType || '—'}</td>
                    <td className="small">
                      {[
                        u.bedrooms != null ? `${u.bedrooms} bed` : null,
                        u.bathrooms != null ? `${u.bathrooms} bath` : null,
                        u.balconies != null ? `${u.balconies} balcony` : null,
                        u.parking != null ? `${u.parking} parking` : null,
                        u.furnishing?.name || null,
                        u.facing?.name || null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td>{u.tower?.name || '—'}</td>
                    <td>
                      {u.area != null || u.carpetArea != null
                        ? [
                          u.area != null ? `${u.area} super` : null,
                          u.carpetArea != null ? `${u.carpetArea} carpet` : null,
                        ].filter(Boolean).join(' / ')
                        : '—'}
                    </td>
                    <td>{u.price != null ? `₹${Number(u.price).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="small">
                      {u.isReadyToMove ? (
                        <span className="badge text-bg-success">Ready to move</span>
                      ) : u.deliveryDate ? (
                        <>Expected: {u.deliveryDate}</>
                      ) : (
                        '—'
                      )}
                      {u.isReadyToMove && u.deliveryDate && (
                        <div className="text-secondary">From {u.deliveryDate}</div>
                      )}
                    </td>
                    <td><span className="badge text-bg-light border">{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {project.units.length > 10 && (
            <div className="small text-secondary mt-1">
              +{project.units.length - 10} more units
            </div>
          )}
        </div>
      )}

      {project.media?.some((m) => m.mediaType === 'document') && (
        <div className="mb-3">
          <h3 className="h6">Documents</h3>
          <ul className="small mb-0">
            {project.media
              .filter((m) => m.mediaType === 'document')
              .map((m) => (
                <li key={m.id}>
                  <a href={mediaUrl(m.url)} target="_blank" rel="noreferrer">
                    {m.fileName || 'Document'}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      {project.brochureUrl && (
        <div className="mb-3">
          <a className="btn btn-sm btn-outline-primary" href={mediaUrl(project.brochureUrl)} target="_blank" rel="noreferrer">
            Download brochure
          </a>
        </div>
      )}

      {footer}
    </div>
  );
}
