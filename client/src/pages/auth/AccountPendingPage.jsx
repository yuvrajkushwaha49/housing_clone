import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { APP_NAME } from '../../constants';
import { fetchMe, logout } from '../../redux/slices/authSlice';
import { isAccountPendingApproval, accountApprovalRoleLabel, postLoginRedirect } from '../../utils/accountApproval';

export default function AccountPendingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, accessToken, initialized } = useSelector((s) => s.auth);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!accessToken || !user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isAccountPendingApproval(user)) {
      navigate(postLoginRedirect(user), { replace: true });
    }
  }, [accessToken, user, initialized, navigate]);

  const refreshStatus = async () => {
    setChecking(true);
    try {
      const result = await dispatch(fetchMe());
      if (fetchMe.fulfilled.match(result) && !isAccountPendingApproval(result.payload)) {
        navigate(postLoginRedirect(result.payload), { replace: true });
      }
    } finally {
      setChecking(false);
    }
  };

  const signOut = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  if (!user || !isAccountPendingApproval(user)) {
    return (
      <div className="account-pending-page">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const roleLabel = accountApprovalRoleLabel(user.role?.code);

  return (
    <div className="account-pending-page">
      <div className="account-pending-card">
        <div className="account-pending-icon" aria-hidden>
          <i className="bi bi-hourglass-split" />
        </div>
        <span className="account-pending-badge">Under approval</span>
        <h1 className="account-pending-title">Account processing</h1>
        <p className="account-pending-lead">
          Your {roleLabel.toLowerCase()} account on {APP_NAME} is waiting for admin approval.
          You will get panel access once a super admin activates your account.
        </p>

        <div className="account-pending-steps">
          <div className="account-pending-step is-done">
            <span className="account-pending-step-dot"><i className="bi bi-check-lg" /></span>
            <div>
              <strong>Email verified</strong>
              <p>Registration completed</p>
            </div>
          </div>
          <div className="account-pending-step is-active">
            <span className="account-pending-step-dot"><i className="bi bi-hourglass-split" /></span>
            <div>
              <strong>Admin review</strong>
              <p>Our team is reviewing your account</p>
            </div>
          </div>
          <div className="account-pending-step">
            <span className="account-pending-step-dot">3</span>
            <div>
              <strong>Panel access</strong>
              <p>Dashboard unlocks after approval</p>
            </div>
          </div>
        </div>

        <div className="account-pending-meta">
          <div>
            <span className="account-pending-meta-label">Signed in as</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span className="account-pending-meta-label">Status</span>
            <strong className="text-capitalize">{user.status}</strong>
          </div>
        </div>

        <div className="account-pending-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={refreshStatus}
            disabled={checking}
          >
            {checking ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden />
            ) : (
              <i className="bi bi-arrow-clockwise me-1" aria-hidden />
            )}
            Check approval status
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>

        <p className="account-pending-footnote mb-0">
          Need help? <Link to="/">Return to homepage</Link>
        </p>
      </div>
    </div>
  );
}
