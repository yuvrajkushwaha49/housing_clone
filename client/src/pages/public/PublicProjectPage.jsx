import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import ProjectDetailSkeleton from '../../components/public/ProjectDetailSkeleton';
import ProjectDetailBody from '../../components/public/ProjectDetailBody';
import {
  formatPriceCompact,
  formatShortLocation,
} from '../../components/projects/projectUtils';
import { mediaUrl, projectService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useSaveProject } from '../../hooks/useSaveItem';

function formatPossessionStatus(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  if (d <= new Date()) return 'Ready to Move';
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function formatAreaRange(units) {
  const areas = units.map((u) => Number(u.area)).filter((n) => !Number.isNaN(n) && n > 0);
  if (!areas.length) return '—';
  const min = Math.min(...areas);
  const max = Math.max(...areas);
  const unit = units.find((u) => u.area != null)?.areaUnit?.name || 'sq.ft';
  if (min === max) return `${min} ${unit}`;
  return `${min} - ${max} ${unit}`;
}

function formatConfigLabel(units) {
  const beds = [...new Set(units.map((u) => u.bedrooms).filter((b) => b != null && b !== ''))]
    .sort((a, b) => Number(a) - Number(b));
  if (beds.length) return `${beds.join(', ')} BHK`;
  const types = [...new Set(units.map((u) => u.unitType).filter(Boolean))];
  return types.length ? types.slice(0, 4).join(', ') : '—';
}

function formatAvgPricePerSqft(units) {
  const rates = units
    .map((u) => {
      const price = Number(u.price);
      const area = Number(u.area);
      if (!price || !area) return null;
      return price / area;
    })
    .filter((n) => n != null && !Number.isNaN(n));
  if (!rates.length) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const fmt = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')} K`;
    return Math.round(n).toLocaleString('en-IN');
  };
  if (Math.round(min) === Math.round(max)) return `₹${fmt(min)}/sq.ft`;
  return `₹${fmt(min)} - ₹${fmt(max)}/sq.ft`;
}

function estimateEmi(minPrice) {
  if (minPrice == null) return null;
  const principal = Number(minPrice) * 0.8;
  const monthlyRate = 0.085 / 12;
  const months = 240;
  const emi = (principal * monthlyRate * ((1 + monthlyRate) ** months))
    / (((1 + monthlyRate) ** months) - 1);
  if (!Number.isFinite(emi)) return null;
  if (emi >= 100000) return `₹${(emi / 100000).toFixed(2)} L`;
  if (emi >= 1000) return `₹${(emi / 1000).toFixed(2)} K`;
  return `₹${Math.round(emi).toLocaleString('en-IN')}`;
}

