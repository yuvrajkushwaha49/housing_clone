import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { profileService } from '../../services';
import { useToast } from '../../hooks/useToast';
import {
  BUILDER_PROFILE_SECTIONS,
  formatProfileValue,
  getBuilderProfileCompleteness,
  getInitials,
} from '../../utils/builderProfileFields';
import {
  isHttpUrl,
  isPhoneLike,
  normalizeWebHref,
  phoneToTelHref,
} from '../../utils/contactLinks';

const VERIFICATION_META = {
  verified: { label: 'Verified', icon: 'bi-patch-check-fill', tone: 'success' },
  pending: { label: 'Under review', icon: 'bi-hourglass-split', tone: 'warning' },
  rejected: { label: 'Verification rejected', icon: 'bi-x-octagon-fill', tone: 'danger' },
  unverified: { label: 'Not verified', icon: 'bi-shield', tone: 'muted' },
};

function getProfilePublishMeta(profile) {
  if (profile?.pendingChange?.status === 'pending') {
    return {
      label: 'Profile update under review',
      icon: 'bi-hourglass-split',
      tone: 'warning',
    };
  }
  return {
    label: 'Profile live',
    icon: 'bi-check-circle-fill',
    tone: 'success',
  };
}

function renderContactValue(value, fieldKey) {
  if (value == null || value === '—') return '—';
  const text = String(value);

  if (fieldKey === 'website') {
    const webHref = normalizeWebHref(text);
    if (webHref) {
      return (
        <a href={webHref} target="_blank" rel="noreferrer">
          {text}
        </a>
      );
    }
    if (isPhoneLike(text)) {
      return <a href={phoneToTelHref(text)}>{text}</a>;
    }
    return text;
  }

  if (isPhoneLike(text)) {
    return <a href={phoneToTelHref(text)}>{text}</a>;
  }

  if (isHttpUrl(text)) {
    return (
      <a href={text} target="_blank" rel="noreferrer">
        {text}
      </a>
    );
  }

  return text;
}

function InfoRow({ label, value, icon, multiline, fieldKey }) {
  return (
    <div className="builder-profile-info-row">
      <div className="builder-profile-info-label">
        {icon && <i className={`bi ${icon}`} aria-hidden />}
        {label}
      </div>
      <div className={`builder-profile-info-value ${multiline ? 'is-multiline' : ''}`}>
        {renderContactValue(value, fieldKey)}
      </div>
    </div>
  );
}

