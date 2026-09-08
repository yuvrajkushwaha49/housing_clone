import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { authService, mastersService, profileService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { getInitials } from '../../utils/builderProfileFields';

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

function formatBudget(amount) {
  if (amount == null || amount === '') return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function fullName(user) {
  if (!user) return 'Buyer';
  return `${user.firstName || ''}${user.lastName ? ` ${user.lastName}` : ''}`.trim() || 'Buyer';
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="builder-profile-info-row">
      <div className="builder-profile-info-label">
        {icon && <i className={`bi ${icon}`} aria-hidden />}
        {label}
      </div>
      <div className="builder-profile-info-value">{value ?? '—'}</div>
    </div>
  );
}

function YesNoBadge({ value }) {
  return (
    <span className={`badge ${value ? 'text-bg-success' : 'text-bg-light border'}`}>
      {value ? 'Yes' : 'No'}
    </span>
  );
}

async function fetchAllCities() {
  const countriesRes = await mastersService.listCountries({ activeOnly: true });
  const countries = countriesRes.data.data || [];
  const india = countries.find((c) => c.iso2 === 'IN') || countries[0];
  if (!india) return [];

  const statesRes = await mastersService.listStates(india.id, { activeOnly: true });
  const states = statesRes.data.data || [];
  if (!states.length) return [];

  const cityLists = await Promise.all(
    states.map((s) => mastersService.listCities(s.id, { activeOnly: true }))
  );
  return cityLists.flatMap((r) => r.data.data || []);
}

function resolveLabels(ids = [], options = []) {
  if (!ids.length) return '—';
  return ids
    .map((id) => options.find((option) => String(option.id) === String(id))?.name || id)
    .join(', ');
}

function getBuyerCompleteness(account, profile) {
  const checks = [
    Boolean(account?.firstName),
    Boolean(account?.email),
    Boolean(account?.phone),
    profile?.budgetMin != null || profile?.budgetMax != null,
    (profile?.preferredCities || []).length > 0,
    (profile?.preferredTypes || []).length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export default function BuyerProfilePage() {
  const toast = useToast();
  const { user: authUser } = useSelector((s) => s.auth);
  const [account, setAccount] = useState(authUser);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    budgetMin: '',
    budgetMax: '',
    preferredCities: [],
    preferredTypes: [],
  });
  const [cities, setCities] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    const [accountRes, profileRes, citiesList, typesRes] = await Promise.all([
      authService.me(),
      profileService.me(),
      fetchAllCities(),
      mastersService.listTypes({ activeOnly: true }),
    ]);

    const accountData = accountRes.data.data;
    const profileData = profileRes.data.data.profile || {};
    setAccount(accountData);
    setProfile(profileData);
    setCities(citiesList);
    setPropertyTypes(typesRes.data.data || []);
    setForm({
      budgetMin: profileData.budgetMin ?? '',
      budgetMax: profileData.budgetMax ?? '',
      preferredCities: profileData.preferredCities || [],
      preferredTypes: profileData.preferredTypes || [],
    });
  };

  useEffect(() => {
    load()
      .catch((err) => {
        toast.apiError(err, 'Failed to load profile');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const displayName = fullName(account);
  const completeness = useMemo(
    () => getBuyerCompleteness(account, profile),
    [account, profile]
  );

  const toggleSelection = (key, id) => {
    setForm((prev) => {
      const current = prev[key] || [];
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      return { ...prev, [key]: next };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        budgetMin: form.budgetMin !== '' && form.budgetMin != null ? Number(form.budgetMin) : null,
        budgetMax: form.budgetMax !== '' && form.budgetMax != null ? Number(form.budgetMax) : null,
        preferredCities: form.preferredCities,
        preferredTypes: form.preferredTypes,
      };
      const res = await profileService.updateMe(payload);
      const updated = res.data.data.profile;
      setProfile(updated);
      setForm({
        budgetMin: updated.budgetMin ?? '',
        budgetMax: updated.budgetMax ?? '',
        preferredCities: updated.preferredCities || [],
        preferredTypes: updated.preferredTypes || [],
      });
      toast.success('Profile saved');
    } catch (err) {
      toast.apiError(err, 'Save failed');
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

  if (loadFailed) {
    return (
      <div className="builder-profile-page">
        <p className="text-secondary text-center py-5 mb-0">Could not load buyer profile.</p>
      </div>
    );
  }

  return (
    <div className="builder-profile-page">
      <header className="builder-profile-hero">
        <div className="builder-profile-hero-top">
          <div className="builder-profile-avatar" aria-hidden>{getInitials(displayName)}</div>
          <div className="builder-profile-hero-body">
            <div className="builder-profile-hero-meta">
              <span className="builder-profile-chip">
                <i className="bi bi-person-badge" aria-hidden />
                Buyer account
              </span>
              <span className={`badge builder-profile-status-badge ${account?.status === 'active' ? 'is-success' : 'is-muted'}`}>
                <i className="bi bi-circle-fill me-1" aria-hidden />
                {account?.status || 'active'}
              </span>
            </div>
            <h1 className="builder-profile-title">{displayName}</h1>
            <p className="builder-profile-subtitle mb-0">
              {account?.email}
              {account?.phone ? ` · ${account.phone}` : ''}
            </p>
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

      <div className="row g-3">
        <div className="col-lg-5">
          <section className="builder-profile-section panel-card h-100">
            <div className="builder-profile-section-head">
              <span className="builder-profile-section-icon" aria-hidden>
                <i className="bi bi-person-vcard" />
              </span>
              <div>
                <h2 className="h6 mb-0">Account details</h2>
                <p className="form-section-hint mb-0 mt-1">Your sign-in and contact information.</p>
              </div>
            </div>
            <InfoRow label="Full name" value={displayName} icon="bi-person" />
            <InfoRow label="Email" value={account?.email} icon="bi-envelope" />
            <InfoRow label="Phone" value={account?.phone || '—'} icon="bi-telephone" />
            <InfoRow
              label="Email verified"
              value={<YesNoBadge value={account?.emailVerified} />}
              icon="bi-patch-check"
            />
            <InfoRow
              label="Phone verified"
              value={<YesNoBadge value={account?.phoneVerified} />}
              icon="bi-shield-check"
            />
            <InfoRow label="Role" value={account?.role?.name || 'Buyer'} icon="bi-briefcase" />
            <InfoRow label="Member since" value={formatDate(account?.createdAt)} icon="bi-calendar-plus" />
            <InfoRow label="Last login" value={formatDate(account?.lastLoginAt)} icon="bi-clock-history" />
            <InfoRow label="Profile updated" value={formatDate(profile?.updatedAt)} icon="bi-arrow-repeat" />
          </section>
        </div>

        <div className="col-lg-7">
          <section className="builder-profile-section panel-card mb-3">
            <div className="builder-profile-section-head">
              <span className="builder-profile-section-icon" aria-hidden>
                <i className="bi bi-currency-rupee" />
              </span>
              <div>
                <h2 className="h6 mb-0">Buying preferences</h2>
                <p className="form-section-hint mb-0 mt-1">What you are looking for in a property.</p>
              </div>
            </div>
            <InfoRow label="Budget min" value={formatBudget(profile?.budgetMin)} icon="bi-cash-stack" />
            <InfoRow label="Budget max" value={formatBudget(profile?.budgetMax)} icon="bi-cash" />
            <InfoRow
              label="Preferred cities"
              value={resolveLabels(profile?.preferredCities, cities)}
              icon="bi-geo-alt"
            />
            <InfoRow
              label="Preferred property types"
              value={resolveLabels(profile?.preferredTypes, propertyTypes)}
              icon="bi-buildings"
            />
          </section>

          <form className="builder-profile-section panel-card" onSubmit={save}>
            <div className="builder-profile-section-head">
              <span className="builder-profile-section-icon" aria-hidden>
                <i className="bi bi-pencil-square" />
              </span>
              <div>
                <h2 className="h6 mb-0">Update preferences</h2>
                <p className="form-section-hint mb-0 mt-1">Keep your search preferences up to date.</p>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="budgetMin">Budget min (₹)</label>
                <input
                  id="budgetMin"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 5000000"
                  value={form.budgetMin}
                  onChange={(e) => setForm((prev) => ({ ...prev, budgetMin: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="budgetMax">Budget max (₹)</label>
                <input
                  id="budgetMax"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 15000000"
                  value={form.budgetMax}
                  onChange={(e) => setForm((prev) => ({ ...prev, budgetMax: e.target.value }))}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Preferred cities</label>
              {cities.length > 0 ? (
                <div className="row g-2">
                  {cities.map((city) => (
                    <div key={city.id} className="col-md-6 col-lg-4">
                      <label className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={form.preferredCities.includes(city.id)}
                          onChange={() => toggleSelection('preferredCities', city.id)}
                        />
                        <span className="form-check-label">{city.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small text-secondary mb-0">No cities available yet.</p>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label">Preferred property types</label>
              {propertyTypes.length > 0 ? (
                <div className="row g-2">
                  {propertyTypes.map((type) => (
                    <div key={type.id} className="col-md-6 col-lg-4">
                      <label className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={form.preferredTypes.includes(type.id)}
                          onChange={() => toggleSelection('preferredTypes', type.id)}
                        />
                        <span className="form-check-label">{type.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small text-secondary mb-0">No property types available yet.</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
