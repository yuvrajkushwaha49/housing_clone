import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function VisitsPage({ scope }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await leadService.listVisits({
        page,
        limit: 20,
        status: status || undefined,
        scope: scope || undefined,
      });
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      toast.apiError(err, 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const updateStatus = async (id, next) => {
    try {
      await leadService.updateVisitStatus(id, { status: next });
      toast.success(`Visit ${next}`);
      await load(meta.page);
    } catch (err) {
      toast.apiError(err, 'Update failed');
    }
  };

  const isHostView = scope !== 'mine';

  return (
    <div>
      <form
        className="panel-card mb-3 d-flex gap-2 align-items-end"
        onSubmit={(e) => {
          e.preventDefault();
          load(1);
        }}
      >
        <div>
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="requested">Requested</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No show</option>
          </select>
        </div>
        <button className="btn btn-outline-secondary" type="submit">Filter</button>
      </form>

      <div className="panel-card">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Property</th>
                  <th>Guest</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} className="text-secondary">No visits</td></tr>
                )}
                {items.map((v) => (
                  <tr key={v.id}>
                    <td>{new Date(v.scheduledAt).toLocaleString()}</td>
                    <td>
                      <Link to={`/property/${v.property.slug}`} target="_blank">
                        {v.property.title}
                      </Link>
                    </td>
                    <td>
                      <div>{v.guestName}</div>
                      <small className="text-secondary">{v.guestEmail}</small>
                    </td>
                    <td><span className="badge text-bg-light border">{v.status}</span></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {isHostView && v.status === 'requested' && (
                          <>
                            <button type="button" className="btn btn-success" onClick={() => updateStatus(v.id, 'confirmed')}>Confirm</button>
                            <button type="button" className="btn btn-outline-danger" onClick={() => updateStatus(v.id, 'cancelled')}>Cancel</button>
                          </>
                        )}
                        {isHostView && v.status === 'confirmed' && (
                          <>
                            <button type="button" className="btn btn-primary" onClick={() => updateStatus(v.id, 'completed')}>Complete</button>
                            <button type="button" className="btn btn-outline-secondary" onClick={() => updateStatus(v.id, 'no_show')}>No show</button>
                          </>
                        )}
                        {!isHostView && ['requested', 'confirmed'].includes(v.status) && (
                          <button type="button" className="btn btn-outline-danger" onClick={() => updateStatus(v.id, 'cancelled')}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
