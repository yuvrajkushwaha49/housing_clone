import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { profileService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function RoleProfilePage() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const role = user?.role?.code;
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [verifications, setVerifications] = useState([]);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    const res = await profileService.me();
    setData(res.data.data);
    setForm(res.data.data.profile || {});
    if (['AGENT', 'OWNER'].includes(role)) {
      const v = await profileService.myVerifications();
      setVerifications(v.data.data);
    }
  };

  useEffect(() => {
    load().catch((err) => {
      toast.apiError(err, 'Failed to load profile');
      setLoadFailed(true);
    });
  }, [role, toast]);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (role === 'BUYER') {
        payload.budgetMin = form.budgetMin !== '' && form.budgetMin != null ? Number(form.budgetMin) : null;
        payload.budgetMax = form.budgetMax !== '' && form.budgetMax != null ? Number(form.budgetMax) : null;
      }
      if (role === 'AGENT' && form.experienceYears != null) {
        payload.experienceYears = Number(form.experienceYears) || null;
      }
      const res = await profileService.updateMe(payload);
      setData(res.data.data);
      setForm(res.data.data.profile);
      toast.success('Profile saved');
    } catch (err) {
      toast.apiError(err, 'Save failed');
    }
  };

  const submitVerification = async (e) => {
    e.preventDefault();
    try {
      await profileService.submitVerification({
        message: verifyMessage,
        documents: [{ label: 'ID / license reference', note: verifyMessage || 'Submitted via panel' }],
      });
      setVerifyMessage('');
      toast.success('Verification request submitted');
      await load();
    } catch (err) {
      toast.apiError(err, 'Verification submit failed');
    }
  };

  if (!data && !loadFailed) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load profile.</p>;
  }

  const p = form;

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <form className="panel-card" onSubmit={save}>
          <h1 className="h5 mb-3">My profile</h1>
          {p.verificationStatus && (
            <div className="mb-3 small">
              Status: <span className="badge text-bg-light border">{p.verificationStatus}</span>
            </div>
          )}

          {role === 'AGENT' && (
            <>
              <input className="form-control mb-2" placeholder="Agency name" value={p.agencyName || ''}
                onChange={(e) => setForm({ ...p, agencyName: e.target.value })} />
              <input className="form-control mb-2" placeholder="License number" value={p.licenseNumber || ''}
                onChange={(e) => setForm({ ...p, licenseNumber: e.target.value })} />
              <input type="number" className="form-control mb-2" placeholder="Experience years" value={p.experienceYears ?? ''}
                onChange={(e) => setForm({ ...p, experienceYears: e.target.value })} />
              <textarea className="form-control mb-3" rows={4} placeholder="Bio" value={p.bio || ''}
                onChange={(e) => setForm({ ...p, bio: e.target.value })} />
            </>
          )}

          {role === 'OWNER' && (
            <>
              <select className="form-select mb-2" value={p.preferredContact || 'email'}
                onChange={(e) => setForm({ ...p, preferredContact: e.target.value })}>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <textarea className="form-control mb-3" rows={4} placeholder="Bio" value={p.bio || ''}
                onChange={(e) => setForm({ ...p, bio: e.target.value })} />
            </>
          )}

          {role === 'BUYER' && (
            <>
              <div className="row g-2 mb-2">
                <div className="col-md-6">
                  <input type="number" className="form-control" placeholder="Budget min" value={p.budgetMin ?? ''}
                    onChange={(e) => setForm({ ...p, budgetMin: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <input type="number" className="form-control" placeholder="Budget max" value={p.budgetMax ?? ''}
                    onChange={(e) => setForm({ ...p, budgetMax: e.target.value })} />
                </div>
              </div>
              <p className="small text-secondary">Set your budget preferences to personalize search later.</p>
            </>
          )}

          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      </div>

      {['AGENT', 'OWNER'].includes(role) && (
        <div className="col-lg-5">
          <form className="panel-card mb-3" onSubmit={submitVerification}>
            <h2 className="h6 mb-3">Request verification</h2>
            <textarea className="form-control mb-2" rows={3} placeholder="Notes for reviewers (license, docs references)"
              value={verifyMessage} onChange={(e) => setVerifyMessage(e.target.value)} />
            <button className="btn btn-outline-primary w-100" type="submit"
              disabled={p.verificationStatus === 'pending' || p.verificationStatus === 'verified'}>
              {p.verificationStatus === 'verified' ? 'Already verified' : 'Submit for verification'}
            </button>
          </form>
          <div className="panel-card">
            <h2 className="h6 mb-3">My requests</h2>
            {verifications.map((v) => (
              <div key={v.id} className="border-bottom py-2 small">
                <div className="d-flex justify-content-between">
                  <span className="text-capitalize">{v.profileType}</span>
                  <span className="badge text-bg-light border">{v.status}</span>
                </div>
                {v.reviewerNotes && <div className="text-secondary">{v.reviewerNotes}</div>}
              </div>
            ))}
            {!verifications.length && <div className="text-secondary">No requests yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}
