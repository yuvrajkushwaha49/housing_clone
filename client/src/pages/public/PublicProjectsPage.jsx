import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import ProjectCard from '../../components/public/ProjectCard';
import { mastersService, projectService } from '../../services';
import { useToast } from '../../hooks/useToast';

function filtersFromParams(params) {
  return {
    q: params.get('q') || '',
    cityId: params.get('cityId') || '',
    localityId: params.get('localityId') || '',
  };
}

function ProjectGridSkeleton() {
  return (
    <div className="home-project-grid">
      {Array.from({ length: 8 }).map((_, i) => (
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
  );
}

export default function PublicProjectsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => filtersFromParams(params));

  useEffect(() => {
    mastersService
      .listCountries({ activeOnly: true })
      .then(async (countriesRes) => {
        const countries = countriesRes.data.data || [];
        const india = countries.find((c) => c.iso2 === 'IN') || countries[0];
        if (!india) return;
        const states = await mastersService.listStates(india.id, { activeOnly: true });
        const cityLists = await Promise.all(
          states.data.data.map((s) => mastersService.listCities(s.id, { activeOnly: true }))
        );
        setCities(cityLists.flatMap((r) => r.data.data));
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!filters.cityId) {
      setLocalities([]);
      return;
    }
    mastersService
      .listLocalities(filters.cityId, { activeOnly: true })
      .then((res) => setLocalities(res.data.data || []))
      .catch(() => setLocalities([]));
  }, [filters.cityId]);

  const load = useCallback(async (nextFilters, page = 1) => {
    setLoading(true);
    try {
      const { data } = await projectService.list({
        page,
        limit: 12,
        q: nextFilters.q || undefined,
        cityId: nextFilters.cityId || undefined,
        localityId: nextFilters.localityId || undefined,
      });
      setItems(data.data || []);
      setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
      setFilters(nextFilters);
    } catch (err) {
      toast.apiError(err, 'Failed to load projects');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const nextFilters = filtersFromParams(params);
    const page = Number(params.get('page') || 1);
    load(nextFilters, page);
  }, [params, load]);

  const updateParams = (nextFilters, page = 1) => {
    setParams(
      Object.fromEntries(
        Object.entries({ ...nextFilters, page: String(page) }).filter(([, v]) => v)
      ),
      { replace: true }
    );
  };

  const cityName = useMemo(
    () => cities.find((c) => String(c.id) === String(filters.cityId))?.name,
    [cities, filters.cityId]
  );

  const localityName = useMemo(
    () => localities.find((l) => String(l.id) === String(filters.localityId))?.name,
    [localities, filters.localityId]
  );

  const locationLabel = [localityName, cityName].filter(Boolean).join(', ');

  const applyFilters = (patch = {}, page = 1) => {
    const next = { ...filters, ...patch };
    if (patch.cityId !== undefined && patch.cityId !== filters.cityId) {
      next.localityId = '';
    }
    setFilters(next);
    updateParams(next, page);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const clearFilters = () => {
    applyFilters({ q: '', cityId: '', localityId: '' });
  };

  const hasActiveFilters = Boolean(filters.q || filters.cityId || filters.localityId);

  return (
    <div className="public-projects-page">
      <PublicSiteHeader active="/projects" />

      <section className="property-search-hero">
        <div className="container">
          <div className="property-search-hero-head">
            <div>
              <h1>Explore projects</h1>
              <p>
                New launches and verified builder projects
                {locationLabel ? ` in ${locationLabel}` : ' across India'}.
              </p>
            </div>
            <Link to="/" className="btn btn-sm btn-outline-light">
              <i className="bi bi-house" aria-hidden /> Home
            </Link>
          </div>

          <form className="property-search-filters" onSubmit={handleSubmit}>
            <div className="property-search-filters-main">
              <div className="property-search-field property-search-field--grow">
                <i className="bi bi-search" aria-hidden />
                <input
                  type="search"
                  placeholder="Project or builder name"
                  value={filters.q}
                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                  aria-label="Search projects"
                />
              </div>
              <div className="property-search-field">
                <i className="bi bi-geo-alt" aria-hidden />
                <select
                  value={filters.cityId}
                  onChange={(e) => applyFilters({ cityId: e.target.value, localityId: '' })}
                  aria-label="City"
                >
                  <option value="">All cities</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
              <div className="property-search-field">
                <i className="bi bi-pin-map" aria-hidden />
                <select
                  value={filters.localityId}
                  disabled={!filters.cityId}
                  onChange={(e) => applyFilters({ localityId: e.target.value })}
                  aria-label="Locality"
                >
                  <option value="">All localities</option>
                  {localities.map((locality) => (
                    <option key={locality.id} value={locality.id}>{locality.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary property-search-submit-btn">
                Search
              </button>
              {hasActiveFilters && (
                <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <div className="container public-projects-body">
        <div className="public-projects-results-head">
          <div>
            <h2 className="h5 mb-1">
              {loading ? 'Loading projects…' : `${meta.total || items.length} project${(meta.total || items.length) === 1 ? '' : 's'} found`}
            </h2>
            {locationLabel && !loading && (
              <p className="text-secondary small mb-0">Showing results in {locationLabel}</p>
            )}
          </div>
          <Link to="/search?purpose=sale" className="btn btn-sm btn-outline-primary">
            Browse properties
          </Link>
        </div>

        {loading ? (
          <ProjectGridSkeleton />
        ) : items.length === 0 ? (
          <div className="public-projects-empty panel-card text-center py-5">
            <i className="bi bi-buildings display-4 text-secondary mb-3 d-block" />
            <h3 className="h5">No projects found</h3>
            <p className="text-secondary mb-3">
              Try a different city or clear your filters to see more builder projects.
            </p>
            {hasActiveFilters && (
              <button type="button" className="btn btn-primary" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="home-project-grid">
              {items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            {meta.totalPages > 1 && (
              <nav className="property-search-pagination" aria-label="Project list pages">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={meta.page <= 1}
                  onClick={() => applyFilters({}, meta.page - 1)}
                >
                  Previous
                </button>
                <span className="property-search-page-info">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => applyFilters({}, meta.page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      <PublicSiteFooter />
    </div>
  );
}
