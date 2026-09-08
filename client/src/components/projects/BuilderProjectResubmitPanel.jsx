import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectReviewResults from './ProjectReviewResults';
import { PROJECT_STATUS_BADGE } from './projectUtils';

function ResubmitSteps({ activeStep = 2 }) {
  const steps = [
    { num: 1, label: 'Review feedback' },
    { num: 2, label: 'Edit project' },
    { num: 3, label: 'Request review' },
  ];

  return (
    <ol className="resubmit-steps">
      {steps.map((step) => (
        <li
          key={step.num}
          className={`resubmit-step ${step.num === activeStep ? 'is-active' : ''} ${step.num < activeStep ? 'is-done' : ''}`}
        >
          <span className="resubmit-step-num">{step.num}</span>
          <span className="resubmit-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function BuilderResubmitHeader({ project, variant = 'rejected' }) {
  const isPublished = variant === 'published';
  const review = project.review;
  const lowRatedFields = (review?.items || []).filter(
    (item) => item.status === 'approved' && item.rating != null && item.rating < 8
  );
  const rejectedFields = (review?.items || []).filter((item) => item.status === 'rejected');
  const [reviewOpen, setReviewOpen] = useState(true);

  return (
    <header className={`resubmit-hero ${isPublished ? 'is-published' : 'is-rejected'}`}>
      <div className="resubmit-hero-top">
        <div className="resubmit-hero-icon" aria-hidden>
          <i className={`bi ${isPublished ? 'bi-graph-up-arrow' : 'bi-arrow-repeat'}`} />
        </div>
        <div className="resubmit-hero-body">
          <div className="resubmit-hero-meta">
            <span className={`badge ${PROJECT_STATUS_BADGE[project.status] || 'text-bg-light border'}`}>
              {project.status}
            </span>
            {review?.averageRating != null && (
              <span className="resubmit-hero-chip">
                <i className="bi bi-star-fill" />
                Avg {review.averageRating}/10
              </span>
            )}
            {review?.submissionNumber != null && (
              <span className="resubmit-hero-chip muted">
                Submission #{review.submissionNumber}
              </span>
            )}
          </div>
          <h1 className="resubmit-hero-title">
            {isPublished ? 'Improve project rating' : 'Edit & resubmit for review'}
          </h1>
          <p className="resubmit-hero-subtitle mb-0">
            <strong>{project.name}</strong>
            {isPublished
              ? ' — update low-rated fields below, then request a new review.'
              : ' — fix the issues below and send back for approval.'}
          </p>
        </div>
      </div>

      <ResubmitSteps activeStep={2} />

      {!isPublished && project.rejectionReason && (
        <div className="resubmit-alert is-danger">
          <i className="bi bi-exclamation-octagon-fill" />
          <div>
            <strong>Rejection reason</strong>
            <p className="mb-0">{project.rejectionReason}</p>
          </div>
        </div>
      )}

      {isPublished && (
        <div className="resubmit-alert is-info">
          <i className="bi bi-info-circle-fill" />
          <div>
            <strong>Buyers can still view your listing</strong>
            <p className="mb-0">
              Your project stays visible to buyers while admin reviews your updates.
            </p>
          </div>
        </div>
      )}

      {(lowRatedFields.length > 0 || rejectedFields.length > 0) && (
        <div className="resubmit-focus-chips">
          {rejectedFields.length > 0 && (
            <span className="resubmit-focus-chip is-danger">
              <i className="bi bi-x-circle" />
              {rejectedFields.length} rejected field{rejectedFields.length !== 1 ? 's' : ''}
            </span>
          )}
          {lowRatedFields.length > 0 && (
            <span className="resubmit-focus-chip is-warning">
              <i className="bi bi-arrow-down-circle" />
              {lowRatedFields.length} below 8/10
            </span>
          )}
        </div>
      )}

      {review?.status === 'completed' && (
        <div className="resubmit-review-block">
          <button
            type="button"
            className="resubmit-review-toggle"
            onClick={() => setReviewOpen((open) => !open)}
            aria-expanded={reviewOpen}
          >
            <span>
              <i className="bi bi-clipboard-check" />
              Previous review results
            </span>
            <i className={`bi bi-chevron-${reviewOpen ? 'up' : 'down'}`} />
          </button>
          {reviewOpen && (
            <div className="resubmit-review-body">
              <ProjectReviewResults review={review} embedded highlightLowRatings={isPublished} />
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function BuilderResubmitFooter({
  variant = 'rejected',
  resubmitNote,
  onResubmitNoteChange,
  onSubmit,
  submitting,
  cancelTo = '..',
}) {
  const isPublished = variant === 'published';

  return (
    <div id="resubmit-panel" className="resubmit-footer">
      <div className="resubmit-footer-inner panel-card">
        <div className="resubmit-footer-head">
          <span className="resubmit-step-num">3</span>
          <div>
            <h2 className="resubmit-footer-title mb-1">Ready to send for review?</h2>
            <p className="resubmit-footer-hint mb-0">
              Describe what you changed. Your updates will be saved and sent for admin review.
            </p>
          </div>
        </div>
        <label className="form-label" htmlFor="resubmit-note">
          {isPublished ? 'What did you improve?' : 'Reply for approval'}{' '}
          <span className="text-danger">*</span>
        </label>
        <textarea
          id="resubmit-note"
          className="form-control resubmit-note-input"
          rows={3}
          placeholder={
            isPublished
              ? 'Describe the updates you made to improve your project rating...'
              : 'Explain what you changed or fixed since the last review...'
          }
          value={resubmitNote}
          onChange={(e) => onResubmitNoteChange(e.target.value)}
        />
        <div className="resubmit-footer-actions">
          <Link to={cancelTo} className="btn btn-outline-secondary">Cancel</Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                <i className={`bi ${isPublished ? 'bi-send' : 'bi-arrow-repeat'} me-2`} />
                {isPublished ? 'Request review again' : 'Send for review again'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BuilderProjectResubmitPanel(props) {
  return (
    <>
      <BuilderResubmitHeader project={props.project} variant={props.variant} />
      <BuilderResubmitFooter {...props} />
    </>
  );
}
