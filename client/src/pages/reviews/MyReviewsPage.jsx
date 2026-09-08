import { useEffect, useState } from 'react';
import { reviewService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function MyReviewsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewService
      .mine()
      .then((res) => setItems(res.data.data))
      .catch((err) => {
        toast.apiError(err, 'Failed to load');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  if (loadFailed) return <p className="text-secondary text-center py-5 mb-0">Could not load reviews.</p>;

  return (
    <div className="panel-card">
      <h2 className="h6 mb-3">My reviews</h2>
      {items.length === 0 && <div className="text-secondary">No reviews yet.</div>}
      {items.map((r) => (
        <div key={r.id} className="border-bottom py-3">
          <div className="d-flex justify-content-between">
            <strong>{r.property.title}</strong>
            <span className="badge text-bg-light border">{r.status}</span>
          </div>
          <div className="text-warning small">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          {r.title && <div className="fw-semibold">{r.title}</div>}
          <p className="mb-0 small">{r.body}</p>
        </div>
      ))}
    </div>
  );
}