export default function BuilderProfilePage() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const [profile, setProfile] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    const res = await profileService.me();
    setProfile(res.data.data.profile || {});
    const v = await profileService.myVerifications();
    setVerifications(v.data.data);
  };

  useEffect(() => {
    load().catch((err) => {
      toast.apiError(err, 'Failed to load profile');
      setLoadFailed(true);
    }).finally(() => setLoading(false));
  }, [toast]);

  const submitVerification = async (e) => {
    e.preventDefault();
    try {
      await profileService.submitVerification({
        message: verifyMessage,
        documents: [{ label: 'RERA / company docs', note: verifyMessage || 'Submitted via builder profile' }],
      });
      setVerifyMessage('');
      toast.success('Verification request submitted');
      await load();
    } catch (err) {
      toast.apiError(err, 'Verification submit failed');
    }
  };

  if (loading) {
    return (
      <div className="builder-profile-page">
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="builder-profile-page">
        <p className="text-secondary text-center py-5 mb-0">Could not load builder profile.</p>
      </div>
    );
  }

  const verification = VERIFICATION_META[profile.verificationStatus] || VERIFICATION_META.unverified;
  const publishStatus = getProfilePublishMeta(profile);
  const pendingChange = profile.pendingChange;
  const hasPendingReview = pendingChange?.status === 'pending';
  const displayName = profile.companyName || user?.firstName || 'Your company';
  const completeness = getBuilderProfileCompleteness(profile);
  const canSubmitVerification = !['pending', 'verified'].includes(profile.verificationStatus);

  return (
    <div className="builder-profile-page">
      <header className="builder-profile-hero">
        <div className="builder-profile-hero-top">
          <div className="builder-profile-avatar" aria-hidden>{getInitials(displayName)}</div>
          <div className="builder-profile-hero-body">
            <div className="builder-profile-hero-meta">
              <span className={`badge builder-profile-status-badge is-${publishStatus.tone}`}>
                <i className={`bi ${publishStatus.icon} me-1`} aria-hidden />
                {publishStatus.label}
              </span>
              {profile.verificationStatus === 'verified' && (
                <span className={`badge builder-profile-status-badge is-${verification.tone}`}>
                  <i className={`bi ${verification.icon} me-1`} aria-hidden />
                  {verification.label}
                </span>
              )}
              <span className="builder-profile-chip">
                <i className="bi bi-building" aria-hidden />
                Builder account
              </span>
            </div>
            <h1 className="builder-profile-title">{displayName}</h1>
            <p className="builder-profile-subtitle mb-0">
              {user?.email}
              {profile.city?.name ? ` · ${profile.city.name}` : ''}
            </p>
          </div>
          <div className="builder-profile-hero-actions">
            {hasPendingReview ? (
              <button type="button" className="btn btn-outline-secondary" disabled title="Wait for current review">
                <i className="bi bi-pencil me-2" aria-hidden />
                Edit profile
              </button>
            ) : (
              <Link to="/panel/builder/profile/edit" className="btn btn-primary">
                <i className="bi bi-pencil me-2" aria-hidden />
                Edit profile
              </Link>
            )}
          </div>
        </div>

        <div className="builder-profile-progress">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="builder-profile-progress-label">Profile completeness</span>
            <strong className="builder-profile-progress-value">{completeness}%</strong>
          </div>
          <div className="builder-profile-progress-bar" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100}>
            <span className="builder-profile-progress-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </header>

      {hasPendingReview && (
        <div className="builder-profile-pending-banner">
          <i className="bi bi-clock-history" aria-hidden />
          <div>
            <strong>Your updated profile is under review</strong>
            <p className="mb-0">
              Buyers still see your current published details until Super Admin approves the changes.
            </p>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-xl-8">
          <div className="builder-profile-view">
            {BUILDER_PROFILE_SECTIONS.map((section) => (
              <section key={section.id} className="builder-profile-section">
                <div className="builder-profile-section-head">
                  <span className="builder-profile-section-icon" aria-hidden>
                    <i className={`bi ${section.icon}`} />
                  </span>
                  <div>
                    <h2 className="form-section-title mb-0">{section.title}</h2>
                    <p className="form-section-hint mb-0">{section.hint}</p>
                  </div>
                </div>
                <div className="builder-profile-info-grid">
                  {section.fields.map((field) => (
                    <InfoRow
                      key={field.key}
                      label={field.label}
                      icon={field.icon}
                      multiline={field.multiline}
                      fieldKey={field.key}
                      value={formatProfileValue(field.key, profile)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {hasPendingReview && (
              <section className="builder-profile-section is-pending-preview">
                <div className="builder-profile-section-head">
                  <span className="builder-profile-section-icon is-warning" aria-hidden>
                    <i className="bi bi-eye" />
                  </span>
                  <div>
                    <h2 className="form-section-title mb-0">Pending changes (not public yet)</h2>
                    <p className="form-section-hint mb-0">These values will go live after Super Admin approval.</p>
                  </div>
                </div>
                <div className="builder-profile-info-grid">
                  {BUILDER_PROFILE_SECTIONS.flatMap((s) => s.fields).map((field) => {
                    const pending = pendingChange.proposedChanges || {};
                    const nextValue =
                      field.key === 'city'
                        ? pending.cityName || pending.cityId || '—'
                        : pending[field.key] ?? '—';
                    return (
                      <InfoRow
                        key={`pending-${field.key}`}
                        label={field.label}
                        icon={field.icon}
                        multiline={field.multiline}
                        fieldKey={field.key}
                        value={nextValue === '' || nextValue == null ? '—' : String(nextValue)}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="col-xl-4">
          <aside className="builder-profile-sidebar">
            <div className="builder-profile-card">
              <div className="builder-profile-card-icon is-accent" aria-hidden>
                <i className="bi bi-patch-check" />
              </div>
              <h2 className="h6 mb-2">Get verified</h2>
              <p className="small text-secondary mb-2">
                Verified builders appear more trustworthy to buyers.
              </p>
              <div className={`builder-profile-verification-status is-${verification.tone} mb-3`}>
                <i className={`bi ${verification.icon}`} aria-hidden />
                <span>{verification.label}</span>
              </div>
              {profile.verificationStatus === 'verified' ? (
                <div className="builder-profile-verified-banner">
                  <i className="bi bi-patch-check-fill" aria-hidden />
                  <span>Your builder profile is verified.</span>
                </div>
              ) : (
                <form onSubmit={submitVerification}>
                  <label className="form-label small" htmlFor="verifyMessage">Notes for reviewers</label>
                  <textarea
                    id="verifyMessage"
                    className="form-control mb-3"
                    rows={3}
                    placeholder="RERA certificate ref, company registration…"
                    value={verifyMessage}
                    onChange={(e) => setVerifyMessage(e.target.value)}
                    disabled={!canSubmitVerification}
                  />
                  <button className="btn btn-outline-primary w-100" type="submit" disabled={!canSubmitVerification}>
                    {profile.verificationStatus === 'pending'
                      ? 'Review in progress'
                      : profile.verificationStatus === 'rejected'
                        ? 'Submit verification again'
                        : 'Submit for verification'}
                  </button>
                </form>
              )}
            </div>

            <div className="builder-profile-card">
              <h2 className="h6 mb-3">Verification history</h2>
              {verifications.length ? (
                <ul className="builder-profile-timeline mb-0">
                  {verifications.map((item) => (
                    <li key={item.id} className="builder-profile-timeline-item">
                      <span className="builder-profile-timeline-dot" aria-hidden />
                      <div className="builder-profile-timeline-body">
                        <div className="d-flex justify-content-between gap-2">
                          <span className="fw-semibold text-capitalize">{item.profileType}</span>
                          <span className="badge text-bg-light border">{item.status}</span>
                        </div>
                        {item.reviewerNotes && (
                          <p className="small text-secondary mb-0 mt-1">{item.reviewerNotes}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="builder-profile-empty">
                  <i className="bi bi-inbox" aria-hidden />
                  <p className="mb-0">No verification requests yet.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
