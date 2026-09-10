import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPriceCompact } from '../projects/projectUtils';
import { builderService, mediaUrl } from '../../services';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'B';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function truncate(text, max = 140) {
  const value = String(text || '').trim();
  if (!value) return 'Trusted real-estate developer with quality projects and delivery focus.';
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

function DeveloperCard({ developer }) {
  const logo = developer.logoUrl ? mediaUrl(developer.logoUrl) : null;
  const project = developer.featuredProject;
  const projectThumb = project?.primaryImage ? mediaUrl(project.primaryImage) : null;
  const projectsTo = `/projects?builderId=${encodeURIComponent(developer.id)}`;
  const projectTo = project?.slug ? `/project/${project.slug}` : projectsTo;
  const linkLabel = project?.name
    ? (project.name.length > 22 ? `${project.name.slice(0, 20)}…` : project.name)
    : `${developer.companyName?.split(' ')[0] || 'View'} projects`;

  return (
    <article className="home-featured-dev-card">
      <div className="home-featured-dev-accent" aria-hidden />

      <div className="home-featured-dev-top">
        <div className="home-featured-dev-logo" aria-hidden>
          {logo ? (
            <img src={logo} alt="" />
          ) : (
            <span className="home-featured-dev-initials">{initials(developer.companyName)}</span>
          )}
        </div>
        <div className="home-featured-dev-meta">
          <h3 className="home-featured-dev-name">{developer.companyName}</h3>
          <div className="home-featured-dev-stats">
            {developer.yearEstablished ? (
              <div className="home-featured-dev-stat">
                <span className="home-featured-dev-stat-label">Year estd.</span>
                <strong>{developer.yearEstablished}</strong>
              </div>
            ) : null}
            <div className="home-featured-dev-stat">
              <span className="home-featured-dev-stat-label">Projects</span>
              <strong>{developer.projectCount ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <p className="home-featured-dev-about">{truncate(developer.about)}</p>

      <Link to={projectsTo} className="home-featured-dev-link">
        {linkLabel}
      </Link>

      {project ? (
        <Link to={projectTo} className="home-featured-dev-project">
          {projectThumb ? (
            <img src={projectThumb} alt="" loading="lazy" />
          ) : (
            <div className="home-featured-dev-project-placeholder" aria-hidden>
              <i className="bi bi-buildings" />
            </div>
          )}
          <div className="home-featured-dev-project-overlay">
            <div className="home-featured-dev-project-name">{project.name}</div>
            {(project.location) && (
              <div className="home-featured-dev-project-location">
                {project.location}
              </div>
            )}
            <div className="home-featured-dev-project-price">
              {formatPriceCompact(project.minPrice, project.maxPrice)}
            </div>
          </div>
        </Link>
      ) : null}
    </article>
  );
}

export default function HomeFeaturedDevelopers({ cityId }) {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    builderService
      .list({
        featured: 1,
        limit: 6,
        cityId: cityId || undefined,
      })
      .then((res) => setDevelopers(res.data.data || []))
      .catch(() => setDevelopers([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  if (!loading && developers.length === 0) {
    return null;
  }

  return (
    <section className="home-featured-developers">
      <div className="container">
        <div className="home-section-head home-section-head--left">
          <h2>Featured Developers</h2>
          <p>Prominent real-estate builders</p>
        </div>

        {loading ? (
          <div className="home-featured-dev-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="home-featured-dev-card is-skeleton">
                <div className="skeleton-block" style={{ height: 64, width: 64, borderRadius: 10 }} />
                <div className="skeleton-line skeleton-line--title mt-3" />
                <div className="skeleton-line mt-2" />
                <div className="skeleton-line skeleton-line--short mt-2" />
                <div className="skeleton-block mt-3" style={{ height: 180, borderRadius: 12 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="home-featured-dev-grid">
            {developers.map((developer) => (
              <DeveloperCard key={developer.id} developer={developer} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
