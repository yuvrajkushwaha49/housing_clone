import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatPriceCompact,
  formatProjectConfiguration,
  formatShortLocation,
} from '../projects/projectUtils';
import { mediaUrl, projectService } from '../../services';

function TrustedProjectCard({ project }) {
  const thumb = project.primaryImage ? mediaUrl(project.primaryImage) : null;
  const builderName = project.builder?.companyName || 'Verified builder';

  return (
    <Link to={`/project/${project.slug}`} className="home-trusted-card text-decoration-none">
      <div className="home-trusted-card-media">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" />
        ) : (
          <div className="home-trusted-card-placeholder" aria-hidden>
            <i className="bi bi-buildings" />
          </div>
        )}
      </div>
      <div className="home-trusted-card-body">
        <h3 className="home-trusted-card-name">{project.name}</h3>
        <p className="home-trusted-card-by">by {builderName}</p>
        <p className="home-trusted-card-meta">{formatProjectConfiguration(project)}</p>
        <p className="home-trusted-card-meta">{formatShortLocation(project)}</p>
        <p className="home-trusted-card-price">
          {formatPriceCompact(project.minPrice, project.maxPrice)}
        </p>
      </div>
    </Link>
  );
}

export default function HomeTrustedProjects({ cityId }) {
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
      .list({ limit: 6, cityId, sort: 'updated' })
      .then((res) => setProjects((res.data.data || []).slice(0, 6)))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  if (!loading && projects.length === 0) return null;

  return (
    <section className="home-trusted-projects">
      <div className="container">
        <div className="home-section-head home-section-head--left">
          <h2>Projects by trusted developers</h2>
          <p>Exclusive showcase of top projects</p>
        </div>

        {loading ? (
          <div className="home-trusted-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="home-trusted-card is-skeleton">
                <div className="skeleton-block" style={{ height: 160 }} />
                <div className="p-3">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="home-trusted-grid">
            {projects.map((project) => (
              <TrustedProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
