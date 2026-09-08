import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function PropertyReportsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await reportService.listPropertyReports({});
    setItems(data.data);
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load'));
  }, [toast]);

  const update = async (id, status) => {
    await reportService.updatePropertyReport(id, { status });
    await load();
  };

  return (
    <div>
      <div className="panel-card">
        <h2 className="h6 mb-3">Property reports</h2>
        {items.length === 0 && <div className="text-secondary">No reports</div>}
        {items.map((r) => (
          <div key={r.id} className="border-bottom py-3">
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <div>
                <Link to={`/property/${r.property.slug}`}>{r.property.title}</Link>
                <div className="small text-secondary text-capitalize">
                  {r.reason} · {r.reporter?.email || 'anonymous'} · {new Date(r.createdAt).toLocaleString()}
                </div>
                {r.details && <p className="small mb-0 mt-1">{r.details}</p>}
              </div>
              <div className="d-flex gap-1 align-items-start">
                <span className="badge text-bg-light border">{r.status}</span>
                {r.status === 'open' && (
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => update(r.id, 'reviewing')}>
                    Review
                  </button>
                )}
                {['open', 'reviewing'].includes(r.status) && (
                  <>
                    <button type="button" className="btn btn-sm btn-success" onClick={() => update(r.id, 'resolved')}>
                      Resolve
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => update(r.id, 'dismissed')}>
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
