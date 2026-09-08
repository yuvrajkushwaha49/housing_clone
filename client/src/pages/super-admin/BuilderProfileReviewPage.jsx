import { useEffect, useMemo, useState } from 'react';
import { builderService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { BUILDER_PROFILE_SECTIONS, getInitials } from '../../utils/builderProfileFields';

const FIELD_META = Object.fromEntries(
  BUILDER_PROFILE_SECTIONS.flatMap((section) =>
    section.fields.map((field) => [
      field.key,
      { label: field.label, icon: field.icon, section: section.title },
    ])
  )
);

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pending', icon: 'bi-hourglass-split' },
  { value: 'approved', label: 'Approved', icon: 'bi-check-circle' },
  { value: 'rejected', label: 'Rejected', icon: 'bi-x-circle' },
  { value: '', label: 'All', icon: 'bi-collection' },
];

const STATUS_META = {
  pending: { label: 'Pending review', tone: 'warning', icon: 'bi-hourglass-split' },
  approved: { label: 'Approved', tone: 'success', icon: 'bi-check-circle-fill' },
  rejected: { label: 'Rejected', tone: 'danger', icon: 'bi-x-circle-fill' },
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFieldValue(key, data = {}) {
  if (key === 'city') {
    const city = data.cityName || data.city?.name;
    return city != null && String(city).trim() !== '' ? String(city) : '—';
  }
  const value = data[key];
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}

function getChangedFields(before = {}, after = {}) {
  return BUILDER_PROFILE_SECTIONS.flatMap((section) => section.fields.map((field) => field.key)).filter(
    (key) => formatFieldValue(key, before) !== formatFieldValue(key, after)
  );
}

function ChangeDiff({ fieldKey, before = {}, after = {} }) {
  const meta = FIELD_META[fieldKey] || { label: fieldKey, icon: 'bi-dot' };
  const oldVal = formatFieldValue(fieldKey, before);
  const newVal = formatFieldValue(fieldKey, after);

  return (
    <div className="bpr-diff-item">
      <div className="bpr-diff-item-head">
        <span className="bpr-diff-item-icon" aria-hidden>
          <i className={`bi ${meta.icon}`} />
        </span>
        <div>
          <span className="bpr-diff-item-label">{meta.label}</span>
          <span className="bpr-diff-item-section">{meta.section}</span>
        </div>
      </div>
      <div className="bpr-diff-values">
        <div className="bpr-diff-value is-old">
          <span className="bpr-diff-value-tag">Live</span>
          <span className="bpr-diff-value-text">{oldVal}</span>
        </div>
        <span className="bpr-diff-arrow" aria-hidden>
          <i className="bi bi-arrow-right" />
        </span>
        <div className="bpr-diff-value is-new">
          <span className="bpr-diff-value-tag">Proposed</span>
          <span className="bpr-diff-value-text">{newVal}</span>
        </div>
      </div>
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <article className="bpr-card bpr-card--skeleton">
      <div className="bpr-card-head">
        <div className="skeleton-block bpr-skeleton-avatar" />
        <div className="flex-grow-1">
          <div className="skeleton-line skeleton-line--title mb-2" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      </div>
      <div className="bpr-diff-grid">
        {[1, 2].map((i) => (
          <div key={i} className="bpr-diff-item bpr-diff-item--skeleton">
            <div className="skeleton-line mb-2" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
        ))}
      </div>
    </article>
  );
}

function ReviewCard({ item, notes, onNotesChange, onReview, reviewing }) {
  const status = STATUS_META[item.status] || STATUS_META.pending;
  const company = item.builder?.companyName || item.snapshotBefore?.companyName || 'Builder company';
  const builderName = item.user?.name || 'Builder';
  const changedFields = getChangedFields(item.snapshotBefore, item.proposedChanges);
  const isPending = item.status === 'pending';

  return (
    <article className={`bpr-card is-${item.status}`}>
      <div className="bpr-card-head">
        <div className="bpr-card-identity">
          <div className="bpr-card-avatar" aria-hidden>
            {getInitials(company)}
          </div>
          <div>
            <h2 className="bpr-card-company">{company}</h2>
            <p className="bpr-card-builder">
              <i className="bi bi-person" aria-hidden />
              {builderName}
              <span className="bpr-card-dot">·</span>
              {item.user?.email}
            </p>
          </div>
        </div>
        <div className="bpr-card-meta">
          <span className={`bpr-status-badge is-${status.tone}`}>
            <i className={`bi ${status.icon}`} aria-hidden />
            {status.label}
          </span>
          <time className="bpr-card-date" dateTime={item.createdAt}>
            <i className="bi bi-clock" aria-hidden />
            {formatDate(item.createdAt)}
          </time>
        </div>
      </div>

      <div className="bpr-card-summary">
        <span className="bpr-change-chip">
          <i className="bi bi-pencil-square" aria-hidden />
          {changedFields.length} field{changedFields.length === 1 ? '' : 's'} changed
        </span>
        {item.reviewedAt && (
          <span className="bpr-reviewed-at">
            Reviewed {formatDate(item.reviewedAt)}
          </span>
        )}
      </div>

      {changedFields.length > 0 ? (
        <div className="bpr-diff-grid">
          {changedFields.map((fieldKey) => (
            <ChangeDiff
              key={fieldKey}
              fieldKey={fieldKey}
              before={item.snapshotBefore}
              after={item.proposedChanges}
            />
          ))}
        </div>
      ) : (
        <div className="bpr-no-changes">No field-level differences detected.</div>
      )}

      {isPending ? (
        <div className="bpr-review-panel">
          <label className="bpr-review-label" htmlFor={`notes-${item.id}`}>
            <i className="bi bi-chat-left-text" aria-hidden />
            Notes for builder
          </label>
          <textarea
            id={`notes-${item.id}`}
            className="form-control bpr-review-notes"
            rows={2}
            value={notes[item.id] || ''}
            onChange={(e) => onNotesChange(item.id, e.target.value)}
            placeholder="Optional feedback — shared if you reject the update"
          />
          <div className="bpr-review-actions">
            <button
              type="button"
              className="btn bpr-btn-approve"
              disabled={reviewing === item.id}
              onClick={() => onReview(item.id, 'approved')}
            >
              {reviewing === item.id ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden />
              ) : (
                <i className="bi bi-check-lg" aria-hidden />
              )}
              Approve & publish
            </button>
            <button
              type="button"
              className="btn bpr-btn-reject"
              disabled={reviewing === item.id}
              onClick={() => onReview(item.id, 'rejected')}
            >
              <i className="bi bi-x-lg" aria-hidden />
              Reject
            </button>
          </div>
        </div>
      ) : item.reviewerNotes ? (
        <div className="bpr-reviewed-note">
          <i className="bi bi-chat-quote" aria-hidden />
          <div>
            <strong>Reviewer note</strong>
            <p>{item.reviewerNotes}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function BuilderProfileReviewPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await builderService.listProfileChanges({ limit: 100 });
      setItems(res.data.data || []);
    } catch (err) {
      toast.apiError(err, 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(
    () => ({
      pending: items.filter((item) => item.status === 'pending').length,
      approved: items.filter((item) => item.status === 'approved').length,
      rejected: items.filter((item) => item.status === 'rejected').length,
      total: items.length,
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!status) return items;
    return items.filter((item) => item.status === status);
  }, [items, status]);

  const review = async (id, next) => {
    setReviewing(id);
    try {
      await builderService.reviewProfileChange(id, {
        status: next,
        reviewerNotes: notes[id] || (next === 'rejected' ? 'Changes need correction' : 'Approved'),
      });
      toast.success(next === 'approved' ? 'Profile changes approved' : 'Profile changes rejected');
      await load();
    } catch (err) {
      toast.apiError(err, 'Review failed');
    } finally {
      setReviewing(null);
    }
  };

  const handleNotesChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="builder-profile-review-page">
      <header className="bpr-hero">
        <div className="bpr-hero-content">
          <div className="bpr-hero-text">
            <span className="bpr-hero-eyebrow">
              <i className="bi bi-building-check" aria-hidden />
              Builder profiles
            </span>
            <h1 className="bpr-hero-title">Profile update reviews</h1>
            <p className="bpr-hero-subtitle">
              Review builder edits before they go live. The published profile stays unchanged until you approve.
            </p>
          </div>
          <div className="bpr-stats">
            <div className="bpr-stat is-pending">
              <span className="bpr-stat-value">{stats.pending}</span>
              <span className="bpr-stat-label">Pending</span>
            </div>
            <div className="bpr-stat is-approved">
              <span className="bpr-stat-value">{stats.approved}</span>
              <span className="bpr-stat-label">Approved</span>
            </div>
            <div className="bpr-stat is-rejected">
              <span className="bpr-stat-value">{stats.rejected}</span>
              <span className="bpr-stat-label">Rejected</span>
            </div>
            <div className="bpr-stat is-total">
              <span className="bpr-stat-value">{stats.total}</span>
              <span className="bpr-stat-label">Total</span>
            </div>
          </div>
        </div>
      </header>

      <div className="bpr-toolbar">
        <div className="bpr-filters" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.value === ''
                ? stats.total
                : stats[filter.value] ?? 0;
            return (
              <button
                key={filter.value || 'all'}
                type="button"
                role="tab"
                aria-selected={status === filter.value}
                className={`bpr-filter-tab${status === filter.value ? ' is-active' : ''}`}
                onClick={() => setStatus(filter.value)}
              >
                <i className={`bi ${filter.icon}`} aria-hidden />
                {filter.label}
                <span className="bpr-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary bpr-refresh" onClick={load} disabled={loading}>
          <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bpr-list">
          {[1, 2, 3].map((i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="bpr-list">
          {filteredItems.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              notes={notes}
              onNotesChange={handleNotesChange}
              onReview={review}
              reviewing={reviewing}
            />
          ))}
        </div>
      ) : (
        <div className="bpr-empty">
          <div className="bpr-empty-icon" aria-hidden>
            <i className="bi bi-inbox" />
          </div>
          <h2>No {status ? `${status} ` : ''}updates</h2>
          <p>
            {status === 'pending'
              ? 'All caught up — no builder profile edits waiting for review.'
              : 'Nothing to show for this filter right now.'}
          </p>
        </div>
      )}
    </div>
  );
}
