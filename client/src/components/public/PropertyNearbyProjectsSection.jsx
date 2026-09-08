import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import { projectService } from '../../services';

async function fetchNearbyProjects({ city, locality, excludeProjectId, limit = 8 }) {
  const collected = [];

  const addUnique = (list) => {
    for (const item of list) {
      if (excludeProjectId && item.id === excludeProjectId) continue;
      if (collected.some((p) => p.id === item.id)) continue;
      collected.push(item);
      if (collected.length >= limit) break;
    }
  };

  if (locality?.id) {
    const { data } = await projectService.list({
      limit: limit + 1,
      localityId: locality.id,
    });
    addUnique(data.data || []);
  }

  if (collected.length < limit && city?.id) {
    const { data } = await projectService.list({
      limit: limit + 4,
      cityId: city.id,
    });
    addUnique(data.data || []);
  }

  return collected.slice(0, limit);
}

function resolveLocation(property, location) {
  return {
    city: location?.city ?? property?.city,
    locality: location?.locality ?? property?.locality,
  };
}

export default function PropertyNearbyProjectsSection({
  property,
  location,
  excludeProjectId,
  className = '',
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const { city, locality } = resolveLocation(property, location);

  const locationLabel = [locality?.name, city?.name].filter(Boolean).join(', ');

  const viewAllUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (city?.id) params.set('cityId', city.id);
    if (locality?.id) params.set('localityId', locality.id);
    const query = params.toString();
    return query ? `/projects?${query}` : '/projects';
  }, [city?.id, locality?.id]);

  useEffect(() => {
    if (!city?.id && !locality?.id) return;
    setLoading(true);
    fetchNearbyProjects({ city, locality, excludeProjectId })
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [city, locality, excludeProjectId]);

  if (!loading && projects.length === 0) {
    return null;
  }

  return (
    <section className={`property-nearby-projects-section ${className}`.trim()}>
      <div className="container">
        <div className="home-prominent-head">
          <div>
            <h2>Projects in this area</h2>
            <p>
              New launches and builder projects
              {locationLabel ? ` in ${locationLabel}` : ' nearby'}.
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
