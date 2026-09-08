import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PANEL_HOME } from '../constants';
import { isAccountPendingApproval, postLoginRedirect } from '../utils/accountApproval';

export function ProtectedRoute({ roles }) {
  const { accessToken, user, initialized } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!initialized && accessToken) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAccountPendingApproval(user)) {
    return <Navigate to="/account-pending" replace />;
  }

  if (roles && !roles.includes(user.role.code)) {
    return <Navigate to={PANEL_HOME[user.role.code] || '/'} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { accessToken, user, initialized } = useSelector((s) => s.auth);

  if (!initialized) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (accessToken && user) {
    return <Navigate to={postLoginRedirect(user)} replace />;
  }
  return <Outlet />;
}
