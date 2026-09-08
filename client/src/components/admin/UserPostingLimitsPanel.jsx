import { useEffect, useState } from 'react';
import { subscriptionService } from '../../services';
import { useToast } from '../../hooks/useToast';

const LISTER_ROLES = new Set(['BUILDER', 'AGENT', 'OWNER']);

export default function UserPostingLimitsPanel({ userUuid, roleCode }) {
  const toast = useToast();
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    listingLimitBonus: 0,
    featuredLimitBonus: 0,
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await subscriptionService.adminUserEntitlements(userUuid);
      const ent = data.data;
      setEntitlements(ent);
      setForm({
        listingLimitBonus: ent.listingLimitBonus || 0,
        featuredLimitBonus: ent.featuredLimitBonus || 0,
        notes: ent.overrideNotes || '',
      });
    } catch (err) {
      toast.apiError(err, 'Failed to load posting limits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (LISTER_ROLES.has(roleCode)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUuid, roleCode]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await subscriptionService.adminSetUserEntitlements(userUuid, {
        listingLimitBonus: Number(form.listingLimitBonus),
        featuredLimitBonus: Number(form.featuredLimitBonus),
        notes: form.notes || undefined,
      });
      setEntitlements(data.data);
      toast.success('Posting limits updated');
    } catch (err) {
      toast.apiError(err, 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!LISTER_ROLES.has(roleCode)) return null;

  return (
    <div className="panel-card mb-3">
      <h2 className="h6 mb-3">Unit posting limits</h2>
      {loading ? (
        <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary" /></div>
      ) : entitlements ? (
        <>
          <div className="row g-2 mb-3 text-center">
            <div className="col-4">
              <div className="border rounded p-2">
                <div className="fw-semibold">{entitlements.activeListings} / {entitlements.listingLimit}</div>
                <small className="text-secondary">Units posted</small>
              </div>
            </div>
            <div className="col-4">
              <div className="border rounded p-2">
                <div className="fw-semibold">{entitlements.planListingLimit ?? '—'}</div>
                <small className="text-secondary">From plan</small>
              </div>
            </div>
            <div className="col-4">
              <div className="border rounded p-2">
                <div className="fw-semibold">+{entitlements.listingLimitBonus || 0}</div>
                <small className="text-secondary">Admin bonus</small>
              </div>
            </div>
          </div>
          <p className="small text-secondary mb-3">
            Plan: <strong>{entitlements.subscription?.plan?.name || 'Free defaults'}</strong>
            {entitlements.subscription && (
              <> · until {new Date(entitlements.subscription.endsAt).toLocaleDateString()}</>
            )}
          </p>
          <form onSubmit={onSave}>
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label small">Extra unit posting bonus</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={0}
                  value={form.listingLimitBonus}
                  onChange={(e) => setForm({ ...form, listingLimitBonus: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Extra featured bonus</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min={0}
                  value={form.featuredLimitBonus}
                  onChange={(e) => setForm({ ...form, featuredLimitBonus: e.target.value })}
                />
              </div>
            </div>
            <input
              className="form-control form-control-sm mb-2"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Increase limits'}
            </button>
          </form>
        </>
      ) : (
        <p className="small text-secondary mb-0">Could not load posting limits.</p>
      )}
    </div>
  );
}
