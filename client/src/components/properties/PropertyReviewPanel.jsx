import { useEffect, useMemo, useRef, useState } from 'react';
import { propertyService } from '../../services';
import { useToast } from '../../hooks/useToast';
import {
  findGalleryImage,
  findPropertyAmenity,
  galleryPreviewUrl,
  getReviewableItems,
  getReviewDisplayValue,
  getReviewItemRating,
  isAmenityReviewSkipped,
  isPropertyAmenitySelected,
  isReviewAutoSkipped,
  isReviewFieldMissing,
  isReviewFieldUnfilled,
  REVIEW_GROUP_LABELS,
  REVIEW_GROUP_ORDER,
} from '../../utils/propertyReviewFields';
import { isPlotProperty } from './propertyUtils';

const GROUP_ICONS = {
  property: 'bi-card-text',
  pricing: 'bi-currency-rupee',
  size: 'bi-rulers',
  features: 'bi-sliders',
  location: 'bi-geo-alt',
  amenity: 'bi-stars',
  gallery: 'bi-images',
  seo: 'bi-search',
};

function parseFieldTitle(title) {
  const parts = title.split(' — ');
  if (parts.length < 2) return { context: null, label: title };
  return {
    context: parts.slice(0, -1).join(' — '),
    label: parts[parts.length - 1],
  };
}

