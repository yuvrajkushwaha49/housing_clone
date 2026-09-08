import { useEffect, useState } from 'react';
import { subscriptionService } from '../../services';
import { useToast } from '../../hooks/useToast';

const EMPTY_PLAN_FORM = {
  name: '',
  roleScope: 'agent',
  price: 999,
  durationDays: 30,
  listingLimit: 10,
  featuredLimit: 2,
  description: '',
};

const ROLE_LABELS = { agent: 'Agent', owner: 'Owner', builder: 'Builder' };

export default function AdminSubscriptionsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY_PLAN_FORM);
  const [editPlan, setEditPlan] = useState(null);
  const [grantForm, setGrantForm] = useState({ userUuid: '', planId: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [subs, planList] = await Promise.all([
        subscriptionService.adminList({}),
        subscriptionService.listPlans({ activeOnly: 'false' }),
      ]);
      setItems(subs.data.data);
      setPlans(planList.data.data);
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

  const createPlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await subscriptionService.adminCreatePlan(form);
      setForm(EMPTY_PLAN_FORM);
      toast.success('Plan created');
      await load();
    } catch (err) {
      toast.apiError(err, 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const savePlanEdit = async (e) => {
    e.preventDefault();
    if (!editPlan) return;
    setSaving(true);
    try {
      await subscriptionService.adminUpdatePlan(editPlan.id, {
        name: editPlan.name,
        price: editPlan.price,
        durationDays: editPlan.durationDays,
        listingLimit: editPlan.listingLimit,
        featuredLimit: editPlan.featuredLimit,
        description: editPlan.description,
        isActive: editPlan.isActive,
      });
      toast.success('Plan updated');
      setEditPlan(null);
      await load();
    } catch (err) {
      toast.apiError(err, 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const grantSubscription = async (e) => {
    e.preventDefault();
    if (!grantForm.userUuid || !grantForm.planId) return;
    setSaving(true);
    try {
      await subscriptionService.adminGrantSubscription(grantForm.userUuid, {
        planId: grantForm.planId,
        notes: grantForm.notes || undefined,
      });
      toast.success('Subscription granted');
      setGrantForm({ userUuid: '', planId: '', notes: '' });
      await load();
    } catch (err) {
      toast.apiError(err, 'Grant failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h1 className="h4 mb-1">Subscriptions &amp; posting limits</h1>
        <p className="text-secondary small mb-0">
          Builder, Agent, and Owner unit posting depends on their plan. Increase limits per plan or per user.
        </p>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <form className="panel-card" onSubmit={createPlan}>
            <h2 className="h6 mb-3">Create plan</h2>
            <input
              className="form-control mb-2"
              placeholder="Plan name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="form-select mb-2"
              value={form.roleScope}
              onChange={(e) => setForm({ ...form, roleScope: e.target.value })}
            >
              <option value="agent">Agent</option>
              <option value="owner">Owner</option>
              <option value="builder">Builder</option>
            </select>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label small mb-1">Price (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div className="col-6">
                <label className="form-label small mb-1">Duration (days)</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label small mb-1">Unit posting limit</label>
                <input
                  type="number"
                  className="form-control"
                  min={0}
                  value={form.listingLimit}
                  onChange={(e) => setForm({ ...form, listingLimit: Number(e.target.value) })}
                />
              </div>
              <div className="col-6">
                <label className="form-label small mb-1">Featured limit</label>
                <input
                  type="number"
                  className="form-control"
                  min={0}
                  value={form.featuredLimit}
                  onChange={(e) => setForm({ ...form, featuredLimit: Number(e.target.value) })}
                />
              </div>
            </div>
            <textarea
              className="form-control mb-2"
              rows={2}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button className="btn btn-primary w-100" type="submit" disabled={saving}>
              Create plan
            </button>
          </form>

          <form className="panel-card mt-3" onSubmit={grantSubscription}>
            <h2 className="h6 mb-3">Grant plan to user</h2>
            <input
              className="form-control mb-2"
              placeholder="User UUID"
              required
              value={grantForm.userUuid}
              onChange={(e) => setGrantForm({ ...grantForm, userUuid: e.target.value })}
            />
            <select
              className="form-select mb-2"
              required
              value={grantForm.planId}
              onChange={(e) => setGrantForm({ ...grantForm, planId: e.target.value })}
            >
              <option value="">Select plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({ROLE_LABELS[p.roleScope]} · {p.listingLimit} units)
                </option>
              ))}
            </select>
            <input
              className="form-control mb-2"
              placeholder="Notes (optional)"
              value={grantForm.notes}
              onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
            />
            <button className="btn btn-outline-primary w-100" type="submit" disabled={saving}>
              Grant subscription
            </button>
            <p className="small text-secondary mt-2 mb-0">
              Or open a user profile to add bonus units on top of their plan.
            </p>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="panel-card mb-3">
            <h2 className="h6 mb-3">Plans by role</h2>
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Role</th>
                      <th>Units</th>
                      <th>Featured</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td className="fw-medium">{p.name}</td>
                        <td className="text-capitalize">{ROLE_LABELS[p.roleScope] || p.roleScope}</td>
                        <td>{p.listingLimit}</td>
                        <td>{p.featuredLimit}</td>
                        <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${p.isActive ? 'text-bg-success' : 'text-bg-light border'}`}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setEditPlan({ ...p })}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel-card">
            <h2 className="h6 mb-3">Active / recent subscriptions</h2>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Ends</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-secondary text-center py-4">No subscriptions yet.</td>
                    </tr>
                  ) : (
                    items.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div>{s.user.name}</div>
                          <small className="text-secondary">{s.user.email}</small>
                        </td>
                        <td>{s.plan.name}</td>
                        <td><span className="badge text-bg-light border">{s.status}</span></td>
                        <td>{new Date(s.endsAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setGrantForm({ userUuid: s.user.id, planId: '', notes: '' })}
                          >
                            Change plan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editPlan && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setEditPlan(null)} aria-hidden />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            onClick={() => setEditPlan(null)}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5">Edit plan — {editPlan.name}</h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditPlan(null)}
                    disabled={saving}
                  />
                </div>
                <form onSubmit={savePlanEdit}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        className="form-control"
                        required
                        value={editPlan.name}
                        onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label">Price (₹)</label>
                        <input
                          type="number"
                          className="form-control"
                          min={0}
                          value={editPlan.price}
                          onChange={(e) => setEditPlan({ ...editPlan, price: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Duration (days)</label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          value={editPlan.durationDays}
                          onChange={(e) => setEditPlan({ ...editPlan, durationDays: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label">Unit posting limit</label>
                        <input
                          type="number"
                          className="form-control"
                          min={0}
                          value={editPlan.listingLimit}
                          onChange={(e) => setEditPlan({ ...editPlan, listingLimit: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Featured limit</label>
                        <input
                          type="number"
                          className="form-control"
                          min={0}
                          value={editPlan.featuredLimit}
                          onChange={(e) => setEditPlan({ ...editPlan, featuredLimit: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={editPlan.description || ''}
                        onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
                      />
                    </div>
                    <div className="form-check">
                      <input
                        id="planActive"
                        type="checkbox"
                        className="form-check-input"
                        checked={editPlan.isActive}
                        onChange={(e) => setEditPlan({ ...editPlan, isActive: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="planActive">Plan active</label>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditPlan(null)} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
