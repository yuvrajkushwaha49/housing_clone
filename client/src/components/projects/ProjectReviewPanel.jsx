import { useMemo, useRef, useState } from 'react';
import { projectService } from '../../services';
import { useToast } from '../../hooks/useToast';
import {
  amenityProjectPhotoUrl,
  findGalleryImage,
  getReviewDisplayValue,
  getReviewItemRating,
  isAmenityReviewSkipped,
  isProjectAmenitySelected,
  isReviewAutoSkipped,
  isReviewFieldMissing,
  isReviewFieldUnfilled,
  REVIEW_GROUP_LABELS,
  REVIEW_GROUP_ORDER,
  galleryPreviewUrl,
  findProjectAmenity,
} from '../../utils/projectReviewFields';

const GROUP_ICONS = {
  project: 'bi-file-earmark-text',
  building: 'bi-building',
  tower: 'bi-buildings',
  unit: 'bi-door-open',
  amenity: 'bi-stars',
  gallery: 'bi-images',
  document: 'bi-file-earmark-pdf',
};

function parseFieldTitle(title) {
  const parts = title.split(' — ');
  if (parts.length < 2) return { context: null, label: title };
  return {
    context: parts.slice(0, -1).join(' — '),
    label: parts[parts.length - 1],
  };
}

function normalizeReviewItem(project, item) {
  const missing = isReviewFieldMissing(project, item);
  if (missing) {
    return {
      ...item,
      status: 'approved',
      rating: 0,
      rejectionReason: '',
    };
  }
  const status = item.status === 'pending' ? 'approved' : item.status;
  const rating = item.status === 'rejected' ? 0 : (item.rating ?? 8);
  return {
    ...item,
    status,
    rating,
    rejectionReason: item.rejectionReason || '',
  };
}

