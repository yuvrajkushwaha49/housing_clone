import { getFieldReviewRating, getReviewFieldIssues } from '../../utils/propertyReviewFields';

export function ReviewRatingBadge({ rating, status, title }) {
  if (rating == null && status !== 'rejected') return null;

  const value = status === 'rejected' ? 0 : rating;
  let tone = 'is-muted';
  if (status === 'rejected' || value === 0) tone = 'is-danger';
  else if (value >= 8) tone = 'is-success';
  else if (value >= 5) tone = 'is-warning';

  return (
    <span
      className={`field-review-rating ${tone}`}
      title={title ? `${title}: ${value}/10` : `Rating: ${value}/10`}
    >
      <i className="bi bi-star-fill" aria-hidden />
      <span>{value}/10</span>
    </span>
  );
}

export function FieldReviewRating({ property, review, sectionKey, fieldKey, entityUuid }) {
  if (!review?.items?.length || !property) return null;
  const info = getFieldReviewRating(property, review, sectionKey, fieldKey, entityUuid);
  if (!info) return null;
  return <ReviewRatingBadge {...info} />;
}

export function FormLabelWithRating({
  property,
  review,
  sectionKey,
  fieldKey,
  entityUuid,
  children,
  className = 'form-label-with-rating',
}) {
  const showRating = property && review?.items?.length && sectionKey && fieldKey;

  if (!showRating) {
    return <label className="form-label">{children}</label>;
  }

  return (
    <div className={className}>
      <label className="form-label mb-0">{children}</label>
      <FieldReviewRating
        property={property}
        review={review}
        sectionKey={sectionKey}
        fieldKey={fieldKey}
        entityUuid={entityUuid}
      />
    </div>
  );
}

export function PropertyReviewSummary({ property, review }) {
  const { rejected, lowRated, all } = getReviewFieldIssues(property, review);
  if (!all.length) return null;

  return (
    <div className="builder-profile-card property-review-summary">
      <div className="property-review-summary-head">
        <i className="bi bi-ui-checks" aria-hidden />
        <h3 className="h6 mb-0">Review feedback</h3>
      </div>
      <p className="small text-secondary mb-2">
        Fix fields marked rejected or rated below 6/10 before resubmitting.
      </p>
      <ul className="property-review-summary-list">
        {all.map((item) => (
          <li
            key={item.id}
            className={`property-review-summary-item ${item.status === 'rejected' ? 'is-rejected' : 'is-low'}`}
          >
            <span className="property-review-summary-title">{item.title}</span>
            <ReviewRatingBadge
              rating={item.rating}
              status={item.status}
              title={item.title}
            />
            {item.rejectionReason && (
              <span className="property-review-summary-reason">{item.rejectionReason}</span>
            )}
          </li>
        ))}
      </ul>
      {(rejected.length > 0 || lowRated.length > 0) && (
        <div className="property-review-summary-stats small text-secondary">
          {rejected.length > 0 && <span>{rejected.length} rejected</span>}
          {rejected.length > 0 && lowRated.length > 0 && <span> · </span>}
          {lowRated.length > 0 && <span>{lowRated.length} low rated</span>}
        </div>
      )}
    </div>
  );
}
