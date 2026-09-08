import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { leadService, mastersService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { downloadExcel } from '../../utils/exportExcel';
import { ROLE_CODES } from '../../constants';

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];
const LEAD_SOURCES = ['inquiry', 'visit', 'chat', 'call', 'ad', 'manual', 'contact'];
const LISTING_TYPES = [
  { value: '', label: 'All listings' },
  { value: 'project', label: 'Projects' },
  { value: 'property', label: 'Properties' },
];

const emptyFilters = {
  listingType: '',
  source: '',
  cityId: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

function leadListParams(nextFilters, nextSearch, page = 1, limit = 20) {
  return {
    page,
    limit,
    status: nextFilters.status || undefined,
    source: nextFilters.source || undefined,
    listingType: nextFilters.listingType || undefined,
    cityId: nextFilters.cityId || undefined,
    dateFrom: nextFilters.dateFrom || undefined,
    dateTo: nextFilters.dateTo || undefined,
    q: String(nextSearch || '').trim() || undefined,
  };
}

function leadToExportRow(lead) {
  return {
    Name: lead.guestName || lead.buyer?.name || '',
    Email: lead.guestEmail || lead.buyer?.email || '',
    Phone: lead.guestPhone || '',
    Listing: lead.project?.name || lead.property?.title || '',
    'Listing type': lead.project ? 'Project' : lead.property ? 'Property' : '',
    Location: lead.city?.name || '',
    Source: lead.source || '',
    Status: lead.status || '',
    Notes: lead.notes || '',
    'Assigned to': lead.assignedTo?.name || '',
    'Assigned email': lead.assignedTo?.email || '',
    Created: lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-IN') : '',
  };
}

export default function LeadsPage() {
  const toast = useToast();
  const user = useSelector((s) => s.auth.user);
  const canManage = user?.role?.code !== ROLE_CODES.BUYER;
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 1000);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mastersService
      .listAllCities({ activeOnly: true, countryIso: 'IN' })
      .then((res) => setCities(res.data.data || []))
      .catch(() => setCities([]));
  }, []);

  const load = async (page = 1, nextFilters = filters, nextSearch = debouncedSearch) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const { data } = await leadService.listLeads(
        leadListParams(nextFilters, nextSearch, page, 20)
      );
      if (requestId !== requestIdRef.current) return;
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      toast.apiError(err, 'Failed to load leads');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load(1, filters, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.listingType, filters.source, filters.cityId, filters.status, filters.dateFrom, filters.dateTo]);

  const updateStatus = async (id, next) => {
    try {
      await leadService.updateLead(id, { status: next });
      toast.success(`Lead marked ${next}`);
      await load(meta.page);
    } catch (err) {
      toast.apiError(err, 'Update failed');
    }
  };

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setSearch('');
    load(1, emptyFilters, '');
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const all = [];
      let page = 1;
      let totalPages = 1;
      do {
        const { data } = await leadService.listLeads(
          leadListParams(filters, debouncedSearch, page, 50)
        );
        all.push(...(data.data || []));
        totalPages = data.meta?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      if (!all.length) {
        toast.info('No leads to export for the current filters');
        return;
      }

      downloadExcel(`leads-export-${new Date().toISOString().slice(0, 10)}`, all.map(leadToExportRow), 'Leads');
      toast.success(`Exported ${all.length} lead${all.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.apiError(err, 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const listingCell = (lead) => {
    if (lead.project) {
      return (
        <Link to={`/project/${lead.project.slug}`} target="_blank" rel="noreferrer">
          {lead.project.name}
        </Link>
      );
    }
    if (lead.property) {
      return (
        <Link to={`/property/${lead.property.slug}`} target="_blank" rel="noreferrer">
          {lead.property.title}
        </Link>
      );
    }
    return '—';
  };

  return (
    <div className="leads-simple">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 mb-0">Leads</h1>
          <small className="text-secondary">{meta.total} total</small>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
            Reset filters
          </button>
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            disabled={exporting || loading || meta.total === 0}
            onClick={exportExcel}
          >
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="panel-card mb-3">
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label small mb-1">Search</label>
            <input
              className="form-control form-control-sm"
              type="search"
              placeholder="Name, email, listing…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Listing</label>
            <select
              className="form-select form-select-sm"
              value={filters.listingType}
              onChange={(e) => setFilter('listingType', e.target.value)}
            >
              {LISTING_TYPES.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Source</label>
            <select
              className="form-select form-select-sm"
              value={filters.source}
              onChange={(e) => setFilter('source', e.target.value)}
            >
              <option value="">All</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Location</label>
            <select
              className="form-select form-select-sm"
              value={filters.cityId}
              onChange={(e) => setFilter('cityId', e.target.value)}
            >
              <option value="">All</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label small mb-1">Status</label>
            <select
              className="form-select form-select-sm"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">All</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label small mb-1">From</label>
            <input
              className="form-control form-control-sm"
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label small mb-1">To</label>
            <input
              className="form-control form-control-sm"
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => setFilter('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="panel-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Listing</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-secondary text-center py-4">
                      No leads found
                    </td>
                  </tr>
                )}
                {items.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="fw-semibold">{lead.guestName || lead.buyer?.name || '—'}</div>
                      <div className="small text-secondary">{lead.guestEmail || lead.buyer?.email}</div>
                      {lead.guestPhone && (
                        <div className="small text-secondary">{lead.guestPhone}</div>
                      )}
                    </td>
                    <td>
                      {listingCell(lead)}
                      {(lead.project || lead.property) && (
                        <div className="small text-secondary">{lead.project ? 'Project' : 'Property'}</div>
                      )}
                    </td>
                    <td className="small">{lead.city?.name || '—'}</td>
                    <td className="small text-capitalize">{lead.source}</td>
                    <td>
                      {canManage ? (
                        <select
                          className="form-select form-select-sm"
                          style={{ minWidth: 120 }}
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value)}
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="small text-capitalize">{lead.status}</span>
                      )}
                    </td>
                    <td className="small text-secondary text-nowrap">
                      {new Date(lead.createdAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-secondary">
            Page {meta.page} of {meta.totalPages || 1}
          </small>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={meta.page <= 1}
              onClick={() => load(meta.page - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={meta.page >= meta.totalPages}
              onClick={() => load(meta.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
