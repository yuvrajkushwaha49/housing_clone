import { Link, useLocation } from 'react-router-dom';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import { APP_NAME } from '../../constants';

export default function ComingSoonPage({ title, embedded = false }) {
  const location = useLocation();
  const heading = title || 'Coming soon';

  const content = (
    <div className="container coming-soon-inner">
      <div className="coming-soon-card">
        <span className="coming-soon-badge">Coming soon</span>
        <h1>{heading}</h1>
        <p>
          This page is not available yet. We&apos;re working on it — check back soon on {APP_NAME}.
        </p>
        {location.pathname !== '/coming-soon' && (
          <p className="coming-soon-path">{location.pathname}</p>
        )}
        <div className="coming-soon-actions">
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/search" className="btn btn-outline-primary">
            Search properties
          </Link>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="coming-soon-page is-embedded">{content}</div>;
  }

  return (
    <div className="coming-soon-page">
      <PublicSiteHeader />
      {content}
      <PublicSiteFooter />
    </div>
  );
}
