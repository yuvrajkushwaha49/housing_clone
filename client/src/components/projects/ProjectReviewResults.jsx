import { useState } from 'react';
import { REVIEW_GROUP_LABELS, REVIEW_GROUP_ORDER } from '../../utils/projectReviewFields';

function ratingBadge(rating, status) {
  if (status === 'rejected' || rating === 0) {
    return <span className="badge text-bg-danger">0 / 10</span>;
  }
  if (rating >= 8) return <span className="badge text-bg-success">{rating} / 10</span>;
  if (rating >= 5) return <span className="badge text-bg-warning">{rating} / 10</span>;
  return <span className="badge text-bg-secondary">{rating} / 10</span>;
}

export default function ProjectReviewResults({
  review,
  embedded = false,
  highlightLowRatings = false,
}) {
  const [approvedOpen, setApprovedOpen] = useState(!highlightLowRatings);

  if (!review?.items?.length) return null;

  const rejected = review.items.filter((item) => item.status === 'rejected');
  const approved = review.items.filter((item) => item.status === 'approved');
  const lowRated = approved.filter((item) => item.rating != null && item.rating < 8);
  const highRated = approved.filter((item) => item.rating == null || item.rating >= 8);

  const groupItems = (list) => {
    const groups = {};
    for (const item of list) {
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
  };

  const wrapperClass = embedded ? 'review-results-embedded' : 'panel-card mb-3';

  const renderFieldList = (items, { danger = false } = {}) => (
    groupItems(items).map((group) => (
      <div key={group.key} className="review-results-group">
        <div className="review-results-group-label">{group.label}</div>
        <ul className="review-results-list">
          {group.items.map((item) => (
            <li
              key={item.id}
              className={`review-results-item ${danger ? 'is-danger' : ''} ${highlightLowRatings && item.rating != null && item.rating < 8 ? 'is-low' : ''}`}
            >
              <div className="review-results-item-main">
                <strong>{item.title}</strong>
                {ratingBadge(item.rating, item.status)}
              </div>
              {item.rejectionReason && (
                <div className="review-results-item-note">{item.rejectionReason}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    ))
  );

  return (
    <div className={wrapperClass}>
      {!embedded && (
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h2 className="h6 mb-1">Review results</h2>
            <div className="small text-secondary">
              Submission #{review.submissionNumber}
              {review.averageRating != null ? ` · Average rating ${review.averageRating}/10` : ''}
              {' · '}{review.items.length} fields reviewed
            </div>
          </div>
          <span className={`badge ${review.decision === 'published' ? 'text-bg-success' : 'text-bg-danger'}`}>
            {review.decision === 'published' ? 'Approved' : 'Rejected'}
          </span>
        </div>
      )}

      {embedded && (
        <div className="review-results-embedded-summary">
          <span className={`badge ${review.decision === 'published' ? 'text-bg-success' : 'text-bg-danger'}`}>
            {review.decision === 'published' ? 'Approved' : 'Rejected'}
          </span>
          {review.averageRating != null && (
            <span className="small text-secondary">Average {review.averageRating}/10</span>
          )}
        </div>
      )}

      {review.reviewerNotes && (
        <div className="resubmit-reviewer-notes">{review.reviewerNotes}</div>
      )}

      {rejected.length > 0 && (
        <div className="review-results-section">
          <h3 className="review-results-section-title is-danger">
            Rejected fields ({rejected.length})
          </h3>
          {renderFieldList(rejected, { danger: true })}
        </div>
      )}

      {highlightLowRatings && lowRated.length > 0 && (
        <div className="review-results-section">
          <h3 className="review-results-section-title is-warning">
            Improve these ({lowRated.length})
          </h3>
          {renderFieldList(lowRated)}
        </div>
      )}

      {approved.length > 0 && (
        <div className="review-results-section">
          {highlightLowRatings ? (
            <>
              <button
                type="button"
                className="review-results-collapse-toggle"
                onClick={() => setApprovedOpen((open) => !open)}
                aria-expanded={approvedOpen}
              >
                <span>Other approved fields ({highRated.length})</span>
                <i className={`bi bi-chevron-${approvedOpen ? 'up' : 'down'}`} />
              </button>
              {approvedOpen && highRated.length > 0 && renderFieldList(highRated)}
            </>
          ) : (
            <>
              <h3 className="review-results-section-title">
                Approved fields ({approved.length})
              </h3>
              {groupItems(approved).map((group) => (
                <div key={group.key} className="review-results-group">
                  <div className="review-results-group-label">{group.label}</div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.id}>
                            <td className="small">{item.title}</td>
                            <td>{ratingBadge(item.rating, item.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
