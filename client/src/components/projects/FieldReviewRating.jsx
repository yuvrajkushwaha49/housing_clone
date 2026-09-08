import { getFieldReviewRating } from '../../utils/projectReviewFields';

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

export function FieldReviewRating({ project, review, sectionKey, fieldKey, entityUuid }) {
  if (!review?.items?.length || !project) return null;
  const info = getFieldReviewRating(project, review, sectionKey, fieldKey, entityUuid);
  if (!info) return null;
  return <ReviewRatingBadge {...info} />;
}

export function FormLabelWithRating({
  project,
  review,
  sectionKey,
  fieldKey,
  entityUuid,
  children,
  className = 'form-label-with-rating',
}) {
  const showRating = project && review?.items?.length && sectionKey && fieldKey;

  if (!showRating) {
    return <label className="form-label">{children}</label>;
  }

  return (
    <div className={className}>
      <label className="form-label mb-0">{children}</label>
      <FieldReviewRating
        project={project}
        review={review}
        sectionKey={sectionKey}
        fieldKey={fieldKey}
        entityUuid={entityUuid}
      />
    </div>
  );
}
