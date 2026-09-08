import { useEffect, useState } from 'react';
import { profileService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function VerificationQueuePage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending');

  const load = async () => {
    const { data } = await profileService.listVerifications({ status: status || undefined });
    setItems(data.data);
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load'));
  }, [status, toast]);

  const review = async (id, next) => {
    try {
      await profileService.reviewVerification(id, {
        status: next,
        reviewerNotes: next === 'rejected' ? 'Documents incomplete or invalid' : 'Verified',
      });
      await load();
      toast.success(`Verification ${next}`);
    } catch (err) {
      toast.apiError(err, 'Review failed');
    }
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <select className="form-select" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      <div className="panel-card">
        <h2 className="h6 mb-3">Profile verification queue</h2>
        {items.map((v) => (
          <div key={v.id} className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between flex-wrap gap-2">
              <div>
                <strong>{v.user.name}</strong>
                <div className="small text-secondary">{v.user.email} · {v.user.phone || 'no phone'}</div>
                <div className="small text-capitalize mt-1">Type: {v.profileType}</div>
                {v.message && <p className="small mb-0 mt-2">{v.message}</p>}
              </div>
              <div className="text-end">
                <span className="badge text-bg-light border d-block mb-2">{v.status}</span>
                {v.status === 'pending' && (
                  <div className="btn-group btn-group-sm">
                    <button type="button" className="btn btn-success" onClick={() => review(v.id, 'approved')}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-outline-danger" onClick={() => review(v.id, 'rejected')}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!items.length && <div className="text-secondary">Queue empty</div>}
      </div>
    </div>
  );
}
