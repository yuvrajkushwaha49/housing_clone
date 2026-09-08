import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { leadService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function InquiriesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await leadService.listInquiries({
        page,
        limit: 20,
        status: status || undefined,
      });
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      toast.apiError(err, 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mark = async (id, next) => {
    await leadService.updateInquiryStatus(id, next);
    await load(meta.page);
  };

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
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
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
                  <th>From</th>
                  <th>Property</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} className="text-secondary">No inquiries</td></tr>
                )}
                {items.map((inq) => (
                  <tr key={inq.id}>
                    <td>
                      <div className="fw-semibold">{inq.name}</div>
                      <small className="text-secondary d-block">{inq.email}</small>
                      {inq.phone && <small className="text-secondary d-block">{inq.phone}</small>}
                    </td>
                    <td>
                      {inq.property && (
                        <Link to={`/property/${inq.property.slug}`} target="_blank">
                          {inq.property.title}
                        </Link>
                      )}
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div className="small text-truncate">{inq.message}</div>
                    </td>
                    <td><span className="badge text-bg-light border">{inq.status}</span></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {inq.status === 'new' && (
                          <button type="button" className="btn btn-outline-secondary" onClick={() => mark(inq.id, 'read')}>
                            Mark read
                          </button>
                        )}
                        {inq.status !== 'responded' && inq.status !== 'closed' && (
                          <button type="button" className="btn btn-outline-primary" onClick={() => mark(inq.id, 'responded')}>
                            Responded
                          </button>
                        )}
                        {inq.status !== 'closed' && (
                          <button type="button" className="btn btn-outline-dark" onClick={() => mark(inq.id, 'closed')}>
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
