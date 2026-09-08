import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminPropertiesList from '../../components/properties/AdminPropertiesList';
import {
  formatPropertyPrice,
  formatPropertyPurpose,
  formatPropertyStatus,
  PROPERTY_STATUS_BADGE,
} from '../../components/properties/propertyUtils';
import PropertyQualityBadge from '../../components/properties/PropertyQualityBadge';
import { useHomeLocationsContext } from '../../contexts/HomeLocationsContext';
import { ROLE_CODES } from '../../constants';
import { mediaUrl, mastersService, propertyService } from '../../services';
import { useToast } from '../../hooks/useToast';

function filterAdminProperties(items, statusFilter, search) {
  const query = search.trim().toLowerCase();
  return items.filter((property) => {
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;
    const haystack = [
      property.title,
      property.city?.name,
      property.locality?.name,
      property.propertyType?.name,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export default function PropertiesListPage({ mode = 'mine', listingKind = 'all' }) {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const { panelCityId, panelCityName } = useHomeLocationsContext();
  const isBuilder = user?.role?.code === ROLE_CODES.BUILDER;
  const location = useLocation();
  const isPlotList = listingKind === 'plot';
  const propertyBasePath = location.pathname.replace(/\/$/, '');
  const [items, setItems] = useState([]);
  const [allAdminItems, setAllAdminItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [plotTypeId, setPlotTypeId] = useState('');
  const [plotFiltersReady, setPlotFiltersReady] = useState(!listingKind || listingKind !== 'plot');

  const filteredAdminItems = useMemo(
    () => filterAdminProperties(allAdminItems, statusFilter, search),
    [allAdminItems, statusFilter, search]
  );

  useEffect(() => {
    if (!isPlotList) return;
    mastersService
      .listTypes({ activeOnly: true })
      .then((res) => {
        const plot = (res.data.data || []).find((t) => t.code === 'plot');
        if (plot) setPlotTypeId(plot.id);
      })
      .catch(() => {})
      .finally(() => setPlotFiltersReady(true));
  }, [isPlotList]);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      if (mode === 'admin') {
        const { data } = await propertyService.adminList({ limit: 100 });
        setAllAdminItems(data.data || []);
      } else {
        const cityFilter = isBuilder && panelCityId ? panelCityId : undefined;
        const params = {
          page,
          limit: 20,
          status: status || undefined,
          cityId: cityFilter,
          propertyTypeId: isPlotList && plotTypeId ? plotTypeId : undefined,
        };
        const [listRes, statsRes] = await Promise.all([
          propertyService.mine(params),
          propertyService.mineStats(),
        ]);
        setItems(listRes.data.data);
        setMeta(listRes.data.meta);
        setStats(statsRes.data.data);
      }
    } catch (err) {
      toast.apiError(err, isPlotList ? 'Failed to load plots' : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!plotFiltersReady) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, plotFiltersReady, plotTypeId, panelCityId]);

  const locationFilterLabel = useMemo(() => {
    if (!isBuilder || mode !== 'mine') return null;
    return panelCityId ? panelCityName : 'All locations';
  }, [isBuilder, mode, panelCityId, panelCityName]);

  const changeStatus = async (id, next, reason) => {
    try {
      await propertyService.updateStatus(id, {
        status: next,
        rejectionReason: reason,
      });
      toast.success(`Status updated to ${formatPropertyStatus(next)}`);
      await load(mode === 'admin' ? 1 : meta.page);
    } catch (err) {
      toast.apiError(err, 'Status update failed');
    }
  };

  const resubmitForReview = async (property) => {
    try {
      await propertyService.updateStatus(property.id, { status: 'pending' });
      toast.success('Sent for review again');
      await load(meta.page);
    } catch (err) {
      toast.apiError(err, 'Resubmit failed');
    }
  };

  const deleteProperty = async (property) => {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
    try {
      await propertyService.remove(property.id);
      toast.success('Property deleted');
      await load(meta.page);
    } catch (err) {
      toast.apiError(err, 'Delete failed');
    }
  };

  const markClosed = async (property) => {
    const next = property.purpose === 'rent' || property.purpose === 'pg' ? 'rented' : 'sold';
    try {
      await propertyService.updateStatus(property.id, { status: next });
      toast.success(`Marked as ${formatPropertyStatus(next)}`);
      await load(meta.page);
    } catch (err) {
      toast.apiError(err, 'Update failed');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (mode === 'admin') {
    return (
      <AdminPropertiesList
        allItems={allAdminItems}
        items={filteredAdminItems}
        statusFilter={statusFilter}
        search={search}
        propertyBasePath={propertyBasePath}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearch}
      />
    );
  }

  return (
    <div>
      {mode === 'mine' && locationFilterLabel && (
        <div className="panel-location-filter-hint mb-3">
          <i className="bi bi-geo-alt" aria-hidden />
          Showing {isPlotList ? 'plots' : 'properties'} for <strong>{locationFilterLabel}</strong>
        </div>
      )}

      {isPlotList && (
        <div className="panel-card mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h1 className="h5 mb-1">My plots</h1>
              <p className="text-secondary small mb-0">
                List residential and commercial plot inventory from your developments.
              </p>
            </div>
            <Link to="new" className="btn btn-primary">
              <i className="bi bi-map me-1" aria-hidden />
              Add plot
            </Link>
          </div>
        </div>
      )}

      {stats && !isPlotList && (
        <div className="row g-3 mb-3">
          {[
            ['Total', stats.total],
            ['Draft', stats.draft],
            ['Pending', stats.pending],
            ['Live', stats.approved],
            ['Rejected', stats.rejected],
          ].map(([label, value]) => (
            <div className="col-6 col-md" key={label}>
              <div className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <select
          className="form-select"
          style={{ width: 200 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Live</option>
          <option value="rejected">Rejected</option>
          <option value="sold">Sold</option>
          <option value="rented">Rented</option>
          <option value="archived">Archived</option>
        </select>
        {!isPlotList && (
          <>
            <Link to="new" className="btn btn-outline-primary">Add property</Link>
            <Link to="new?type=plot" className="btn btn-primary">
              <i className="bi bi-map me-1" aria-hidden />
              Add plot
            </Link>
          </>
        )}
      </div>

      <div className="panel-card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>{isPlotList ? 'Plot' : 'Property'}</th>
                <th>Price</th>
                <th>City</th>
                <th>Status</th>
                <th>Views</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-secondary">
                    {isPlotList ? 'No plots found. Add your first plot listing.' : 'No properties found'}
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="d-flex gap-2 align-items-center">
                      {p.primaryImageUrl ? (
                        <img
                          src={mediaUrl(p.primaryImageUrl)}
                          alt=""
                          width={56}
                          height={42}
                          style={{ objectFit: 'cover', borderRadius: 6 }}
                        />
                      ) : (
                        <div className="bg-light border rounded" style={{ width: 56, height: 42 }} />
                      )}
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <div className="fw-semibold">{p.title}</div>
                          {isPlotList && p.reviewAverageRating != null && (
                            <PropertyQualityBadge rating={p.reviewAverageRating} />
                          )}
                        </div>
                        <small className="text-secondary">
                          {p.propertyType?.name} · {formatPropertyPurpose(p.purpose)}
                        </small>
                        {p.status === 'rejected' && p.rejectionReason && (
                          <div className="small text-danger mt-1">Rejected: {p.rejectionReason}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{formatPropertyPrice(p.price)}</td>
                  <td>{p.city?.name || '—'}</td>
                  <td>
                    <span className={`badge ${PROPERTY_STATUS_BADGE[p.status] || 'text-bg-light border'}`}>
                      {formatPropertyStatus(p.status)}
                    </span>
                  </td>
                  <td>{p.viewsCount}</td>
                  <td className="text-end text-nowrap">
                    {p.status === 'approved' && (
                      <Link className="btn btn-sm btn-outline-secondary me-1" to={`/property/${p.slug}`} target="_blank">
                        View
                      </Link>
                    )}
                    <Link
                      className="btn btn-sm btn-outline-primary me-1"
                      to={
                        isPlotList && p.status === 'approved'
                          ? `${p.id}/edit?resubmit=1`
                          : `${p.id}/edit`
                      }
                    >
                      {p.status === 'rejected'
                        ? 'Edit & resubmit'
                        : isPlotList && p.status === 'approved'
                          ? 'Improve rating'
                          : 'Edit'}
                    </Link>
                    {p.status === 'draft' && (
                      <button type="button" className="btn btn-sm btn-primary me-1" onClick={() => changeStatus(p.id, 'pending')}>
                        Submit
                      </button>
                    )}
                    {p.status === 'rejected' && (
                      <button type="button" className="btn btn-sm btn-primary me-1" onClick={() => resubmitForReview(p)}>
                        Resubmit
                      </button>
                    )}
                    {p.status === 'approved' && (
                      <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => markClosed(p)}>
                        Mark {p.purpose === 'rent' || p.purpose === 'pg' ? 'rented' : 'sold'}
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteProperty(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between mt-3">
          <small className="text-secondary">Total {meta.total}</small>
          <div className="btn-group">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Prev</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
