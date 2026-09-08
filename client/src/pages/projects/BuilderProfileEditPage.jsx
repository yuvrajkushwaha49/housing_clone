import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { profileService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { profileToForm } from '../../utils/builderProfileFields';
import { normalizeWebsiteInput } from '../../utils/contactLinks';

function ProfileField({ id, label, hint, icon, children }) {
  return (
    <div className="builder-profile-field">
      <label className="form-label builder-profile-label" htmlFor={id}>
        {icon && <i className={`bi ${icon}`} aria-hidden />}
        {label}
      </label>
      {children}
      {hint && <p className="builder-profile-field-hint mb-0">{hint}</p>}
    </div>
  );
}

export default function BuilderProfileEditPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    legalName: '',
    reraNumber: '',
    gstin: '',
    website: '',
    about: '',
    address: '',
    yearEstablished: '',
    cityId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    profileService
      .me()
      .then((res) => {
        const profile = res.data.data.profile || {};
        if (profile.pendingChange?.status === 'pending') {
          setHasPending(true);
          return;
        }
        setForm(profileToForm(profile));
      })
      .catch((err) => toast.apiError(err, 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [toast]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileService.updateMe({
        ...form,
        website: normalizeWebsiteInput(form.website),
        yearEstablished:
          form.yearEstablished !== '' && form.yearEstablished != null
            ? Number(form.yearEstablished)
            : null,
      });
      toast.success('Profile update submitted for review');
      navigate('/panel/builder/profile');
    } catch (err) {
      toast.apiError(err, 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="builder-profile-page">
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      </div>
    );
  }

  if (hasPending) {
    return (
      <div className="builder-profile-page">
        <div className="builder-profile-pending-banner mb-3">
          <i className="bi bi-hourglass-split" aria-hidden />
          <div>
            <strong>Profile update already under review</strong>
            <p className="mb-0">Wait for Super Admin approval before submitting new changes.</p>
          </div>
        </div>
        <Link to="/panel/builder/profile" className="btn btn-outline-secondary">Back to profile</Link>
      </div>
    );
  }

  return (
    <div className="builder-profile-page">
      <header className="builder-profile-hero is-edit">
        <div className="builder-profile-hero-top">
          <div className="builder-profile-hero-icon" aria-hidden>
            <i className="bi bi-pencil-square" />
          </div>
          <div className="builder-profile-hero-body">
            <h1 className="builder-profile-title">Edit builder profile</h1>
            <p className="builder-profile-subtitle mb-0">
              Changes are sent to Super Admin for review. Buyers will keep seeing your current details until approved.
            </p>
          </div>
        </div>
        <ol className="builder-profile-steps">
          <li className="builder-profile-step is-active"><span>1</span> Edit details</li>
          <li className="builder-profile-step"><span>2</span> Under review</li>
          <li className="builder-profile-step"><span>3</span> Live for buyers</li>
        </ol>
      </header>

      <form onSubmit={submit} className="builder-profile-form">
        <section className="builder-profile-section">
          <div className="builder-profile-section-head">
            <span className="builder-profile-section-icon" aria-hidden><i className="bi bi-building-gear" /></span>
            <div>
              <h2 className="form-section-title mb-0">Company identity</h2>
              <p className="form-section-hint mb-0">How buyers will recognize your brand.</p>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <ProfileField id="companyName" label="Company name" icon="bi-building">
                <input id="companyName" className="form-control" required value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)} placeholder="e.g. Skyline Developers" />
              </ProfileField>
            </div>
            <div className="col-md-6">
              <ProfileField id="legalName" label="Legal name" icon="bi-file-earmark-text">
                <input id="legalName" className="form-control" value={form.legalName}
                  onChange={(e) => updateField('legalName', e.target.value)} placeholder="Registered entity name" />
              </ProfileField>
            </div>
            <div className="col-md-4">
              <ProfileField id="yearEstablished" label="Year established" icon="bi-calendar3">
                <input id="yearEstablished" type="number" className="form-control" min="1900" max={new Date().getFullYear()}
                  value={form.yearEstablished} onChange={(e) => updateField('yearEstablished', e.target.value)} placeholder="2010" />
              </ProfileField>
            </div>
          </div>
        </section>

        <section className="builder-profile-section">
          <div className="builder-profile-section-head">
            <span className="builder-profile-section-icon" aria-hidden><i className="bi bi-shield-check" /></span>
            <div>
              <h2 className="form-section-title mb-0">Compliance & registration</h2>
              <p className="form-section-hint mb-0">Required for project approvals and buyer confidence.</p>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <ProfileField id="reraNumber" label="RERA number" icon="bi-award">
                <input id="reraNumber" className="form-control" value={form.reraNumber}
                  onChange={(e) => updateField('reraNumber', e.target.value)} placeholder="State RERA registration" />
              </ProfileField>
            </div>
            <div className="col-md-6">
              <ProfileField id="gstin" label="GSTIN" icon="bi-receipt">
                <input id="gstin" className="form-control" value={form.gstin}
                  onChange={(e) => updateField('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </ProfileField>
            </div>
          </div>
        </section>

        <section className="builder-profile-section">
          <div className="builder-profile-section-head">
            <span className="builder-profile-section-icon" aria-hidden><i className="bi bi-geo-alt" /></span>
            <div>
              <h2 className="form-section-title mb-0">Contact & presence</h2>
              <p className="form-section-hint mb-0">Help buyers and reviewers reach you.</p>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <ProfileField id="website" label="Website" icon="bi-globe2" hint="example.com or https://yourcompany.com">
                <input
                  id="website"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  className="form-control"
                  value={form.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="example.com"
                />
              </ProfileField>
            </div>
            <div className="col-12">
              <ProfileField id="address" label="Office address" icon="bi-pin-map">
                <input id="address" className="form-control" value={form.address}
                  onChange={(e) => updateField('address', e.target.value)} placeholder="Street, city, state, pincode" />
              </ProfileField>
            </div>
          </div>
        </section>

        <section className="builder-profile-section">
          <div className="builder-profile-section-head">
            <span className="builder-profile-section-icon" aria-hidden><i className="bi bi-card-text" /></span>
            <div>
              <h2 className="form-section-title mb-0">About your company</h2>
              <p className="form-section-hint mb-0">Brief overview of your portfolio and expertise.</p>
            </div>
          </div>
          <ProfileField id="about" label="Company description" icon="bi-pencil-square">
            <textarea id="about" className="form-control" rows={5} value={form.about}
              onChange={(e) => updateField('about', e.target.value)}
              placeholder="Tell buyers about your track record and flagship projects…" />
          </ProfileField>
        </section>

        <div className="builder-profile-actions">
          <Link to="/panel/builder/profile" className="btn btn-outline-secondary">Cancel</Link>
          <button className="btn btn-primary px-4" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden />
                Submitting…
              </>
            ) : (
              <>
                <i className="bi bi-send me-2" aria-hidden />
                Submit for review
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
