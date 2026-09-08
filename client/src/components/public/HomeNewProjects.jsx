import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import { projectService } from '../../services';

async function fetchLocationProjects({ localityId, cityId, excludeProjectId, limit = 8 }) {
  const collected = [];

  const addUnique = (list) => {
    for (const item of list) {
      if (excludeProjectId && item.id === excludeProjectId) continue;
      if (collected.some((p) => p.id === item.id)) continue;
      collected.push(item);
      if (collected.length >= limit) break;
    }
  };

  if (localityId) {
    const { data } = await projectService.list({
      limit: limit + 1,
      localityId,
    });
    addUnique(data.data || []);
  }

  if (collected.length < limit && cityId) {
    const { data } = await projectService.list({
      limit: limit + 4,
      cityId,
    });
    addUnique(data.data || []);
  }

  return collected.slice(0, limit);
}

async function fetchAllProjects({ excludeProjectId, limit = 8 }) {
  const { data } = await projectService.list({
    limit: excludeProjectId ? limit + 1 : limit,
  });
  let items = data.data || [];
  if (excludeProjectId) {
    items = items.filter((item) => item.id !== excludeProjectId);
  }
  return items.slice(0, limit);
}

export default function HomeNewProjects({
  locationFilter = false,
  cityId,
  localityId,
  locationLabel = '',
  excludeProjectId,
  className = '',
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const viewAllUrl = useMemo(() => {
    if (!locationFilter) return '/projects';
    const params = new URLSearchParams();
    if (cityId) params.set('cityId', cityId);
    if (localityId) params.set('localityId', localityId);
    const query = params.toString();
    return query ? `/projects?${query}` : '/projects';
  }, [locationFilter, cityId, localityId]);

  useEffect(() => {
    setLoading(true);
    const load = locationFilter
      ? fetchLocationProjects({ localityId, cityId, excludeProjectId })
      : fetchAllProjects({ excludeProjectId });

    load
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [locationFilter, cityId, localityId, excludeProjectId]);

  if (!loading && projects.length === 0) {
    return null;
  }

  return (
    <section className={`home-new-projects ${className}`.trim()}>
      <div className="container">
        <div className="home-prominent-head">
          <div>
            <h2>Newly-added projects</h2>
            <p>
              Fresh project launches added recently
              {locationFilter && locationLabel ? ` in ${locationLabel}` : ''}
              {!locationFilter ? ' — explore top builder projects.' : '.'}
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