function normalizeReviewItem(property, item) {
  const missing = isReviewFieldMissing(property, item);
  if (missing) {
    return { ...item, status: 'approved', rating: 0, rejectionReason: '' };
  }
  const status = item.status === 'pending' ? 'approved' : item.status;
  const rating = item.status === 'rejected' ? 0 : (item.rating ?? 8);
  return { ...item, status, rating, rejectionReason: item.rejectionReason || '' };
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

function ReviewFieldCard({ item, property, onChange, disabled, hideContext = false, ratingOnly = false }) {
  const skipped = isReviewAutoSkipped(property, item);
  const missing = isReviewFieldMissing(property, item);
  const rejected = item.status === 'rejected';
  const approved = item.status === 'approved' && !missing;
  const value = getReviewDisplayValue(property, item);
  const thumb = item.sectionKey === 'gallery' && item.entityUuid
    ? galleryPreviewUrl(property, item.entityUuid)
    : null;
  const { context, label } = parseFieldTitle(item.title);
  const displayContext = hideContext ? null : context;

  return (
    <div className={`review-field-card ${rejected ? 'is-rejected' : ''} ${approved ? 'is-approved' : ''} ${missing ? 'is-unfilled' : ''} ${skipped ? 'is-amenity-skipped' : ''}`}>
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
              onClick={() => onChange({ status: 'rejected', rating: 0 })}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}
      </div>

      <div className="review-field-value">
        {skipped && <span className="badge text-bg-secondary me-2"><i className="bi bi-dash-circle me-1" />Not selected</span>}
        {missing && <span className="badge text-bg-warning text-dark me-2">Missing</span>}
        {thumb ? (
          <div className="d-flex align-items-start gap-3">
            <img src={thumb} alt="" className="review-field-thumb" />
            <span>{value}</span>
          </div>
        ) : value}
      </div>

      {missing ? (
        <div className="review-field-rating review-field-rating-auto">
          <span className="review-field-rating-label text-secondary">
            Auto <strong>0</strong>/10
            {!skipped && ' · not provided'}
          </span>
        </div>
      ) : (
        <div className="review-field-rating">
          <span className="review-field-rating-label">
            Rating{' '}
            {rejected ? <strong className="text-danger">0</strong> : <strong>{getReviewItemRating(property, item)}</strong>}
            /10
          </span>
          <RatingPills
            value={getReviewItemRating(property, item)}
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

function AmenityReviewCard({ property, entityUuid, label, items, disabled, onItemChange, ratingOnly = false }) {
  const selected = isPropertyAmenitySelected(property, entityUuid);
  const amenity = findPropertyAmenity(property, entityUuid);
  const name = amenity?.name || label?.replace(/^Amenity — /, '') || label;
  const reviewItem = items[0];
  if (!reviewItem) return null;

  const syncChange = (patch) => items.forEach((item) => onItemChange(item, patch));
  const missing = isReviewFieldMissing(property, reviewItem);
  const skipped = !selected;
  const rejected = reviewItem.status === 'rejected';
  const approved = reviewItem.status === 'approved' && !missing;
  const rating = getReviewItemRating(property, reviewItem);

  return (
    <article className={`review-amenity-card ${selected ? 'is-selected' : 'is-skipped'} ${rejected ? 'is-rejected' : ''} ${approved ? 'is-approved' : ''}`}>
      <div className="review-amenity-card-visual">
        <div className={`review-amenity-icon-tile ${selected ? '' : 'is-muted'}`}>
          <i className={amenityIconClass(amenity?.icon)} />
        </div>
      </div>
      <div className="review-amenity-card-content">
        <div className="review-amenity-card-header">
          <div className="review-amenity-card-titles">
            <h3 className="review-amenity-name">{name}</h3>
            {amenity?.category && <span className="review-amenity-category text-capitalize">{amenity.category}</span>}
          </div>
          {!missing && !ratingOnly && (
            <div className="review-amenity-card-actions btn-group btn-group-sm" role="group">
              <button type="button" className={`btn ${approved ? 'btn-success' : 'btn-outline-success'}`} disabled={disabled} onClick={() => syncChange({ status: 'approved', rating: reviewItem.rating && reviewItem.rating > 0 ? reviewItem.rating : 8 })}>
                <i className="bi bi-check-lg" />
              </button>
              <button type="button" className={`btn ${rejected ? 'btn-danger' : 'btn-outline-danger'}`} disabled={disabled} onClick={() => syncChange({ status: 'rejected', rating: 0 })}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}
        </div>
        {skipped ? (
          <div className="review-amenity-skipped-note">
            <i className="bi bi-dash-circle me-1" />
            Not selected by lister
            <span className="review-amenity-auto-rating">Auto 0/10</span>
          </div>
        ) : (
          <div className="review-amenity-status-row">
            <span className="review-amenity-chip is-success"><i className="bi bi-check-circle-fill" />Selected</span>
          </div>
        )}
        {!missing && (
          <>
            <div className="review-amenity-rating-block">
              <span className="review-field-rating-label">
                Rating {rejected ? <strong className="text-danger">0</strong> : <strong>{rating}</strong>}/10
              </span>
              <RatingPills value={rating} rejected={rejected} disabled={disabled} onChange={(nextRating) => syncChange({ rating: nextRating, status: 'approved' })} />
            </div>
            {rejected && !ratingOnly && (
              <input type="text" className="form-control form-control-sm review-amenity-reject-input" disabled={disabled} placeholder="Why reject this amenity?" value={reviewItem.rejectionReason || ''} onChange={(e) => syncChange({ rejectionReason: e.target.value })} />
            )}
          </>
        )}
      </div>
    </article>
  );
}

function GalleryReviewCard({ property, entityUuid, items, disabled, onItemChange, ratingOnly = false }) {
  const image = findGalleryImage(property, entityUuid);
  const reviewItem = items[0];
  if (!reviewItem) return null;
  const syncChange = (patch) => items.forEach((item) => onItemChange(item, patch));
  const missing = isReviewFieldMissing(property, reviewItem);
  const rejected = reviewItem.status === 'rejected';
  const approved = reviewItem.status === 'approved' && !missing;
  const rating = getReviewItemRating(property, reviewItem);
  const preview = galleryPreviewUrl(property, entityUuid);

  return (
    <article className={`review-amenity-card is-selected ${rejected ? 'is-rejected' : ''} ${approved ? 'is-approved' : ''}`}>
      <div className="review-amenity-card-visual">
        {preview ? (
          <a href={preview} target="_blank" rel="noreferrer" className="review-amenity-photo-link">
            <img src={preview} alt="" className="review-amenity-photo" />
          </a>
        ) : (
          <div className="review-amenity-icon-tile is-muted"><i className="bi bi-image" /></div>
        )}
      </div>
      <div className="review-amenity-card-content">
        <div className="review-amenity-card-header">
          <div className="review-amenity-card-titles">
            <h3 className="review-amenity-name">{image?.fileName || 'Photo'}</h3>
            {image?.isPrimary && <span className="review-amenity-category">Primary</span>}
          </div>
          {!missing && !ratingOnly && (
            <div className="review-amenity-card-actions btn-group btn-group-sm" role="group">
              <button type="button" className={`btn ${approved ? 'btn-success' : 'btn-outline-success'}`} disabled={disabled} onClick={() => syncChange({ status: 'approved', rating: reviewItem.rating && reviewItem.rating > 0 ? reviewItem.rating : 8 })}>
                <i className="bi bi-check-lg" />
              </button>
              <button type="button" className={`btn ${rejected ? 'btn-danger' : 'btn-outline-danger'}`} disabled={disabled} onClick={() => syncChange({ status: 'rejected', rating: 0 })}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}
        </div>
        {!missing && (
          <>
            <div className="review-amenity-rating-block">
              <span className="review-field-rating-label">
                Rating {rejected ? <strong className="text-danger">0</strong> : <strong>{rating}</strong>}/10
              </span>
              <RatingPills value={rating} rejected={rejected} disabled={disabled} onChange={(nextRating) => syncChange({ rating: nextRating, status: 'approved' })} />
            </div>
            {rejected && !ratingOnly && (
              <input type="text" className="form-control form-control-sm review-amenity-reject-input" disabled={disabled} placeholder="Why reject this photo?" value={reviewItem.rejectionReason || ''} onChange={(e) => syncChange({ rejectionReason: e.target.value })} />
            )}
          </>
        )}
      </div>
    </article>
  );
}

function GalleryEmptyReviewCard() {
  return (
    <article className="review-amenity-card is-skipped">
      <div className="review-amenity-card-visual">
        <div className="review-amenity-icon-tile is-muted"><i className="bi bi-images" /></div>
      </div>
      <div className="review-amenity-card-content">
        <h3 className="review-amenity-name">Photos</h3>
        <div className="review-amenity-skipped-note">
          <i className="bi bi-dash-circle me-1" />
          No photos uploaded
          <span className="review-amenity-auto-rating">Auto 0/10</span>
        </div>
      </div>
    </article>
  );
}

function ReviewGroup({ group, property, disabled, onItemChange, defaultOpen, ratingOnly = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isPlotAmenityGroup = group.key === 'amenity' && isPlotProperty(property);
  const groupLabel = isPlotAmenityGroup ? REVIEW_GROUP_LABELS.plotAmenity : group.label;
  const rejectedCount = group.items.filter((i) => i.status === 'rejected').length;
  const missingCount = group.items.filter((i) => isReviewFieldMissing(property, i)).length;
  const groupAvg = group.items.length
    ? Math.round((group.items.reduce((sum, i) => sum + getReviewItemRating(property, i), 0) / group.items.length) * 10) / 10
    : 0;

  const subgroups = useMemo(() => {
    if (!['amenity', 'gallery'].includes(group.key) || isPlotAmenityGroup) {
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
  }, [group, isPlotAmenityGroup]);

  return (
    <div className="review-group">
      <button type="button" className="review-group-header" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="review-group-header-left">
          <span className="review-group-icon"><i className={`bi ${GROUP_ICONS[group.key] || 'bi-folder'}`} /></span>
          <div className="review-group-header-text">
            <span className="review-group-title">{groupLabel}</span>
            <span className="review-group-subtitle">
              {group.items.length} fields · avg {groupAvg}/10
              {missingCount > 0 && ` · ${missingCount} missing`}
            </span>
          </div>
          {rejectedCount > 0 && <span className="badge text-bg-danger">{rejectedCount} rejected</span>}
        </div>
        <i className={`bi review-group-chevron ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
      </button>
      {open && (
        <div className="review-group-body">
          {group.key === 'gallery' ? (
            <div className="review-amenities-grid">
              {subgroups.filter((sub) => sub.key !== 'general').map((sub) => (
                <GalleryReviewCard key={sub.key} property={property} entityUuid={sub.key} items={sub.items} disabled={disabled} ratingOnly={ratingOnly} onItemChange={onItemChange} />
              ))}
              {subgroups.filter((sub) => sub.key === 'general').map((sub) => (
                <GalleryEmptyReviewCard key={sub.key} />
              ))}
            </div>
          ) : group.key === 'amenity' ? (
            isPlotAmenityGroup ? (
              <div className="review-field-grid">
                {group.items.map((item) => (
                  <ReviewFieldCard
                    key={item.id}
                    item={item}
                    property={property}
                    disabled={disabled}
                    ratingOnly={ratingOnly}
                    hideContext
                    onChange={(patch) => onItemChange(item, patch)}
                  />
                ))}
              </div>
            ) : (
              <div className="review-amenities-grid">
                {subgroups
                  .filter((sub) => sub.key !== 'general')
                  .sort((a, b) => {
                    const aSel = isPropertyAmenitySelected(property, a.key);
                    const bSel = isPropertyAmenitySelected(property, b.key);
                    if (aSel === bSel) return 0;
                    return aSel ? -1 : 1;
                  })
                  .map((sub) => (
                    <AmenityReviewCard key={sub.key} property={property} entityUuid={sub.key} label={sub.label} items={sub.items} disabled={disabled} ratingOnly={ratingOnly} onItemChange={onItemChange} />
                  ))}
              </div>
            )
          ) : (
            <div className="review-field-grid">
              {group.items.map((item) => (
                <ReviewFieldCard key={item.id} item={item} property={property} disabled={disabled} ratingOnly={ratingOnly} onChange={(patch) => onItemChange(item, patch)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PropertyRejectForm({ reason, onReasonChange, saving, onConfirm, onCancel, confirmLabel = 'Confirm rejection' }) {
  return (
    <div className="review-decision-reject-form">
      <label className="form-label">Rejection reason <span className="text-danger">*</span></label>
      <textarea className="form-control" rows={3} value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Explain why this listing is being rejected" disabled={saving} />
      <div className="review-decision-actions mt-3">
        <button type="button" className="btn btn-danger" disabled={saving} onClick={onConfirm}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Rejecting…</> : <><i className="bi bi-x-circle me-2" />{confirmLabel}</>}
        </button>
        {onCancel && <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

export default function PropertyReviewPanel({ propertyId, property, review, onCompleted, twoStepReview = true }) {
  const toast = useToast();
  const [items, setItems] = useState(() => (review?.items || []).map((item) => normalizeReviewItem(property, item)));
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(twoStepReview ? 'decision' : 'rating');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [propertyRejectionReason, setPropertyRejectionReason] = useState('');
  const footerRef = useRef(null);

  useEffect(() => {
    if (!review?.items) return;
    setItems(review.items.map((item) => normalizeReviewItem(property, item)));
  }, [review, property]);

  const reviewableItems = useMemo(
    () => getReviewableItems(property, items),
    [property, items]
  );

  const grouped = useMemo(() => {
    const groups = {};
    for (const item of reviewableItems) {
      if (!groups[item.sectionKey]) groups[item.sectionKey] = [];
      groups[item.sectionKey].push(item);
    }
    return REVIEW_GROUP_ORDER.filter((key) => groups[key]?.length).map((key) => ({
      key,
      label: REVIEW_GROUP_LABELS[key] || key,
      items: groups[key],
    }));
  }, [reviewableItems]);

  const stats = useMemo(() => ({
    total: reviewableItems.length,
    rejected: reviewableItems.filter((i) => i.status === 'rejected').length,
    approved: reviewableItems.filter((i) => i.status === 'approved').length,
    unfilled: reviewableItems.filter((i) => isReviewFieldUnfilled(property, i)).length,
    avgRating: reviewableItems.length
      ? Math.round((reviewableItems.reduce((s, i) => s + getReviewItemRating(property, i), 0) / reviewableItems.length) * 10) / 10
      : 0,
  }), [reviewableItems, property]);

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      if (isReviewFieldMissing(property, next)) {
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

  const handleAccept = () => {
    setItems((prev) => prev.map((item) => {
      if (isReviewFieldMissing(property, item)) {
        return { ...item, status: 'approved', rating: 0, rejectionReason: '' };
      }
      return { ...item, status: 'approved', rating: item.rating && item.rating > 0 ? item.rating : 8, rejectionReason: '' };
    }));
    setShowRejectForm(false);
    setPropertyRejectionReason('');
    setPhase('rating');
  };

  const submitReject = async () => {
    if (!propertyRejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await propertyService.completeReview(propertyId, {
        propertyDecision: 'rejected',
        rejectionReason: propertyRejectionReason.trim(),
        reviewerNotes,
      });
      onCompleted?.(data.data);
    } catch (err) {
      toast.apiError(err, 'Rejection failed');
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
          rating: item.status === 'rejected'
            ? 0
            : Math.round(Number(getReviewItemRating(property, item)) || 0),
          rejectionReason: item.status === 'rejected' ? item.rejectionReason : undefined,
        })),
      };
      const { data } = await propertyService.completeReview(propertyId, payload);
      onCompleted?.(data.data);
    } catch (err) {
      toast.apiError(err, 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  if (!review || review.status !== 'in_review') {
    return <div className="text-secondary small">No active review session.</div>;
  }

  if (twoStepReview && phase === 'decision') {
    return (
      <div className="review-panel">
        <div className="review-steps" aria-label="Review progress">
          <div className="review-step is-active"><span className="review-step-num">1</span><span className="review-step-label">Accept or reject</span></div>
          <div className="review-step-divider" aria-hidden />
          <div className="review-step"><span className="review-step-num">2</span><span className="review-step-label">Field ratings</span></div>
        </div>
        <div className="review-decision-card">
          <div className="review-decision-card-head">
            <i className="bi bi-clipboard2-check" />
            <div>
              <h2 className="review-decision-title">Listing decision</h2>
              <p className="review-decision-subtitle mb-0">Accept to rate each field (1–10), or reject with a reason.</p>
            </div>
          </div>
          <div className="review-decision-summary">
            <div className="review-decision-summary-row"><span className="review-decision-summary-label">Title</span><span className="review-decision-summary-value">{property.title}</span></div>
            <div className="review-decision-summary-row"><span className="review-decision-summary-label">Lister</span><span className="review-decision-summary-value">{property.listedBy?.name || '—'}</span></div>
            <div className="review-decision-summary-row"><span className="review-decision-summary-label">Fields to rate</span><span className="review-decision-summary-value">{stats.total}</span></div>
          </div>
          {!showRejectForm ? (
            <div className="review-decision-actions">
              <button type="button" className="btn btn-success review-decision-btn" disabled={saving} onClick={handleAccept}>
                <i className="bi bi-check-circle me-2" />Accept listing
              </button>
              <button type="button" className="btn btn-outline-danger review-decision-btn" disabled={saving} onClick={() => setShowRejectForm(true)}>
                <i className="bi bi-x-circle me-2" />Reject listing
              </button>
            </div>
          ) : (
            <PropertyRejectForm reason={propertyRejectionReason} onReasonChange={setPropertyRejectionReason} saving={saving} onConfirm={submitReject} onCancel={() => setShowRejectForm(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="review-panel">
      {twoStepReview && (
        <div className="review-decision-accepted-banner">
          <i className="bi bi-check-circle-fill" />
          <span>Listing accepted. Rate each field below (1–10).</span>
          <button type="button" className="btn btn-link btn-sm" disabled={saving} onClick={() => setPhase('decision')}>Change decision</button>
        </div>
      )}

      <div className="review-stats-grid">
        <div className="review-stat-card"><span className="review-stat-label">Total fields</span><span className="review-stat-value">{stats.total}</span></div>
        <div className="review-stat-card"><span className="review-stat-label">Average rating</span><span className="review-stat-value">{stats.avgRating}<span className="review-stat-suffix">/10</span></span></div>
        <div className="review-stat-card"><span className="review-stat-label">Missing / auto 0</span><span className={`review-stat-value ${stats.unfilled > 0 ? 'is-warning' : ''}`}>{stats.unfilled}</span></div>
        <div className="review-stat-card"><span className="review-stat-label">Rejected</span><span className={`review-stat-value ${stats.rejected > 0 ? 'is-danger' : ''}`}>{stats.rejected}</span></div>
      </div>

      <div className="review-groups">
        {grouped.map((group, index) => (
          <ReviewGroup key={group.key} group={group} property={property} disabled={saving} defaultOpen={index === 0} ratingOnly={twoStepReview} onItemChange={(item, patch) => updateItem(item.id, patch)} />
        ))}
      </div>

      <div className="review-footer review-footer-sticky" ref={footerRef}>
        {twoStepReview && showRejectForm ? (
          <PropertyRejectForm reason={propertyRejectionReason} onReasonChange={setPropertyRejectionReason} saving={saving} onConfirm={submitReject} onCancel={() => setShowRejectForm(false)} confirmLabel="Reject entire listing" />
        ) : (
          <>
            <div className="review-footer-notes">
              <label className="form-label">Reviewer notes <span className="text-secondary fw-normal">(optional)</span></label>
              <textarea className="form-control form-control-sm" rows={2} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} placeholder="Overall comments for the lister" disabled={saving} />
            </div>
            <div className="review-footer-actions">
              {twoStepReview && (
                <button type="button" className="btn btn-outline-danger" disabled={saving} onClick={() => setShowRejectForm(true)}>
                  <i className="bi bi-x-circle me-2" />Reject entire listing
                </button>
              )}
              <button type="button" className="btn btn-primary review-submit-btn" disabled={saving} onClick={submit}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</> : <><i className="bi bi-check2-circle me-2" />Submit ratings & publish</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
