import { Link, Outlet } from 'react-router-dom';
import { APP_NAME } from '../constants';
import { BrandLogo } from '../components/BrandAssets';

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand mb-4">
          <Link to="/" className="text-decoration-none d-inline-block" aria-label={APP_NAME}>
            <BrandLogo className="brand-logo--auth" />
          </Link>
          <p className="text-secondary mt-2 mb-0 small">Enterprise real estate platform</p>
        </div>
        <Outlet />
      </div>
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-visual-inner">
          <h2 className="display-6 fw-semibold text-white">Find. List. Manage.</h2>
          <p className="text-white-50 mb-0">
            Buy, sell, and rent residential and commercial property with one secure workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
