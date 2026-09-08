import { formatReviewAverageRating, reviewRatingTone } from './propertyUtils';

export default function PropertyQualityBadge({ rating, className = '' }) {
  if (rating == null) return null;
  const value = formatReviewAverageRating(rating);
  const tone = reviewRatingTone(rating);

  return (
    <span
      className={`property-quality-badge ${tone} ${className}`.trim()}
      title={`Admin quality score: ${value}/10`}
    >
      <i className="bi bi-star-fill" aria-hidden />
      <span>{value}/10</span>
    </span>
  );
}
