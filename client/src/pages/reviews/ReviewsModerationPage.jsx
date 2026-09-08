import { useEffect, useState } from 'react';
import { reviewService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function ReviewsModerationPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await reviewService.pending();
      setItems(data.data);
    } catch (err) {
      toast.apiError(err, 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moderate = async (id, status) => {
    try {
      await reviewService.moderate(id, {
        status,
        rejectionReason: status === 'rejected' ? 'Does not meet guidelines' : undefined,
      });
      toast.success(`Review ${status}`);
      await load();
    } catch (err) {
      toast.apiError(err, 'Action failed');
    }
  };

  return (
    <div>
      <div className="panel-card">
        <h2 className="h6 mb-3">Pending reviews</h2>
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-secondary">Queue empty</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="border rounded p-3 mb-3">
              <div className="d-flex justify-content-between">
                <div>
                  <strong>{r.property.title}</strong>
                  <div className="small text-secondary">by {r.user.name} · {r.user.email}</div>
                </div>
                <div className="text-warning">{'★'.repeat(r.rating)}</div>
              </div>
              {r.title && <div className="fw-semibold mt-2">{r.title}</div>}
              <p className="small">{r.body}</p>
              <div className="btn-group btn-group-sm">
                <button type="button" className="btn btn-success" onClick={() => moderate(r.id, 'approved')}>Approve</button>
                <button type="button" className="btn btn-outline-danger" onClick={() => moderate(r.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
