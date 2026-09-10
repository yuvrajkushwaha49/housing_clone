import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatPriceCompact,
  formatProjectConfiguration,
  formatShortLocation,
} from '../projects/projectUtils';
import { mediaUrl, projectService } from '../../services';

function HighDemandCard({ project }) {
  const thumb = project.primaryImage ? mediaUrl(project.primaryImage) : null;
  const builderName = project.builder?.companyName || 'Verified builder';

  return (
    <Link to={`/project/${project.slug}`} className="home-high-demand-card text-decoration-none">
      <div className="home-high-demand-media">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" />
        ) : (
          <div className="home-high-demand-placeholder" aria-hidden>
            <i className="bi bi-buildings" />
          </div>
        )}
      </div>
      <div className="home-high-demand-body">
        <h3 className="home-high-demand-name">{project.name}</h3>
        <p className="home-high-demand-by">by {builderName}</p>
        <p className="home-high-demand-meta">{formatProjectConfiguration(project)}</p>
        <p className="home-high-demand-meta">{formatShortLocation(project)}</p>
        <p className="home-high-demand-price">
          {formatPriceCompact(project.minPrice, project.maxPrice)}
        </p>
      </div>
    </Link>
  );
}

export default function HomeHighDemandProjects({ cityId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cityId) {
      setProjects([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    projectService
      .list({ limit: 6, cityId, sort: 'views' })
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  if (!loading && projects.length === 0) return null;

  return (
    <section className="home-high-demand-projects">
      <div className="container">
        <div className="home-section-head home-section-head--left">
          <h2>High-demand projects to invest now</h2>
          <p>Leading projects in high demand</p>
        </div>

        {loading ? (
          <div className="home-high-demand-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="home-high-demand-card is-skeleton">
                <div className="skeleton-block home-high-demand-media" />
                <div className="home-high-demand-body">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="home-high-demand-grid">
            {projects.map((project) => (
              <HighDemandCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
