import { Link } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import { BrandLogo } from '../BrandAssets';

export default function PublicSiteFooter() {
  return (
    <footer className="home-footer">
      <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Link to="/" className="home-footer-logo text-decoration-none" aria-label={APP_NAME}>
            <BrandLogo className="brand-logo--footer" />
          </Link>
          <span className="small text-secondary">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</span>
        </div>
        <div className="d-flex gap-3 flex-wrap">
          <Link to="/page/about">About</Link>
          <Link to="/page/privacy">Privacy</Link>
          <Link to="/page/terms">Terms</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </footer>
  );
}
