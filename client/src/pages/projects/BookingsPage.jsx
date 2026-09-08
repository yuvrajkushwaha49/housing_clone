import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService, mastersService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatAmount(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BookingsPage({ manage = false }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [listingQ, setListingQ] = useState('');
  const debouncedListingQ = useDebouncedValue(listingQ, 1000);
  const [sourceFilter, setSourceFilter] = useState('');
  const [cityId, setCityId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cities, setCities] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mastersService
      .listAllCities({ activeOnly: true, countryIso: 'IN' })
      .then((res) => setCities(res.data.data || []))
      .catch(() => setCities([]));
  }, []);

  const load = async (overrides = {}) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const nextSource = overrides.source !== undefined ? overrides.source : sourceFilter;
    const nextCity = overrides.cityId !== undefined ? overrides.cityId : cityId;
    const nextQ = overrides.q !== undefined ? overrides.q : debouncedListingQ;
    const nextFrom = overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    const nextTo = overrides.dateTo !== undefined ? overrides.dateTo : dateTo;
    try {
      const { data } = await bookingService.list({
        limit: 100,
        source: nextSource || undefined,
        cityId: nextCity || undefined,
        q: String(nextQ || '').trim() || undefined,
        dateFrom: nextFrom || undefined,
        dateTo: nextTo || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(data.data || []);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      toast.apiError(err, 'Failed to load bookings');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load({ q: debouncedListingQ, source: sourceFilter, cityId, dateFrom, dateTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedListingQ, sourceFilter, cityId, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!statusFilter) return items;
    return items.filter((b) => b.status === statusFilter);
  }, [items, statusFilter]);

  const update = async (id, status) => {
    setUpdatingId(id);
    try {
      await bookingService.update(id, { status });
      toast.success(
        status === 'confirmed'
          ? 'Booking confirmed'
          : status === 'completed'
            ? 'Booking marked completed'
            : 'Booking cancelled'
      );
      await load();
    } catch (err) {
      toast.apiError(err, 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const resetFilters = () => {
    setListingQ('');
    setSourceFilter('');
    setCityId('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
    load({ q: '', source: '', cityId: '', dateFrom: '', dateTo: '' });
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 mb-0">{manage ? 'Bookings' : 'My bookings'}</h1>
          <small className="text-secondary">{filtered.length} shown · {items.length} loaded</small>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
          Reset filters
        </button>
      </div>

      <div className="panel-card mb-3">
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label small mb-1">Listing</label>
            <input
              className="form-control form-control-sm"
              type="search"
              placeholder="Project name…"
              value={listingQ}
              onChange={(e) => setListingQ(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Source</label>
            <select
              className="form-select form-select-sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="contact">Contact sellers</option>
              <option value="booking">Booking request</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Location</label>
            <select
              className="form-select form-select-sm"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="">All</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Status</label>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value || 'all'} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label small mb-1">From</label>
            <input
              className="form-control form-control-sm"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">To</label>
            <input
              className="form-control form-control-sm"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
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
                  <th>Project</th>
                  {manage && <th>Buyer</th>}
                  <th>Unit</th>
                  <th>Source</th>
                  <th>Location</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  {manage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={manage ? 9 : 7} className="text-secondary text-center py-4">
                      No bookings found
                      {!manage && (
                        <>
                          {' · '}
                          <Link to="/projects">Browse projects</Link>
                        </>
                      )}
                    </td>
                  </tr>
                )}
                {filtered.map((booking) => {
                  const busy = updatingId === booking.id;
                  return (
                    <tr key={booking.id}>
                      <td>
                        <Link to={`/project/${booking.project.slug}`}>
                          {booking.project.name}
                        </Link>
                      </td>
                      {manage && (
                        <td>
                          <div className="fw-semibold">{booking.buyer?.name || '—'}</div>
                          <div className="small text-secondary">{booking.buyer?.email}</div>
                        </td>
                      )}
                      <td className="small">{booking.unit?.unitNumber || '—'}</td>
                      <td className="small">
                        {booking.source === 'contact' ? 'Contact sellers' : 'Booking'}
                      </td>
                      <td className="small">{booking.city?.name || '—'}</td>
                      <td className="small text-nowrap">{formatAmount(booking.amount)}</td>
                      <td className="small text-capitalize">{booking.status}</td>
                      <td className="small text-secondary text-nowrap">
                        {new Date(booking.createdAt).toLocaleString('en-IN')}
                      </td>
                      {manage && (
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {booking.status === 'requested' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={busy}
                                  onClick={() => update(booking.id, 'cancelled')}
                                >
                                  Decline
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  disabled={busy}
                                  onClick={() => update(booking.id, 'confirmed')}
                                >
                                  Confirm
                                </button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={busy}
                                onClick={() => update(booking.id, 'completed')}
                              >
                                Complete
                              </button>
                            )}
                            {(booking.status === 'completed' || booking.status === 'cancelled') && (
                              <span className="text-secondary small">—</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