function RatingPills({ value, disabled, rejected, onChange }) {
  return (
    <div className="review-rating-pills" role="group" aria-label="Rating out of 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`review-rating-pill ${!rejected && value === n ? 'active' : ''}`}
          disabled={disabled || rejected}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ReviewFieldCard({ item, project, onChange, disabled, hideContext = false, ratingOnly = false }) {
  const skipped = isReviewAutoSkipped(project, item);
  const missing = isReviewFieldMissing(project, item);
  const rejected = item.status === 'rejected';
  const approved = item.status === 'approved' && !missing;
  const unfilled = missing;
  const value = getReviewDisplayValue(project, item);
  const builderAmenityPhoto = item.sectionKey === 'amenity' && item.entityUuid && !skipped
    ? amenityProjectPhotoUrl(project, item.entityUuid)
    : null;
  const thumb = item.sectionKey === 'gallery' && item.fieldKey === 'image'
    ? galleryPreviewUrl(project, item.entityUuid)
    : item.sectionKey === 'amenity' && item.fieldKey === 'image'
      ? builderAmenityPhoto
      : null;
  const { context, label } = parseFieldTitle(item.title);
  const displayContext = hideContext ? null : context;

  return (
    <div className={`review-field-card ${rejected ? 'is-rejected' : ''} ${approved ? 'is-approved' : ''} ${unfilled ? 'is-unfilled' : ''} ${skipped ? 'is-amenity-skipped' : ''}`}>
      <div className="review-field-card-top">
        <div className="review-field-meta">
          {displayContext && <div className="review-field-context">{displayContext}</div>}
          <div className="review-field-label">{label}</div>
        </div>
        {!missing && !ratingOnly && (
          <div className="review-field-actions btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${approved ? 'btn-success' : 'btn-outline-success'}`}
              disabled={disabled}
              title="Approve"
              onClick={() => onChange({
                status: 'approved',
                rating: item.rating && item.rating > 0 ? item.rating : 8,
              })}
            >
              <i className="bi bi-check-lg" />
            </button>
            <button
              type="button"
              className={`btn ${rejected ? 'btn-danger' : 'btn-outline-danger'}`}
              disabled={disabled}
              title="Reject"
              onClick={() => onChange({ status: 'rejected', rating: 0 })}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}
      </div>

      <div className="review-field-value">
        {skipped && (
          <span className="badge text-bg-secondary me-2">
            <i className="bi bi-dash-circle me-1" />
            Not selected
          </span>
        )}
        {missing && (
          <span className="badge text-bg-warning text-dark me-2">Missing</span>
        )}
        {thumb ? (
          <div className="d-flex align-items-start gap-3">
            <img
              src={thumb}
              alt=""
              className={item.sectionKey === 'amenity' ? 'review-field-thumb-lg' : 'review-field-thumb'}
            />
            <span>{value}</span>
          </div>
        ) : (
          value
        )}
      </div>

      {missing ? (
        <div className="review-field-rating review-field-rating-auto">
          <span className="review-field-rating-label text-secondary">
            Auto <strong>0</strong>/10
            {skipped && item.sectionKey === 'amenity' && ' · not selected'}
            {skipped && item.sectionKey === 'gallery' && ' · no images'}
            {skipped && item.sectionKey === 'document' && ' · no documents'}
            {!skipped && ' · not provided'}
          </span>
        </div>
      ) : (
        <div className="review-field-rating">
          <span className="review-field-rating-label">
            Rating{' '}
            {rejected ? <strong className="text-danger">0</strong> : <strong>{getReviewItemRating(project, item)}</strong>}
            /10
          </span>
          <RatingPills
            value={getReviewItemRating(project, item)}
            rejected={rejected}
            disabled={disabled}
            onChange={(rating) => onChange({ rating, status: 'approved' })}
          />
        </div>
      )}

      {!missing && rejected && !ratingOnly && (
        <input
          type="text"
          className="form-control form-control-sm mt-2"
          disabled={disabled}
          placeholder="Why is this field rejected?"
          value={item.rejectionReason || ''}
          onChange={(e) => onChange({ rejectionReason: e.target.value })}
        />
      )}
    </div>
  );
}

function amenityIconClass(icon) {
  const value = (icon || 'bi-star').trim();
  if (!value) return 'bi bi-star';
  return value.startsWith('bi ') ? value : `bi ${value}`;
}

function amenityReviewItems(items) {
  const selection = items.find((i) => i.fieldKey === 'selection');
  if (selection) return [selection];
  const legacy = items.filter((i) => i.fieldKey === 'selected' || i.fieldKey === 'image');
  return legacy.length ? [legacy[0]] : items.slice(0, 1);
}

function AmenityReviewCard({ project, entityUuid, label, items, disabled, onItemChange, ratingOnly = false }) {
  const selected = isProjectAmenitySelected(project, entityUuid);
  const amenity = findProjectAmenity(project, entityUuid);
  const name = amenity?.name || label?.replace(/^Amenity — /, '')?.split(' — ')[0] || label;
  const category = amenity?.category;
  const builderPhoto = selected ? amenityProjectPhotoUrl(project, entityUuid) : null;
  const reviewItem = amenityReviewItems(items)[0];

  const syncChange = (patch) => {
    items.forEach((item) => onItemChange(item, patch));
  };

  if (!reviewItem) return null;

  const missing = isReviewFieldMissing(project, reviewItem);
  const skipped = !selected;
  const rejected = reviewItem.status === 'rejected';
  const approved = reviewItem.status === 'approved' && !missing;
  const rating = getReviewItemRating(project, reviewItem);

  return (
    <article
      className={`review-amenity-card ${selected ? 'is-selected' : 'is-skipped'} ${rejected ? 'is-rejected' : ''} ${approved ? 'is-approved' : ''}`}
    >
      <div className="review-amenity-card-visual">
        {builderPhoto ? (
          <a
            href={builderPhoto}
            target="_blank"
            rel="noreferrer"
            className="review-amenity-photo-link"
            title="Open photo"
          >
            <img src={builderPhoto} alt={name} className="review-amenity-photo" />
            <span className="review-amenity-photo-overlay">
              <i className="bi bi-box-arrow-up-right" />
            </span>
          </a>
        ) : (
          <div className={`review-amenity-icon-tile ${selected ? '' : 'is-muted'}`}>
            <i className={amenityIconClass(amenity?.icon)} />
          </div>
        )}
      </div>

      <div className="review-amenity-card-content">
        <div className="review-amenity-card-header">
          <div className="review-amenity-card-titles">
            <h3 className="review-amenity-name">{name}</h3>
            {category && <span className="review-amenity-category text-capitalize">{category}</span>}
          </div>
          {!missing && !ratingOnly && (
            <div className="review-amenity-card-actions btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${approved ? 'btn-success' : 'btn-outline-success'}`}
                disabled={disabled}
                onClick={() => syncChange({
                  status: 'approved',
                  rating: reviewItem.rating && reviewItem.rating > 0 ? reviewItem.rating : 8,
                })}
              >
                <i className="bi bi-check-lg" />
              </button>
              <button
                type="button"
                className={`btn ${rejected ? 'btn-danger' : 'btn-outline-danger'}`}
                disabled={disabled}
                onClick={() => syncChange({ status: 'rejected', rating: 0 })}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}
        </div>

        {skipped ? (
          <div className="review-amenity-skipped-note">
            <i className="bi bi-dash-circle me-1" />
            Not selected by builder
            <span className="review-amenity-auto-rating">Auto 0/10</span>
          </div>
        ) : missing ? (
          <div className="review-amenity-skipped-note">
            <i className="bi bi-exclamation-circle me-1" />
            Builder photo missing
            <span className="review-amenity-auto-rating">Auto 0/10</span>
          </div>
        ) : (
          <div className="review-amenity-status-row">
            <span className="review-amenity-chip is-success">
              <i className="bi bi-check-circle-fill" />
              Selected
            </span>
            <span className={`review-amenity-chip ${builderPhoto ? 'is-info' : 'is-warning'}`}>
              <i className={`bi ${builderPhoto ? 'bi-image-fill' : 'bi-image'}`} />
              {builderPhoto ? 'Photo uploaded' : 'No photo'}
            </span>
          </div>
        )}
      </div>

      {!skipped && !missing && (
        <>
          <div className="review-amenity-rating-block">
            <div className="review-amenity-rating-head">
              <span className="review-field-rating-label">
                Rating{' '}
                {rejected ? (
                  <strong className="text-danger">0</strong>
                ) : (
                  <strong>{rating}</strong>
                )}
                /10
              </span>
            </div>
            <RatingPills
              value={rating}
              rejected={rejected}
              disabled={disabled}
              onChange={(nextRating) => syncChange({ rating: nextRating, status: 'approved' })}
            />
          </div>

          {rejected && !ratingOnly && (
            <input
              type="text"
              className="form-control form-control-sm review-amenity-reject-input"
              disabled={disabled}
              placeholder="Why reject this amenity?"
              value={reviewItem.rejectionReason || ''}
              onChange={(e) => syncChange({ rejectionReason: e.target.value })}
            />
          )}
        </>
      )}
    </article>
  );
}

function galleryReviewItems(items) {
  const item = items.find((i) => i.fieldKey === 'item');
  if (item) return [item];
  const legacy = items.filter((i) => i.fieldKey === 'image' || i.fieldKey === 'caption');
  return legacy.length ? [legacy[0]] : items.slice(0, 1);
}

function GalleryReviewCard({ project, entityUuid, label, items, disabled, onItemChange, ratingOnly = false }) {
  const image = findGalleryImage(project, entityUuid);
  const preview = galleryPreviewUrl(project, entityUuid);
  const name = image?.caption?.trim() || image?.fileName || label?.replace(/^Gallery — /, '') || 'Gallery image';
  const caption = image?.caption?.trim();
  const reviewItem = galleryReviewItems(items)[0];

  const syncChange = (patch) => {
    items.forEach((item) => onItemChange(item, patch));
  };

  if (!reviewItem) return null;

  const missing = isReviewFieldMissing(project, reviewItem);
  const rejected = reviewItem.status === 'rejected';
  const approved = reviewItem.status === 'approved' && !missing;
  const rating = getReviewItemRating(project, reviewItem);

  return (
    <article
      className={`review-amenity-card is-selected ${rejected ? 'is-rejected' : ''} ${approved ? 'is-approved' : ''}`}
    >
      <div className="review-amenity-card-visual">
        {preview ? (
          <a
            href={preview}
            target="_blank"
            rel="noreferrer"
            className="review-amenity-photo-link"
            title="Open image"
          >
            <img src={preview} alt={name} className="review-amenity-photo" />
            <span className="review-amenity-photo-overlay">
              <i className="bi bi-box-arrow-up-right" />
            </span>
          </a>
        ) : (
          <div className="review-amenity-icon-tile">
            <i className="bi bi-image" />
          </div>
        )}
      </div>

      <div className="review-amenity-card-content">
        <div className="review-amenity-card-header">
          <div className="review-amenity-card-titles">
            <h3 className="review-amenity-name">{name}</h3>
            {image?.isPrimary && <span className="review-amenity-category">Primary image</span>}
          </div>
          {!missing && !ratingOnly && (
          <div className="review-amenity-card-actions btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${approved ? 'btn-success' : 'btn-outline-success'}`}
              disabled={disabled}
              onClick={() => syncChange({
                status: 'approved',
                rating: reviewItem.rating && reviewItem.rating > 0 ? reviewItem.rating : 8,
              })}
            >
              <i className="bi bi-check-lg" />
            </button>
            <button
              type="button"
              className={`btn ${rejected ? 'btn-danger' : 'btn-outline-danger'}`}
              disabled={disabled}
              onClick={() => syncChange({ status: 'rejected', rating: 0 })}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
          )}
        </div>

        <div className="review-amenity-status-row">
          <span className="review-amenity-chip is-success">
            <i className="bi bi-image-fill" />
            Image
          </span>
          <span className={`review-amenity-chip ${caption ? 'is-info' : 'is-warning'}`}>
            <i className="bi bi-card-text" />
            {caption ? 'Caption added' : 'No caption'}
          </span>
        </div>

        {caption && <p className="review-gallery-caption small text-secondary mb-0">{caption}</p>}

        {missing && (
          <div className="review-amenity-skipped-note">
            <i className="bi bi-exclamation-circle me-1" />
            {!preview ? 'Image missing' : 'Caption missing'}
            <span className="review-amenity-auto-rating">Auto 0/10</span>
          </div>
        )}
      </div>

      {!missing && (
        <>
          <div className="review-amenity-rating-block">
            <div className="review-amenity-rating-head">
              <span className="review-field-rating-label">
                Rating{' '}
                {rejected ? <strong className="text-danger">0</strong> : <strong>{rating}</strong>}
                /10
              </span>
            </div>
            <RatingPills
              value={rating}
              rejected={rejected}
              disabled={disabled}
              onChange={(nextRating) => syncChange({ rating: nextRating, status: 'approved' })}
            />
          </div>

          {rejected && !ratingOnly && (
            <input
              type="text"
              className="form-control form-control-sm review-amenity-reject-input"
              disabled={disabled}
              placeholder="Why reject this gallery image?"
              value={reviewItem.rejectionReason || ''}
              onChange={(e) => syncChange({ rejectionReason: e.target.value })}
            />
          )}
        </>
      )}
    </article>
  );
}

function GalleryEmptyReviewCard() {
  return (
    <article className="review-amenity-card is-skipped">
      <div className="review-amenity-card-visual">
        <div className="review-amenity-icon-tile is-muted">
          <i className="bi bi-images" />
        </div>
      </div>
      <div className="review-amenity-card-content">
        <div className="review-amenity-card-header">
          <div className="review-amenity-card-titles">
            <h3 className="review-amenity-name">Gallery</h3>
            <span className="review-amenity-category">No images uploaded</span>
          </div>
        </div>
        <div className="review-amenity-skipped-note">
          <i className="bi bi-dash-circle me-1" />
          Builder has not uploaded gallery images
          <span className="review-amenity-auto-rating">Auto 0/10</span>
        </div>
      </div>
    </article>
  );
}

function ReviewGroup({ group, project, disabled, onItemChange, defaultOpen, ratingOnly = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const rejectedCount = group.items.filter((i) => i.status === 'rejected').length;
  const missingCount = group.items.filter((i) => isReviewFieldMissing(project, i)).length;
  const ratedCount = group.items.length - missingCount;
  const groupAvg = ratedCount > 0
    ? Math.round(
      (group.items.reduce((sum, i) => sum + getReviewItemRating(project, i), 0) / group.items.length) * 10
    ) / 10
    : 0;
  const subgroups = useMemo(() => {
    if (!['unit', 'tower', 'building', 'amenity', 'gallery'].includes(group.key)) {
      return [{ key: group.key, label: null, items: group.items }];
    }
    const map = new Map();
    for (const item of group.items) {
      const key = item.entityUuid || 'general';
      if (!map.has(key)) {
        const { context } = parseFieldTitle(item.title);
        map.set(key, { key, label: context, items: [] });
      }
      map.get(key).items.push(item);
    }
    return [...map.values()];
  }, [group]);

  return (
    <div className="review-group">
      <button
        type="button"
        className="review-group-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="review-group-header-left">
          <span className="review-group-icon">
            <i className={`bi ${GROUP_ICONS[group.key] || 'bi-folder'}`} />
          </span>
          <div className="review-group-header-text">
            <span className="review-group-title">{group.label}</span>
            <span className="review-group-subtitle">
              {group.items.length} fields
              {ratedCount > 0 && ` · avg ${groupAvg}/10`}
              {missingCount > 0 && ` · ${missingCount} missing`}
            </span>
          </div>
          {rejectedCount > 0 && (
            <span className="badge text-bg-danger">{rejectedCount} rejected</span>
          )}
        </div>
        <i className={`bi review-group-chevron ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
      </button>

      {open && (
        <div className="review-group-body">
          {group.key === 'gallery' ? (
            <div className="review-amenities-grid">
              {subgroups
                .filter((sub) => sub.key !== 'general')
                .map((sub) => (
                  <GalleryReviewCard
                    key={sub.key}
                    project={project}
                    entityUuid={sub.key}
                    label={sub.label}
                    items={sub.items}
                    disabled={disabled}
                    ratingOnly={ratingOnly}
                    onItemChange={onItemChange}
                  />
                ))}
              {subgroups
                .filter((sub) => sub.key === 'general')
                .map((sub) => (
                  <GalleryEmptyReviewCard key={sub.key} />
                ))}
            </div>
          ) : group.key === 'amenity' ? (
            <div className="review-amenities-grid">
              {subgroups
                .filter((sub) => sub.key !== 'general')
                .sort((a, b) => {
                  const aSel = isProjectAmenitySelected(project, a.key);
                  const bSel = isProjectAmenitySelected(project, b.key);
                  if (aSel === bSel) return 0;
                  return aSel ? -1 : 1;
                })
                .map((sub) => (
                  <AmenityReviewCard
                    key={sub.key}
                    project={project}
                    entityUuid={sub.key}
                    label={sub.label}
                    items={sub.items}
                    disabled={disabled}
                    ratingOnly={ratingOnly}
                    onItemChange={onItemChange}
                  />
                ))}
            </div>
          ) : (
            subgroups.map((sub) => (
              <div key={sub.key} className="review-subgroup">
                {sub.label && <div className="review-subgroup-title">{sub.label}</div>}
                <div className="review-field-grid">
                  {sub.items.map((item) => (
                    <ReviewFieldCard
                      key={item.id}
                      item={item}
                      project={project}
                      disabled={disabled}
                      ratingOnly={ratingOnly}
                      onChange={(patch) => onItemChange(item, patch)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProjectRejectForm({
  reason,
  onReasonChange,
  saving,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm rejection',
}) {
  return (
    <div className="review-decision-reject-form">
      <label className="form-label">Rejection reason <span className="text-danger">*</span></label>
      <textarea
        className="form-control"
        rows={3}
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Explain why this project is being rejected"
        disabled={saving}
      />
      <div className="review-decision-actions mt-3">
        <button
          type="button"
          className="btn btn-danger"
          disabled={saving}
          onClick={onConfirm}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Rejecting…
            </>
          ) : (
            <>
              <i className="bi bi-x-circle me-2" />
              {confirmLabel}
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectReviewPanel({ projectId, project, review, onCompleted, twoStepReview = false }) {
  const toast = useToast();
  const unitTowerMap = useMemo(
    () => Object.fromEntries((project?.units || []).map((unit) => [unit.id, unit.tower?.id])),
    [project]
  );
  const [items, setItems] = useState(() =>
    (review?.items || []).map((item) => normalizeReviewItem(project, item))
  );
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(twoStepReview ? 'decision' : 'rating');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [projectRejectionReason, setProjectRejectionReason] = useState('');
  const footerRef = useRef(null);

  const openRejectForm = () => {
    setShowRejectForm(true);
    requestAnimationFrame(() => {
      footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const closeRejectForm = () => {
    setShowRejectForm(false);
    setProjectRejectionReason('');
  };

  const grouped = useMemo(() => {
    const groups = {};
    for (const item of items) {
      if (!groups[item.sectionKey]) groups[item.sectionKey] = [];
      groups[item.sectionKey].push(item);
    }
    return REVIEW_GROUP_ORDER
      .filter((key) => groups[key]?.length)
      .map((key) => ({
        key,
        label: REVIEW_GROUP_LABELS[key] || key,
        items: groups[key],
      }));
  }, [items]);

  const stats = useMemo(() => ({
    total: items.length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    approved: items.filter((i) => i.status === 'approved').length,
    unfilled: items.filter((i) => isReviewFieldUnfilled(project, i)).length,
    avgRating: items.length
      ? Math.round((items.reduce((s, i) => s + getReviewItemRating(project, i), 0) / items.length) * 10) / 10
      : 0,
  }), [items, project]);

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      if (isReviewFieldMissing(project, next)) {
        next.status = 'approved';
        next.rating = 0;
        next.rejectionReason = '';
      } else if (next.status === 'rejected') {
        next.rating = 0;
      } else if (next.status === 'approved' && (!next.rating || next.rating < 1)) {
        next.rating = 8;
      }
      return next;
    }));
  };

  const handleItemChange = (item, patch) => {
    if (item.sectionKey === 'tower' && patch.status === 'rejected') {
      setItems((prev) => prev.map((row) => {
        if (row.id === item.id) {
          return {
            ...row,
            status: 'rejected',
            rating: 0,
            rejectionReason: row.rejectionReason || 'Tower field rejected',
          };
        }
        if (
          row.sectionKey === 'unit'
          && row.entityUuid
          && unitTowerMap[row.entityUuid] === item.entityUuid
        ) {
          return {
            ...row,
            status: 'rejected',
            rating: 0,
            rejectionReason: 'Rejected because parent tower was rejected',
          };
        }
        return row;
      }));
      return;
    }
    updateItem(item.id, patch);
  };

  const handleAcceptProject = () => {
    setItems((prev) => prev.map((item) => {
      if (isReviewFieldMissing(project, item)) {
        return { ...item, status: 'approved', rating: 0, rejectionReason: '' };
      }
      return {
        ...item,
        status: 'approved',
        rating: item.rating && item.rating > 0 ? item.rating : 8,
        rejectionReason: '',
      };
    }));
    setShowRejectForm(false);
    setProjectRejectionReason('');
    setPhase('rating');
  };

  const submitProjectReject = async () => {
    if (!projectRejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await projectService.completeReview(projectId, {
        projectDecision: 'rejected',
        rejectionReason: projectRejectionReason.trim(),
        reviewerNotes,
      });
      onCompleted?.(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        reviewerNotes,
        items: items.map((item) => ({
          id: item.id,
          sectionKey: item.sectionKey,
          fieldKey: item.fieldKey,
          entityUuid: item.entityUuid || undefined,
          status: item.status,
          rating: item.status === 'rejected' ? 0 : getReviewItemRating(project, item),
          rejectionReason: item.status === 'rejected' ? item.rejectionReason : undefined,
        })),
      };
      const { data } = await projectService.completeReview(projectId, payload);
      onCompleted?.(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  if (!review || review.status !== 'in_review') {
    return <div className="text-secondary small">No active review session.</div>;
  }

  const stepIndicator = twoStepReview ? (
    <div className="review-steps" aria-label="Review progress">
      <div className={`review-step ${phase === 'decision' ? 'is-active' : 'is-done'}`}>
        <span className="review-step-num">1</span>
        <span className="review-step-label">Accept or reject</span>
      </div>
      <div className="review-step-divider" aria-hidden />
      <div className={`review-step ${phase === 'rating' ? 'is-active' : ''}`}>
        <span className="review-step-num">2</span>
        <span className="review-step-label">Field ratings</span>
      </div>
    </div>
  ) : null;

  if (twoStepReview && phase === 'decision') {
    return (
      <div className="review-panel">
        {stepIndicator}

        <div className="review-decision-card">
          <div className="review-decision-card-head">
            <i className="bi bi-clipboard2-check" />
            <div>
              <h2 className="review-decision-title">Project decision</h2>
              <p className="review-decision-subtitle mb-0">
                Review the project summary below. Accept to continue with field ratings, or reject with a reason.
              </p>
            </div>
          </div>

          <div className="review-decision-summary">
            <div className="review-decision-summary-row">
              <span className="review-decision-summary-label">Project</span>
              <span className="review-decision-summary-value">{project.name}</span>
            </div>
            <div className="review-decision-summary-row">
              <span className="review-decision-summary-label">Builder</span>
              <span className="review-decision-summary-value">{project.builder?.companyName || '—'}</span>
            </div>
            {project.category?.name && (
              <div className="review-decision-summary-row">
                <span className="review-decision-summary-label">Category</span>
                <span className="review-decision-summary-value">{project.category.name}</span>
              </div>
            )}
            <div className="review-decision-summary-row">
              <span className="review-decision-summary-label">Fields to rate</span>
              <span className="review-decision-summary-value">{stats.total}</span>
            </div>
          </div>

          {!showRejectForm ? (
            <div className="review-decision-actions">
              <button
                type="button"
                className="btn btn-success review-decision-btn"
                disabled={saving}
                onClick={handleAcceptProject}
              >
                <i className="bi bi-check-circle me-2" />
                Accept project
              </button>
              <button
                type="button"
                className="btn btn-outline-danger review-decision-btn"
                disabled={saving}
                onClick={() => setShowRejectForm(true)}
              >
                <i className="bi bi-x-circle me-2" />
                Reject project
              </button>
            </div>
          ) : (
            <ProjectRejectForm
              reason={projectRejectionReason}
              onReasonChange={setProjectRejectionReason}
              saving={saving}
              onConfirm={submitProjectReject}
              onCancel={closeRejectForm}
            />
          )}

          <div className="review-footer-notes mt-3">
            <label className="form-label">Reviewer notes <span className="text-secondary fw-normal">(optional)</span></label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Overall comments for the builder"
              disabled={saving}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-panel">
      {stepIndicator}

      {twoStepReview && (
        <div className="review-decision-accepted-banner">
          <i className="bi bi-check-circle-fill" />
          <span>Project accepted. Rate each field below (1–10).</span>
          <div className="review-decision-banner-actions">
            <button
              type="button"
              className="btn btn-link btn-sm review-decision-back-link"
              disabled={saving}
              onClick={() => {
                closeRejectForm();
                setPhase('decision');
              }}
            >
              Change decision
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm review-decision-reject-link"
              disabled={saving}
              onClick={openRejectForm}
            >
              Reject project
            </button>
          </div>
        </div>
      )}
      <div className="review-stats-grid">
        <div className="review-stat-card">
          <span className="review-stat-label">Total fields</span>
          <span className="review-stat-value">{stats.total}</span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-label">Average rating</span>
          <span className="review-stat-value">{stats.avgRating}<span className="review-stat-suffix">/10</span></span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-label">Missing / auto 0</span>
          <span className={`review-stat-value ${stats.unfilled > 0 ? 'is-warning' : ''}`}>{stats.unfilled}</span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-label">Rejected</span>
          <span className={`review-stat-value ${stats.rejected > 0 ? 'is-danger' : ''}`}>{stats.rejected}</span>
        </div>
      </div>

      <div className="review-progress-section">
        <div className="review-progress-labels">
          <span>{stats.approved} approved</span>
          <span>{stats.rejected} rejected</span>
        </div>
        <div className="progress review-progress">
          <div
            className="progress-bar bg-success"
            style={{ width: `${(stats.approved / stats.total) * 100}%` }}
          />
          <div
            className="progress-bar bg-danger"
            style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="review-instructions">
        <i className="bi bi-info-circle" />
        <span>
          {twoStepReview ? (
            <>
              Rate each filled field from <strong>1–10</strong>. Missing fields are auto-rated <strong>0</strong>.
            </>
          ) : (
            <>
              Missing fields are auto-rated <strong>0</strong>. Rate filled fields 1–10 or reject with a reason.
              Rejecting a tower rejects all its units.
            </>
          )}
        </span>
      </div>

      <div className="review-groups">
        {grouped.map((group, index) => (
          <ReviewGroup
            key={group.key}
            group={group}
            project={project}
            disabled={saving}
            defaultOpen={index === 0}
            ratingOnly={twoStepReview}
            onItemChange={handleItemChange}
          />
        ))}
      </div>

      <div className="review-footer review-footer-sticky" ref={footerRef}>
        {twoStepReview && showRejectForm ? (
          <ProjectRejectForm
            reason={projectRejectionReason}
            onReasonChange={setProjectRejectionReason}
            saving={saving}
            onConfirm={submitProjectReject}
            onCancel={closeRejectForm}
            confirmLabel="Reject entire project"
          />
        ) : (
          <>
            <div className="review-footer-notes">
              <label className="form-label">Reviewer notes <span className="text-secondary fw-normal">(optional)</span></label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Overall comments for the builder"
                disabled={saving}
              />
            </div>
            <div className="review-footer-actions">
              {twoStepReview && (
                <button
                  type="button"
                  className="btn btn-outline-danger review-reject-project-btn"
                  disabled={saving}
                  onClick={openRejectForm}
                >
                  <i className="bi bi-x-circle me-2" />
                  Reject entire project
                </button>
              )}
              <button type="button" className="btn btn-primary review-submit-btn" disabled={saving} onClick={submit}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-2" />
                    {twoStepReview ? 'Submit ratings & publish' : 'Complete review & publish decision'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
