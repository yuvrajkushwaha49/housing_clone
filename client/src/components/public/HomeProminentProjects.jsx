import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import { projectService } from '../../services';

export default function HomeProminentProjects({
  cityId,
  cityName,
  embedded = false,
  title,
  viewAllTo,
}) {
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
      .list({
        limit: 8,
        cityId: cityId || undefined,
      })
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  if (!loading && projects.length === 0) {
    return null;
  }

  const sectionTitle = title || 'Prominent projects to explore';
  const viewAllUrl = viewAllTo || (cityId ? `/projects?cityId=${encodeURIComponent(cityId)}` : '/projects');

  return (
    <section className={`home-prominent-projects ${embedded ? 'is-embedded panel-card' : ''}`.trim()}>
      <div className={embedded ? 'home-embedded-section-inner' : 'container'}>
        <div className="home-prominent-head">
          <div>
            <h2>{sectionTitle}</h2>
            <p>
              Handpicked new launches and top-rated builder projects
              {cityName ? ` in ${cityName}` : ''}.
            </p>
          </div>
          <Link to={viewAllUrl} className="home-view-all">
            View all projects →
          </Link>
        </div>

        {loading ? (
          <div className="home-project-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-project-card home-project-card--skeleton">
                <div className="home-project-card-image skeleton-block" />
                <div className="home-project-card-body">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="home-project-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
