import { useCallback, useEffect, useMemo, useState } from 'react';
import { mastersService } from '../../services';
import { formatApiError } from '../../utils/apiError';
import { useToast } from '../../hooks/useToast';

const TIERS = [
  { key: 'country', title: 'Countries', icon: 'bi-globe2', empty: 'No countries yet' },
  { key: 'state', title: 'States', icon: 'bi-map', empty: 'Select a country' },
  { key: 'city', title: 'Cities', icon: 'bi-buildings', empty: 'Select a state' },
  { key: 'locality', title: 'Localities', icon: 'bi-geo-alt', empty: 'Select a city' },
];

function filterItems(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function upsertItem(items, item) {
  if (!item?.id) return items;
  const exists = items.some((entry) => entry.id === item.id);
  if (exists) {
    return sortByName(items.map((entry) => (entry.id === item.id ? item : entry)));
  }
  return sortByName([...items, item]);
}

function LocationTierPanel({
  title,
  icon,
  items,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  emptyMessage,
  disabled,
  loading,
  refreshing = false,
  selectable = true,
  renderMeta,
  children,
}) {
  return (
    <div className={`location-tier panel-card h-100 ${disabled ? 'location-tier-disabled' : ''}`}>
      <div className="location-tier-header">
        <div className="location-tier-title">
          <span className="location-tier-icon">
            <i className={`bi ${icon}`} />
          </span>
          <div>
            <h2 className="h6 mb-0">{title}</h2>
            <small className="text-secondary">{items.length} total</small>
          </div>
        </div>
      </div>

      <div className="location-tier-search">
        <i className="bi bi-search" />
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder={`Search ${title.toLowerCase()}…`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className={`location-tier-list ${refreshing ? 'is-refreshing' : ''}`}>
        {loading && items.length === 0 ? (
          <div className="location-tier-loading">
            <div className="spinner-border spinner-border-sm text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="location-tier-empty">
            <i className={`bi ${icon}`} />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          items.map((item) => {
            const active = selectable && selectedId === item.id;
            const Tag = selectable ? 'button' : 'div';
            return (
              <Tag
                key={item.id}
                type={selectable ? 'button' : undefined}
                className={`location-item ${active ? 'active' : ''}`}
                onClick={selectable ? () => onSelect(item.id) : undefined}
              >
                <span className="location-item-name">{item.name}</span>
                {renderMeta ? renderMeta(item) : null}
                {active && selectable && <i className="bi bi-check2 location-item-check" />}
              </Tag>
            );
          })
        )}
      </div>

      {!disabled && children ? <div className="location-tier-add">{children}</div> : null}
    </div>
  );
}

export default function LocationsPage() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [refreshingCountries, setRefreshingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [refreshingStates, setRefreshingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [refreshingCities, setRefreshingCities] = useState(false);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const [refreshingLocalities, setRefreshingLocalities] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const [search, setSearch] = useState({ country: '', state: '', city: '', locality: '' });
  const [showAdd, setShowAdd] = useState({ country: false, state: false, city: false, locality: false });
  const [forms, setForms] = useState({
    country: { name: '', iso2: '', phoneCode: '+91' },
    state: { name: '', code: '' },
    city: { name: '', slug: '' },
    locality: { name: '', slug: '', pincode: '' },
  });

  const loadCountries = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshingCountries(true);
    else setLoadingCountries(true);
    try {
      const { data } = await mastersService.listCountries();
      setCountries(data.data);
    } finally {
      if (silent) setRefreshingCountries(false);
      else setLoadingCountries(false);
    }
  }, []);

  const loadStates = useCallback(async (parentId, { silent = false } = {}) => {
    if (!parentId) {
      setStates([]);
      return;
    }
    if (silent) setRefreshingStates(true);
    else setLoadingStates(true);
    try {
      const { data } = await mastersService.listStates(parentId);
      setStates(data.data);
    } catch (err) {
      toastError(formatApiError(err, 'Failed to load states'));
    } finally {
      if (silent) setRefreshingStates(false);
      else setLoadingStates(false);
    }
  }, [toastError]);

  const loadCities = useCallback(async (parentId, { silent = false } = {}) => {
    if (!parentId) {
      setCities([]);
      return;
    }
    if (silent) setRefreshingCities(true);
    else setLoadingCities(true);
    try {
      const { data } = await mastersService.listCities(parentId);
      setCities(data.data);
    } catch (err) {
      toastError(formatApiError(err, 'Failed to load cities'));
    } finally {
      if (silent) setRefreshingCities(false);
      else setLoadingCities(false);
    }
  }, [toastError]);

  const loadLocalities = useCallback(async (parentId, { silent = false } = {}) => {
    if (!parentId) {
      setLocalities([]);
      return;
    }
    if (silent) setRefreshingLocalities(true);
    else setLoadingLocalities(true);
    try {
      const { data } = await mastersService.listLocalities(parentId);
      setLocalities(data.data);
    } catch (err) {
      toastError(formatApiError(err, 'Failed to load localities'));
    } finally {
      if (silent) setRefreshingLocalities(false);
      else setLoadingLocalities(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadCountries().catch((err) => toastError(formatApiError(err, 'Failed to load countries')));
  }, [loadCountries, toastError]);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setStateId('');
      setCityId('');
      setCities([]);
      setLocalities([]);
      return;
    }
    setStateId('');
    setCityId('');
    setCities([]);
    setLocalities([]);
    setSearch((s) => ({ ...s, state: '', city: '', locality: '' }));
    loadStates(countryId);
  }, [countryId, loadStates]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      setCityId('');
      setLocalities([]);
      return;
    }
    setCityId('');
    setLocalities([]);
    setSearch((s) => ({ ...s, city: '', locality: '' }));
    loadCities(stateId);
  }, [stateId, loadCities]);

  useEffect(() => {
    if (!cityId) {
      setLocalities([]);
      return;
    }
    setSearch((s) => ({ ...s, locality: '' }));
    loadLocalities(cityId);
  }, [cityId, loadLocalities]);

  const selectedCountry = countries.find((c) => c.id === countryId);
  const selectedState = states.find((s) => s.id === stateId);
  const selectedCity = cities.find((c) => c.id === cityId);

  const filteredCountries = useMemo(
    () => filterItems(countries, search.country),
    [countries, search.country]
  );
  const filteredStates = useMemo(() => filterItems(states, search.state), [states, search.state]);
  const filteredCities = useMemo(() => filterItems(cities, search.city), [cities, search.city]);
  const filteredLocalities = useMemo(
    () => filterItems(localities, search.locality),
    [localities, search.locality]
  );

  const breadcrumb = [selectedCountry, selectedState, selectedCity].filter(Boolean);

  const run = async (fn, success) => {
    try {
      await fn();
      toastSuccess(success);
    } catch (err) {
      toastError(formatApiError(err, 'Request failed'));
    }
  };

  return (
    <div className="locations-page">
      <div className="locations-header">
        <div>
          <h1 className="h4 mb-1">Locations</h1>
          <p className="text-secondary small mb-0">
            Manage countries, states, cities, and localities used across properties and projects.
          </p>
        </div>
        {breadcrumb.length > 0 && (
          <nav className="locations-breadcrumb" aria-label="Location path">
            {breadcrumb.map((item, index) => (
              <span key={item.id} className="locations-breadcrumb-item">
                {index > 0 && <i className="bi bi-chevron-right" />}
                <span>{item.name}</span>
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="row g-2 mb-3">
        {[
          ['Countries', countries.length, 'bi-globe2'],
          ['States', countryId ? states.length : '—', 'bi-map'],
          ['Cities', stateId ? cities.length : '—', 'bi-buildings'],
          ['Localities', cityId ? localities.length : '—', 'bi-geo-alt'],
        ].map(([label, value, icon]) => (
          <div className="col-6 col-lg-3" key={label}>
            <div className="stat-card location-stat-card h-100">
              <div className="d-flex align-items-center gap-2">
                <span className="location-stat-icon">
                  <i className={`bi ${icon}`} />
                </span>
                <div>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 locations-grid">
        <div className="col-lg-3">
          <LocationTierPanel
            title="Countries"
            icon={TIERS[0].icon}
            items={filteredCountries}
            selectedId={countryId}
            onSelect={setCountryId}
            search={search.country}
            onSearchChange={(v) => setSearch((s) => ({ ...s, country: v }))}
            emptyMessage={TIERS[0].empty}
            loading={loadingCountries}
            refreshing={refreshingCountries}
            renderMeta={(item) => (
              <span className="location-item-meta">{item.iso2}</span>
            )}
          >
            <button
              type="button"
              className="btn btn-sm btn-link location-add-toggle"
              onClick={() => setShowAdd((s) => ({ ...s, country: !s.country }))}
            >
              <i className={`bi ${showAdd.country ? 'bi-dash-lg' : 'bi-plus-lg'}`} />
              {showAdd.country ? 'Hide form' : 'Add country'}
            </button>
            {showAdd.country && (
              <form
                className="location-add-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const { data } = await mastersService.createCountry(forms.country);
                    const created = data.data;
                    setCountries((prev) => upsertItem(prev, created));
                    setCountryId(created.id);
                    setForms((f) => ({ ...f, country: { name: '', iso2: '', phoneCode: '+91' } }));
                    setShowAdd((s) => ({ ...s, country: false }));
                  }, 'Country created');
                }}
              >
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Country name"
                  required
                  value={forms.country.name}
                  onChange={(e) =>
                    setForms((f) => ({ ...f, country: { ...f.country, name: e.target.value } }))
                  }
                />
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <input
                      className="form-control form-control-sm"
                      placeholder="ISO (IN)"
                      maxLength={2}
                      required
                      value={forms.country.iso2}
                      onChange={(e) =>
                        setForms((f) => ({
                          ...f,
                          country: { ...f.country, iso2: e.target.value.toUpperCase() },
                        }))
                      }
                    />
                  </div>
                  <div className="col-6">
                    <input
                      className="form-control form-control-sm"
                      placeholder="+91"
                      value={forms.country.phoneCode}
                      onChange={(e) =>
                        setForms((f) => ({
                          ...f,
                          country: { ...f.country, phoneCode: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <button className="btn btn-sm btn-primary w-100" type="submit">
                  Save country
                </button>
              </form>
            )}
          </LocationTierPanel>
        </div>

        <div className="col-lg-3">
          <LocationTierPanel
            title="States"
            icon={TIERS[1].icon}
            items={filteredStates}
            selectedId={stateId}
            onSelect={setStateId}
            search={search.state}
            onSearchChange={(v) => setSearch((s) => ({ ...s, state: v }))}
            emptyMessage={countryId ? 'No states in this country' : TIERS[1].empty}
            disabled={!countryId}
            loading={loadingStates}
            refreshing={refreshingStates}
            renderMeta={(item) =>
              item.code ? <span className="location-item-meta">{item.code}</span> : null
            }
          >
            <button
              type="button"
              className="btn btn-sm btn-link location-add-toggle"
              onClick={() => setShowAdd((s) => ({ ...s, state: !s.state }))}
            >
              <i className={`bi ${showAdd.state ? 'bi-dash-lg' : 'bi-plus-lg'}`} />
              {showAdd.state ? 'Hide form' : 'Add state'}
            </button>
            {showAdd.state && (
              <form
                className="location-add-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!countryId) return toastError('Select a country first');
                  run(async () => {
                    const { data } = await mastersService.createState({ ...forms.state, countryId });
                    const created = data.data;
                    setStates((prev) => upsertItem(prev, created));
                    setStateId(created.id);
                    setForms((f) => ({ ...f, state: { name: '', code: '' } }));
                    setShowAdd((s) => ({ ...s, state: false }));
                  }, 'State created');
                }}
              >
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="State name"
                  required
                  value={forms.state.name}
                  onChange={(e) =>
                    setForms((f) => ({ ...f, state: { ...f.state, name: e.target.value } }))
                  }
                />
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="State code (optional)"
                  value={forms.state.code}
                  onChange={(e) =>
                    setForms((f) => ({ ...f, state: { ...f.state, code: e.target.value } }))
                  }
                />
                <button className="btn btn-sm btn-primary w-100" type="submit">
                  Save state
                </button>
              </form>
            )}
          </LocationTierPanel>
        </div>

        <div className="col-lg-3">
          <LocationTierPanel
            title="Cities"
            icon={TIERS[2].icon}
            items={filteredCities}
            selectedId={cityId}
            onSelect={setCityId}
            search={search.city}
            onSearchChange={(v) => setSearch((s) => ({ ...s, city: v }))}
            emptyMessage={stateId ? 'No cities in this state' : TIERS[2].empty}
            disabled={!stateId}
            loading={loadingCities}
            refreshing={refreshingCities}
          >
            <button
              type="button"
              className="btn btn-sm btn-link location-add-toggle"
              onClick={() => setShowAdd((s) => ({ ...s, city: !s.city }))}
            >
              <i className={`bi ${showAdd.city ? 'bi-dash-lg' : 'bi-plus-lg'}`} />
              {showAdd.city ? 'Hide form' : 'Add city'}
            </button>
            {showAdd.city && (
              <form
                className="location-add-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!stateId) return toastError('Select a state first');
                  run(async () => {
                    const { data } = await mastersService.createCity({ ...forms.city, stateId });
                    const created = data.data;
                    setCities((prev) => upsertItem(prev, created));
                    setCityId(created.id);
                    setForms((f) => ({ ...f, city: { name: '', slug: '' } }));
                    setShowAdd((s) => ({ ...s, city: false }));
                  }, 'City created');
                }}
              >
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="City name"
                  required
                  value={forms.city.name}
                  onChange={(e) =>
                    setForms((f) => ({ ...f, city: { ...f.city, name: e.target.value } }))
                  }
                />
                <button className="btn btn-sm btn-primary w-100" type="submit">
                  Save city
                </button>
              </form>
            )}
          </LocationTierPanel>
        </div>

        <div className="col-lg-3">
          <LocationTierPanel
            title="Localities"
            icon={TIERS[3].icon}
            items={filteredLocalities}
            selectedId={null}
            onSelect={() => {}}
            search={search.locality}
            onSearchChange={(v) => setSearch((s) => ({ ...s, locality: v }))}
            emptyMessage={cityId ? 'No localities in this city' : TIERS[3].empty}
            disabled={!cityId}
            loading={loadingLocalities}
            refreshing={refreshingLocalities}
            selectable={false}
            renderMeta={(item) =>
              item.pincode ? <span className="location-item-meta">{item.pincode}</span> : null
            }
          >
            <button
              type="button"
              className="btn btn-sm btn-link location-add-toggle"
              onClick={() => setShowAdd((s) => ({ ...s, locality: !s.locality }))}
            >
              <i className={`bi ${showAdd.locality ? 'bi-dash-lg' : 'bi-plus-lg'}`} />
              {showAdd.locality ? 'Hide form' : 'Add locality'}
            </button>
            {showAdd.locality && (
              <form
                className="location-add-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!cityId) return toastError('Select a city first');
                  run(async () => {
                    const { data } = await mastersService.createLocality({ ...forms.locality, cityId });
                    const created = data.data;
                    setLocalities((prev) => upsertItem(prev, created));
                    setForms((f) => ({ ...f, locality: { name: '', slug: '', pincode: '' } }));
                    setShowAdd((s) => ({ ...s, locality: false }));
                  }, 'Locality created');
                }}
              >
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Locality name"
                  required
                  value={forms.locality.name}
                  onChange={(e) =>
                    setForms((f) => ({ ...f, locality: { ...f.locality, name: e.target.value } }))
                  }
                />
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Pincode (optional)"
                  value={forms.locality.pincode}
                  onChange={(e) =>
                    setForms((f) => ({ ...f, locality: { ...f.locality, pincode: e.target.value } }))
                  }
                />
                <button className="btn btn-sm btn-primary w-100" type="submit">
                  Save locality
                </button>
              </form>
            )}
          </LocationTierPanel>
        </div>
      </div>
    </div>
  );
}
