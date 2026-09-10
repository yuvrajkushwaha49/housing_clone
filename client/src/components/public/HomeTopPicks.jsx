import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import { mediaUrl, projectService } from '../../services';
import {
  formatPriceCompact,
  formatProjectConfiguration,
  formatShortLocation,
} from '../projects/projectUtils';

const AUTO_MS = 6000;
const PROGRESS_TICK = 50;

function BuilderAvatar({ name }) {
  const initial = (name || 'B').charAt(0).toUpperCase();
  return (
    <span className="home-top-picks-builder-avatar" aria-hidden>
      {initial}
    </span>
  );
}

function TopPickCard({ project, variant = 'main' }) {
  const thumb = project.primaryImage ? mediaUrl(project.primaryImage) : null;
  const builderName = project.builder?.companyName || 'Verified builder';
  const builderId = project.builder?.id;

  if (variant === 'peek') {
    return (
      <Link to={`/project/${project.slug}`} className="home-top-picks-peek-card text-decoration-none">
        <div className="home-top-picks-peek-info">
          <div className="home-top-picks-builder-row">
            <BuilderAvatar name={builderName} />
            <span className="home-top-picks-builder-name">{builderName}</span>
          </div>
          <h3 className="home-top-picks-peek-title">{project.name}</h3>
          <p className="home-top-picks-peek-price">
            {formatPriceCompact(project.minPrice, project.maxPrice)}
          </p>
        </div>
        <div className="home-top-picks-peek-image">
          {thumb ? <img src={thumb} alt="" /> : <div className="home-top-picks-image-placeholder" />}
        </div>
      </Link>
    );
  }

  return (
    <article className="home-top-picks-card">
      <div className="home-top-picks-card-info">
        <div className="home-top-picks-builder-row">
          <BuilderAvatar name={builderName} />
          <div className="home-top-picks-builder-meta">
            <span className="home-top-picks-builder-name">{builderName}</span>
            {builderId && (
              <Link to={`/projects?builderId=${encodeURIComponent(builderId)}`} className="home-top-picks-view-projects">
                View Projects
              </Link>
            )}
          </div>
        </div>
        <Link to={`/project/${project.slug}`} className="home-top-picks-project-link text-decoration-none">
          <h3 className="home-top-picks-project-name">{project.name}</h3>
          <p className="home-top-picks-location">{formatShortLocation(project)}</p>
          <p className="home-top-picks-price">{formatPriceCompact(project.minPrice, project.maxPrice)}</p>
          <p className="home-top-picks-config">{formatProjectConfiguration(project)}</p>
        </Link>
        <Link to={`/project/${project.slug}`} className="home-top-picks-contact-btn">
          Contact
        </Link>
      </div>
      <Link to={`/project/${project.slug}`} className="home-top-picks-card-media">
        {thumb ? (
          <img src={thumb} alt={project.name} className="home-top-picks-card-image" />
        ) : (
          <div className="home-top-picks-image-placeholder">
            <i className="bi bi-buildings" aria-hidden />
          </div>
        )}
      </Link>
    </article>
  );
}

export default function HomeTopPicks({ cityId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!cityId) {
      setProjects([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    projectService
      .list({ limit: 6, cityId })
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  useEffect(() => {
    setActiveIndex(0);
    setProgress(0);
    elapsedRef.current = 0;
  }, [projects]);

  const goTo = useCallback((index) => {
    if (!projects.length) return;
    const next = ((index % projects.length) + projects.length) % projects.length;
    setActiveIndex(next);
    setProgress(0);
    elapsedRef.current = 0;
  }, [projects.length]);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (projects.length <= 1 || paused) return undefined;

    const id = window.setInterval(() => {
      elapsedRef.current += PROGRESS_TICK;
      const pct = Math.min(100, (elapsedRef.current / AUTO_MS) * 100);
      setProgress(pct);
      if (elapsedRef.current >= AUTO_MS) {
        goTo(activeIndex + 1);
      }
    }, PROGRESS_TICK);

    return () => window.clearInterval(id);
  }, [activeIndex, goTo, paused, projects.length]);

  if (!loading && projects.length === 0) {
    return null;
  }

  const active = projects[activeIndex];
  const nextProject = projects.length > 1 ? projects[(activeIndex + 1) % projects.length] : null;

  return (
    <section className="home-top-picks" aria-label={`${APP_NAME} top picks`}>
      <div className="ml-75px">
        <div className="home-top-picks-head">
          <div>
            <h2 className="home-top-picks-title">{APP_NAME}&apos;s top picks</h2>
            <p className="home-top-picks-subtitle">Explore top living options with us</p>
          </div>
          {!loading && projects.length > 0 && (
            <div className="home-top-picks-tabs" role="tablist" aria-label="Featured projects">
              {projects.map((project, index) => {
                const thumb = project.primaryImage ? mediaUrl(project.primaryImage) : null;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`home-top-picks-tab${isActive ? ' is-active' : ''}`}
                    onClick={() => goTo(index)}
                  >
                    <span className="home-top-picks-tab-thumb">
                      {thumb ? <img src={thumb} alt="" /> : <i className="bi bi-buildings" aria-hidden />}
                    </span>
                    <span className="home-top-picks-tab-label">{project.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <div className="home-top-picks-stage home-top-picks-stage--loading">
            <div className="home-top-picks-card home-top-picks-card--skeleton">
              <div className="home-top-picks-card-info skeleton-block" />
              <div className="home-top-picks-card-media skeleton-block" />
            </div>
          </div>
        ) : (
          <div className="home-top-picks-stage">
            <div className="home-top-picks-track">
              <div className="home-top-picks-main">
                {active && <TopPickCard project={active} />}
                <div className="home-top-picks-progress-wrap" aria-hidden>
                  <div className="home-top-picks-progress" style={{ width: `${progress}%` }} />
                </div>
                <button
                  type="button"
                  className="home-top-picks-pause-btn"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'}
                >
                  <i className={`bi bi-${paused ? 'play-fill' : 'pause-fill'}`} aria-hidden />
                </button>
              </div>
              {nextProject && (
                <div className="home-top-picks-peek">
                  <TopPickCard project={nextProject} variant="peek" />
                </div>
              )}
            </div>
            {projects.length > 1 && (
              <>
                <button
                  type="button"
                  className="home-top-picks-nav home-top-picks-nav--prev"
                  onClick={goPrev}
                  aria-label="Previous project"
                >
                  <i className="bi bi-chevron-left" aria-hidden />
                </button>
                <button
                  type="button"
                  className="home-top-picks-nav home-top-picks-nav--next"
                  onClick={goNext}
                  aria-label="Next project"
                >
                  <i className="bi bi-chevron-right" aria-hidden />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
