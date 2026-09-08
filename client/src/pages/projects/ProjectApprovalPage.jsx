import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProjectDetailsView from '../../components/projects/ProjectDetailsView';
import ProjectReviewPanel from '../../components/projects/ProjectReviewPanel';
import {
  formatLocation,
  formatPriceRange,
  formatProjectStatus,
  PROJECT_STATUS_BADGE,
} from '../../components/projects/projectUtils';
import { mediaUrl, projectService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { ROLE_CODES } from '../../constants';

function ProjectReviewHeader({ project, projectBasePath, listPath }) {
  const thumb = project.primaryImage || project.media?.find((m) => m.mediaType === 'image')?.url;
  const reviewCount = project.review?.items?.length ?? 0;
  const isPending = project.status === 'pending';

  return (
    <div className="review-project-header">
      <div className="review-project-header-visual">
        {thumb ? (
          <img
            src={mediaUrl(thumb)}
            alt=""
            className="review-project-header-img"
          />
        ) : (
          <div className="review-project-header-img-placeholder">
            <i className="bi bi-building" />
          </div>
        )}
      </div>
      <div className="review-project-header-body">
        <Link to={listPath} className="review-back-link">
          <i className="bi bi-arrow-left" />
          Back to projects
        </Link>
        <div className="review-project-header-main">
          <div className="review-project-header-info">
            <h1 className="review-project-title">{project.name}</h1>
            <p className="review-project-subtitle">
              {project.builder?.companyName || '—'}
              <span className="review-project-dot">·</span>
              {formatLocation(project)}
            </p>
          </div>
          <div className="review-project-header-actions">
            <span className={`badge review-status-badge ${PROJECT_STATUS_BADGE[project.status] || 'text-bg-light border'}`}>
              {formatProjectStatus(project.status)}
            </span>
            <Link className="btn btn-sm btn-outline-secondary" to={`${projectBasePath}/${project.id}`}>
              <i className="bi bi-sliders me-1" />
              Full manage
            </Link>
          </div>
        </div>
        <div className="review-project-meta">
          {project.category?.name && (
            <span className="review-project-meta-chip">
              <i className="bi bi-tag" />
              {project.category.name}
            </span>
          )}
          {project.reraId && (
            <span className="review-project-meta-chip">
              <i className="bi bi-shield-check" />
              RERA {project.reraId}
            </span>
          )}
          {(project.minPrice != null || project.maxPrice != null) && (
            <span className="review-project-meta-chip">
              <i className="bi bi-currency-rupee" />
              {formatPriceRange(project.minPrice, project.maxPrice)}
            </span>
          )}
          {isPending && reviewCount > 0 && (
            <span className="review-project-meta-chip is-highlight">
              <i className="bi bi-ui-checks" />
              {reviewCount} fields to review
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectApprovalPage() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const isSuperAdmin = user?.role?.code === ROLE_CODES.SUPER_ADMIN;
  const { uuid } = useParams();
  const location = useLocation();
  const listPath = location.pathname.replace(/\/[^/]+\/review$/, '');
  const projectBasePath = listPath;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailTab, setDetailTab] = useState('review');

  useEffect(() => {
    setDetailTab('review');
  }, [uuid]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    projectService.get(uuid)
      .then(({ data }) => {
        if (!cancelled) setProject(data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'Failed to load project';
          toast.apiError(err, 'Failed to load project');
          setLoadError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uuid, toast]);

  const onReviewCompleted = (updated) => {
    setProject(updated);
    if (updated.status === 'published') {
      toast.success('Project published successfully');
    } else {
      toast.success('Project rejected');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="panel-card text-center py-5">
        <p className="text-secondary mb-3">{loadError || 'Project not found'}</p>
        <Link to={listPath} className="btn btn-outline-primary btn-sm">
          Back to projects
        </Link>
      </div>
    );
  }

  const isPendingReview = project.status === 'pending';

  return (
    <div className="admin-projects-page project-review-page">
      <div className="panel-card admin-detail-panel review-page-card p-0">
        <ProjectReviewHeader
          project={project}
          projectBasePath={projectBasePath}
          listPath={listPath}
        />

        {isPendingReview ? (
          <>
            <div className="review-detail-tabs">
              <button
                type="button"
                className={`review-detail-tab ${detailTab === 'review' ? 'active' : ''}`}
                onClick={() => setDetailTab('review')}
              >
                <i className="bi bi-ui-checks me-1" />
                {isSuperAdmin ? 'Review' : 'Field review'}
              </button>
              <button
                type="button"
                className={`review-detail-tab ${detailTab === 'preview' ? 'active' : ''}`}
                onClick={() => setDetailTab('preview')}
              >
                <i className="bi bi-eye me-1" />
                Full preview
              </button>
            </div>

            <div className="review-detail-body">
              {detailTab === 'review' ? (
                <ProjectReviewPanel
                  projectId={project.id}
                  project={project}
                  review={project.review}
                  twoStepReview={isSuperAdmin}
                  onCompleted={onReviewCompleted}
                />
              ) : (
                <ProjectDetailsView
                  project={project}
                  showAdminMeta
                  showPublicLink
                />
              )}
            </div>
          </>
        ) : (
          <div className="review-detail-body">
            <ProjectDetailsView
              project={project}
              showAdminMeta
              showPublicLink
              footer={(
                <div className="d-flex gap-2 mt-3">
                  <Link
                    className="btn btn-outline-primary btn-sm"
                    to={`${projectBasePath}/${project.id}`}
                  >
                    Open full manage
                  </Link>
                  {project.status === 'published' && (
                    <Link
                      className="btn btn-outline-secondary btn-sm"
                      to={`/project/${project.slug}`}
                      target="_blank"
                    >
                      View public page
                    </Link>
                  )}
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