function formatUpdatedAt(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PublicProjectPage() {
  const toast = useToast();
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const saveProject = useSaveProject();

  useEffect(() => {
    projectService.getBySlug(slug)
      .then((res) => {
        setProject(res.data.data);
        setActiveImage(0);
      })
      .catch((err) => {
        toast.apiError(err, 'Project not found');
        setLoadFailed(true);
      });
  }, [slug, toast]);

  const images = useMemo(
    () => project?.media?.filter((m) => m.mediaType === 'image') || [],
    [project]
  );

  const shareProject = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: project.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.info('Unable to share right now');
    }
  };

  if (loadFailed) {
    return (
      <div className="project-detail-page">
        <PublicSiteHeader active="/projects" />
        <div className="container py-5">
          <div className="project-detail-empty panel-card text-center py-5">
            <i className="bi bi-building-x display-4 text-secondary mb-3 d-block" />
            <h1 className="h4">Project not found</h1>
            <p className="text-secondary mb-4">This project may be unpublished or no longer available.</p>
            <Link to="/projects" className="btn btn-primary">Browse projects</Link>
          </div>
        </div>
        <PublicSiteFooter />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page project-detail-page--scale">
        <PublicSiteHeader active="/projects" />
        <ProjectDetailSkeleton />
        <PublicSiteFooter />
      </div>
    );
  }

  const shortLocation = formatShortLocation(project);
  const priceCompact = formatPriceCompact(project.minPrice, project.maxPrice);
  const units = project.units || [];
  const configLabel = formatConfigLabel(units);
  const sizeRange = formatAreaRange(units);
  const avgPrice = formatAvgPricePerSqft(units);
  const possessionStatus = formatPossessionStatus(project.possessionDate);
  const emiLabel = estimateEmi(project.minPrice);
  const updatedAt = formatUpdatedAt(project.publishedAt || project.updatedAt);
  const moreCount = Math.max(images.length - 3, 0);
  const builderProjectsTo = project.builder?.id
    ? `/projects?builderId=${encodeURIComponent(project.builder.id)}`
    : '/projects';

  const openGallery = (index = 0) => {
    setActiveImage(index);
    setLightboxOpen(true);
  };

  return (
    <div className="project-detail-page project-detail-page--housing">
      <PublicSiteHeader active="/projects" />

      <div className="project-detail-top-band">
        <div className="container project-detail-top">
          <div className="project-detail-crumb-row">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb project-detail-breadcrumb mb-0">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                {project.city?.name && (
                  <li className="breadcrumb-item">
                    <Link to={`/projects?cityId=${encodeURIComponent(project.city.id)}`}>
                      {project.city.name}
                    </Link>
                  </li>
                )}
                {project.locality?.name && (
                  <li className="breadcrumb-item">{project.locality.name}</li>
                )}
                <li className="breadcrumb-item active" aria-current="page">{project.name}</li>
              </ol>
            </nav>
            {updatedAt && (
              <div className="project-detail-updated">
                Last updated: {updatedAt}
                <i className="bi bi-info-circle" aria-hidden />
              </div>
            )}
          </div>

          <div className="project-detail-header">
            <div className="project-detail-header-main">
              <h1 className="project-detail-title">{project.name}</h1>
              {project.builder?.companyName && (
                <p className="project-detail-by">
                  By{' '}
                  <Link to={builderProjectsTo} className="project-detail-builder-link">
                    {project.builder.companyName}
                  </Link>
                </p>
              )}
              {shortLocation !== '—' && (
                <p className="project-detail-location-line">{shortLocation}</p>
              )}
              {project.reraId && (
                <span className="project-detail-rate-pill">
                  <i className="bi bi-patch-check me-1" aria-hidden />
                  RERA {project.reraId}
                </span>
              )}
            </div>

            <div className="project-detail-header-price">
              <div className="project-detail-price-row">
                <span className="project-detail-price-main">{priceCompact}</span>
                {avgPrice && (
                  <span className="project-detail-price-avg">| {avgPrice}</span>
                )}
              </div>
              {emiLabel && (
                <div className="project-detail-emi">EMI starts at {emiLabel}</div>
              )}
              <div className="project-detail-price-note">All inclusive Price</div>
              <a href="#contact-sellers" className="project-detail-contact-btn">
                <i className="bi bi-telephone-fill" aria-hidden />
                Contact Sellers
              </a>
            </div>
          </div>

          <div className="project-detail-gallery-grid">
            <div className="project-detail-gallery-main-tile">
              <button
                type="button"
                className="project-detail-gallery-open"
                onClick={() => openGallery(0)}
                aria-label="Open cover image"
              >
                {images[0] ? (
                  <img src={mediaUrl(images[0].url)} alt={images[0].caption || project.name} />
                ) : (
                  <div className="project-detail-gallery-placeholder">
                    <i className="bi bi-building" />
                  </div>
                )}
              </button>
              <span className="project-detail-cover-badge">Cover Image</span>
              <div className="project-detail-gallery-actions">
                <button type="button" className="project-detail-gallery-action" onClick={shareProject}>
                  <i className="bi bi-share" aria-hidden />
                  SHARE
                </button>
                <button
                  type="button"
                  className="project-detail-gallery-action"
                  onClick={(e) => saveProject(e, project.id)}
                >
                  <i className="bi bi-heart" aria-hidden />
                  SAVE
                </button>
              </div>
            </div>

            <div className="project-detail-gallery-side">
              <button
                type="button"
                className="project-detail-gallery-side-tile"
                onClick={() => openGallery(1)}
              >
                {images[1] ? (
                  <img src={mediaUrl(images[1].url)} alt={images[1].caption || ''} />
                ) : (
                  <div className="project-detail-gallery-placeholder is-side">
                    <i className="bi bi-image" />
                  </div>
                )}
              </button>
              <button
                type="button"
                className="project-detail-gallery-side-tile"
                onClick={() => openGallery(images.length > 2 ? 2 : 0)}
              >
                {images[2] ? (
                  <img src={mediaUrl(images[2].url)} alt={images[2].caption || ''} />
                ) : images[0] ? (
                  <img src={mediaUrl(images[0].url)} alt="" />
                ) : (
                  <div className="project-detail-gallery-placeholder is-side">
                    <i className="bi bi-image" />
                  </div>
                )}
                {moreCount > 0 && (
                  <span className="project-detail-more-overlay">+ {moreCount} more</span>
                )}
              </button>
            </div>
          </div>

          <div className="project-detail-highlights-bar">
            <div className="project-detail-highlight-item">
              <strong>{configLabel}</strong>
              <span>Configurations</span>
            </div>
            <div className="project-detail-highlight-item">
              <strong>{possessionStatus}</strong>
              <span>Possession Status</span>
            </div>
            <div className="project-detail-highlight-item">
              <strong>{avgPrice || '—'}</strong>
              <span>Avg. Price</span>
            </div>
            <div className="project-detail-highlight-item">
              <strong>{sizeRange}</strong>
              <span>Sizes</span>
            </div>
          </div>
        </div>
      </div>

      <ProjectDetailBody
        project={project}
        images={images}
        onShare={shareProject}
        onOpenGallery={openGallery}
      />

      {lightboxOpen && images.length > 0 && (
        <div className="project-detail-lightbox" role="dialog" aria-modal="true">
          <button
            type="button"
            className="project-detail-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close gallery"
          >
            <i className="bi bi-x-lg" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="project-detail-lightbox-nav is-prev"
                onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <button
                type="button"
                className="project-detail-lightbox-nav is-next"
                onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                aria-label="Next image"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </>
          )}
          <img
            src={mediaUrl(images[activeImage].url)}
            alt={images[activeImage].caption || project.name}
            className="project-detail-lightbox-image"
          />
          <div className="project-detail-lightbox-count">
            {activeImage + 1} / {images.length}
          </div>
        </div>
      )}

      <PublicSiteFooter />
    </div>
  );
}
