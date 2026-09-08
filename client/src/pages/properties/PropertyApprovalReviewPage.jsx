import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PropertyReviewPanel from '../../components/properties/PropertyReviewPanel';
import {
  formatPropertyPrice,
  formatPropertyPurpose,
  formatPropertyStatus,
  PROPERTY_STATUS_BADGE,
} from '../../components/properties/propertyUtils';
import { getReviewableItems } from '../../utils/propertyReviewFields';
import { mediaUrl, propertyService } from '../../services';
import { useToast } from '../../hooks/useToast';

function PropertyReviewHeader({ property, propertyBasePath, listPath }) {
  const thumb = property.primaryImageUrl
    ? mediaUrl(property.primaryImageUrl)
    : (() => {
        const image = property.media?.find((m) => m.mediaType === 'image');
        return image?.url ? mediaUrl(image.url) : null;
      })();
  const reviewCount = getReviewableItems(property, property.review?.items || []).length;

  return (
    <div className="review-project-header">
      <div className="review-project-header-visual">
        {thumb ? (
          <img src={thumb} alt="" className="review-project-header-img" />
        ) : (
          <div className="review-project-header-img-placeholder">
            <i className="bi bi-house-door" />
          </div>
        )}
      </div>
      <div className="review-project-header-body">
        <Link to={listPath} className="review-back-link">
          <i className="bi bi-arrow-left" />
          Back to properties
        </Link>
        <div className="review-project-header-main">
          <div className="review-project-header-info">
            <h1 className="review-project-title">{property.title}</h1>
            <p className="review-project-subtitle">
              {property.listedBy?.name || '—'}
              <span className="review-project-dot">·</span>
              {property.city?.name || '—'}
            </p>
          </div>
          <div className="review-project-header-actions">
            <span className={`badge review-status-badge ${PROPERTY_STATUS_BADGE[property.status] || 'text-bg-light border'}`}>
              {formatPropertyStatus(property.status)}
            </span>
            <Link className="btn btn-sm btn-outline-secondary" to={`${propertyBasePath}/${property.id}/edit`}>
              <i className="bi bi-pencil me-1" />
              Edit listing
            </Link>
            {property.slug && (
              <a className="btn btn-sm btn-outline-secondary" href={`/property/${property.slug}`} target="_blank" rel="noreferrer">
                Preview
              </a>
            )}
          </div>
        </div>
        <div className="review-project-meta">
          {property.propertyType?.name && (
            <span className="review-project-meta-chip">
              <i className="bi bi-building" />
              {property.propertyType.name}
            </span>
          )}
          {property.purpose && (
            <span className="review-project-meta-chip">
              <i className="bi bi-tag" />
              {formatPropertyPurpose(property.purpose)}
            </span>
          )}
          {property.price != null && (
            <span className="review-project-meta-chip">
              <i className="bi bi-currency-rupee" />
              {formatPropertyPrice(property.price)}
            </span>
          )}
          {property.status === 'pending' && reviewCount > 0 && (
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

export default function PropertyApprovalReviewPage() {
  const toast = useToast();
  const { uuid } = useParams();
  const location = useLocation();
  const listPath = location.pathname.replace(/\/[^/]+\/review$/, '');
  const propertyBasePath = listPath;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    propertyService.getById(uuid)
      .then(({ data }) => {
        if (!cancelled) setProperty(data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'Failed to load property';
          toast.apiError(err, 'Failed to load property');
          setLoadError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uuid, toast]);

  const onReviewCompleted = (updated) => {
    setProperty(updated);
    if (updated.status === 'approved') {
      toast.success('Property approved and published');
    } else {
      toast.success('Property rejected');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (!property) {
    return (
      <div className="panel-card text-center py-5">
        <p className="text-secondary mb-3">{loadError || 'Property not found'}</p>
        <Link to={listPath} className="btn btn-outline-primary btn-sm">Back to properties</Link>
      </div>
    );
  }

  return (
    <div className="admin-projects-page project-review-page">
      <div className="panel-card admin-detail-panel review-page-card p-0">
        <PropertyReviewHeader property={property} propertyBasePath={propertyBasePath} listPath={listPath} />
        <div className="review-page-body p-3 p-md-4">
          {property.status === 'pending' ? (
            <PropertyReviewPanel
              propertyId={property.id}
              property={property}
              review={property.review}
              onCompleted={onReviewCompleted}
            />
          ) : (
            <div className="text-secondary">
              This property is no longer pending review (status: {formatPropertyStatus(property.status)}).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
