import { Link } from 'react-router-dom';
import { formatLocation, formatPriceRange } from '../projects/projectUtils';
import { mediaUrl } from '../../services';
import { useSaveProject } from '../../hooks/useSaveItem';

function formatPossession(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export default function ProjectCard({ project, onSave }) {
  const saveProject = useSaveProject();
  const thumb = project.primaryImage ? mediaUrl(project.primaryImage) : null;
  const possession = formatPossession(project.possessionDate);

  const handleSave = (e) => {
    if (onSave) {
      onSave(e, project.id);
      return;
    }
    saveProject(e, project.id);
  };

  return (
    <article className="home-card-wrap">
      <button
        type="button"
        className="home-card-save-btn"
        onClick={handleSave}
        aria-label="Save project"
      >
        <i className="bi bi-heart" aria-hidden />
      </button>
      <Link to={`/project/${project.slug}`} className="home-project-card text-decoration-none">
        <div className="home-project-card-image">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="home-project-card-placeholder" aria-hidden>
              <i className="bi bi-buildings" />
            </div>
          )}
          {project.reraId && (
            <span className="home-project-rera-badge">RERA</span>
          )}
        </div>
        <div className="home-project-card-body">
          <h3 className="home-project-card-title">{project.name}</h3>
          <p className="home-project-card-builder">
            {project.builder?.companyName || 'Verified builder'}
          </p>
          <p className="home-project-card-location">
            <i className="bi bi-geo-alt" aria-hidden />
            {formatLocation(project)}
          </p>
          <div className="home-project-card-footer">
            <span className="home-project-card-price">
              {formatPriceRange(project.minPrice, project.maxPrice)}
            </span>
            {possession && (
              <span className="home-project-card-possession">
                Possession {possession}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
