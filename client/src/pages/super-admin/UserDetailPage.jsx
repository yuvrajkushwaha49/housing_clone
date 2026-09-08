import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { mediaUrl, rbacService } from '../../services';
import { formatApiError } from '../../utils/apiError';
import { validatePassword } from '../../utils/passwordValidation';
import { useToast } from '../../hooks/useToast';
import UserPostingLimitsPanel from '../../components/admin/UserPostingLimitsPanel';

function DetailRow({ label, children }) {
  return (
    <div className="row py-2 border-bottom">
      <div className="col-sm-4 text-secondary small">{label}</div>
      <div className="col-sm-8">{children ?? '—'}</div>
    </div>
  );
}

function statusBadge(status) {
  const map = {
    pending: 'warning',
    active: 'success',
    suspended: 'secondary',
    banned: 'danger',
    approved: 'success',
    rejected: 'danger',
  };
  return <span className={`badge text-bg-${map[status] || 'light'} border`}>{status}</span>;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function fullName(user) {
  return `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`;
}

const EMPTY_EDIT = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  roleCode: '',
};

export default function UserDetailPage() {
  const { uuid } = useParams();
  const toast = useToast();
  const { user: currentUser } = useSelector((s) => s.auth);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const isSelf = currentUser?.id === uuid;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const { data } = await rbacService.getUser(uuid);
      const u = data.data;
      setUser(u);
      setEditForm({
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phone: u.phone || '',
        roleCode: u.role?.code || '',
      });
    } catch (err) {
      toast.apiError(err, 'Failed to load user');
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [uuid, toast]);

  useEffect(() => {
    load();
    rbacService.listRoles().then(({ data }) => setRoles(data.data)).catch(() => {});
  }, [load]);

  const openEditModal = () => {
    if (!user) return;
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      roleCode: user.role?.code || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const openPasswordModal = () => {
    setPasswordForm({ password: '', confirm: '' });
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ password: '', confirm: '' });
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await rbacService.updateUser(uuid, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim() || null,
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        roleCode: editForm.roleCode,
      });
      setUser(data.data);
      toast.success('User details updated');
      closeEditModal();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const passwordIssue = validatePassword(passwordForm.password);
    if (passwordIssue) {
      toast.error(passwordIssue);
      return;
    }
    setSaving(true);
    try {
      await rbacService.resetUserPassword(uuid, passwordForm.password);
      toast.success('Password updated successfully');
      closePasswordModal();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to reset password'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status, label) => {
    if (!window.confirm(`${label} this user?`)) return;
    setStatusLoading(true);
    try {
      const { data } = await rbacService.updateUserStatus(uuid, status);
      setUser(data.data);
      toast.success(`User ${label.toLowerCase()}d`);
    } catch (err) {
      toast.apiError(err, 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (loadFailed && !user) {
    return (
      <div>
        <Link to="/panel/super-admin/users" className="btn btn-sm btn-outline-secondary mb-3">
          ← Users
        </Link>
        <p className="text-secondary mb-0">Could not load user.</p>
      </div>
    );
  }

  if (!user) return null;

  const avatar = user.avatarUrl ? mediaUrl(user.avatarUrl) : null;

  return (
    <div>
      <Link to="/panel/super-admin/users" className="btn btn-sm btn-outline-secondary mb-3">
        ← Users
      </Link>

      <div className="panel-card mb-3">
        <div className="d-flex flex-wrap gap-3 align-items-start">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              width={72}
              height={72}
              className="rounded-circle object-fit-cover border"
            />
          ) : (
            <div
              className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-secondary"
              style={{ width: 72, height: 72, fontSize: '1.5rem' }}
            >
              {user.firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h1 className="h5 mb-0">{fullName(user)}</h1>
              {statusBadge(user.status)}
              <span className="badge text-bg-secondary">{user.role.name}</span>
              {isSelf && <span className="badge text-bg-info">You</span>}
            </div>
            <div className="text-secondary small">{user.email}</div>
            {user.phone && <div className="text-secondary small">{user.phone}</div>}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline-primary" onClick={openEditModal}>
              <i className="bi bi-pencil me-1" />
              Edit details
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={openPasswordModal}>
              <i className="bi bi-key me-1" />
              Change password
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <>
          <div className="modal-backdrop fade show" onClick={closeEditModal} aria-hidden />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="editUserModalLabel"
            onClick={closeEditModal}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5" id="editUserModalLabel">
                    Edit user details
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeEditModal}
                    disabled={saving}
                  />
                </div>
                <form onSubmit={handleSaveDetails}>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">First name</label>
                        <input
                          className="form-control"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Last name</label>
                        <input
                          className="form-control"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Phone</label>
                        <input
                          className="form-control"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Role</label>
                        <select
                          className="form-select"
                          value={editForm.roleCode}
                          onChange={(e) => setEditForm((f) => ({ ...f, roleCode: e.target.value }))}
                          required
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.code}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeEditModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showPasswordModal && (
        <>
          <div className="modal-backdrop fade show" onClick={closePasswordModal} aria-hidden />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="changePasswordModalLabel"
            onClick={closePasswordModal}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5" id="changePasswordModalLabel">
                    Change password
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closePasswordModal}
                    disabled={saving}
                  />
                </div>
                <form onSubmit={handleResetPassword}>
                  <div className="modal-body">
                    <p className="small text-secondary">
                      Set a new password for <strong>{fullName(user)}</strong>. They will be signed out of all devices.
                    </p>
                    <div className="mb-3">
                      <label className="form-label">New password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={passwordForm.password}
                        onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                        minLength={8}
                        required
                        autoComplete="new-password"
                        autoFocus
                      />
                    </div>
                    <div className="mb-0">
                      <label className="form-label">Confirm password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <small className="text-secondary d-block mt-2">
                      Min 8 characters with uppercase, lowercase, and a number (e.g. <code>Demo@12345</code>).
                    </small>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closePasswordModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="panel-card mb-3">
            <h2 className="h6 mb-3">Account details</h2>
            <DetailRow label="Email verified">{user.emailVerified ? 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Phone verified">{user.phoneVerified ? 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Last login">{formatDate(user.lastLoginAt)}</DetailRow>
            <DetailRow label="Joined">{formatDate(user.createdAt)}</DetailRow>
            {user.extraRoles?.length > 0 && (
              <DetailRow label="Additional roles">
                {user.extraRoles.map((r) => (
                  <span key={r.code} className="badge text-bg-light border me-1">
                    {r.name}
                  </span>
                ))}
              </DetailRow>
            )}
          </div>

          <UserPostingLimitsPanel userUuid={uuid} roleCode={user.role?.code} />

          {user.roleProfile && (
            <div className="panel-card mb-3">
              <h2 className="h6 mb-3">Role profile</h2>
              {user.roleProfile.type === 'BUILDER' && (
                <>
                  <DetailRow label="Company">{user.roleProfile.companyName}</DetailRow>
                  <DetailRow label="RERA">{user.roleProfile.reraNumber}</DetailRow>
                  <DetailRow label="City">{user.roleProfile.city}</DetailRow>
                  <DetailRow label="Verification">
                    {statusBadge(user.roleProfile.verificationStatus)}
                  </DetailRow>
                </>
              )}
              {user.roleProfile.type === 'AGENT' && (
                <>
                  <DetailRow label="Agency">{user.roleProfile.agencyName}</DetailRow>
                  <DetailRow label="License">{user.roleProfile.licenseNumber}</DetailRow>
                  <DetailRow label="City">{user.roleProfile.city}</DetailRow>
                  <DetailRow label="Verification">
                    {statusBadge(user.roleProfile.verificationStatus)}
                  </DetailRow>
                </>
              )}
              {user.roleProfile.type === 'OWNER' && (
                <DetailRow label="Verification">
                  {statusBadge(user.roleProfile.verificationStatus)}
                </DetailRow>
              )}
              {user.roleProfile.type === 'BUYER' && (
                <>
                  <DetailRow label="Budget min">{user.roleProfile.budgetMin}</DetailRow>
                  <DetailRow label="Budget max">{user.roleProfile.budgetMax}</DetailRow>
                </>
              )}
            </div>
          )}

          {user.recentVerifications?.length > 0 && (
            <div className="panel-card">
              <h2 className="h6 mb-3">Recent verifications</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Reviewed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.recentVerifications.map((v) => (
                      <tr key={v.id}>
                        <td className="text-capitalize">{v.profileType}</td>
                        <td>{statusBadge(v.status)}</td>
                        <td className="small text-secondary">{formatDate(v.createdAt)}</td>
                        <td className="small text-secondary">{formatDate(v.reviewedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="panel-card mb-3">
            <h2 className="h6 mb-3">Account status</h2>
            {isSelf ? (
              <p className="small text-secondary mb-0">
                You cannot change your own account status from this page.
              </p>
            ) : (
              <div className="d-grid gap-2">
                {user.status !== 'active' && (
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={statusLoading}
                    onClick={() => handleStatusChange('active', 'Activate')}
                  >
                    Activate
                  </button>
                )}
                {user.status === 'active' && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={statusLoading}
                    onClick={() => handleStatusChange('suspended', 'Deactivate')}
                  >
                    Deactivate
                  </button>
                )}
                {user.status !== 'banned' && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    disabled={statusLoading}
                    onClick={() => handleStatusChange('banned', 'Ban')}
                  >
                    Ban user
                  </button>
                )}
                {user.status === 'banned' && (
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={statusLoading}
                    onClick={() => handleStatusChange('active', 'Unban and activate')}
                  >
                    Unban &amp; activate
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="panel-card mb-3">
            <h2 className="h6 mb-3">Activity</h2>
            <div className="row g-2 text-center">
              {[
                ['Properties', user.stats.properties],
                ['Projects', user.stats.projects],
                ['Bookings', user.stats.bookings],
                ['Leads', user.stats.leads],
                ['Tickets', user.stats.tickets],
                ['Verifications', user.stats.verifications],
              ].map(([label, value]) => (
                <div key={label} className="col-6">
                  <div className="border rounded p-2">
                    <div className="fw-semibold">{value}</div>
                    <small className="text-secondary">{label}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <h2 className="h6 mb-2">
              Permissions <span className="text-secondary fw-normal">({user.permissions.length})</span>
            </h2>
            <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 320, overflow: 'auto' }}>
              {user.permissions.map((p) => (
                <span key={p} className="badge text-bg-light border small">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
