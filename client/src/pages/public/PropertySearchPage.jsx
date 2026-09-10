import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import HomeHeader from '../../components/public/HomeHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import PropertySearchCard from '../../components/public/PropertySearchCard';
import { PropertySearchResultsSkeleton } from '../../components/public/PropertySearchResultsSkeleton';
import HomeProminentProjects from '../../components/public/HomeProminentProjects';
import HomeNewProperties from '../../components/public/HomeNewProperties';
import SearchFilterDropdown, { SearchBudgetDropdown } from '../../components/public/SearchFilterDropdown';
import { useHomeLocationsContext } from '../../contexts/HomeLocationsContext';
import {
  advertisementService,
  mastersService,
  mediaUrl,
  propertyService,
} from '../../services';
import { useToast } from '../../hooks/useToast';
import { formatPropertyPurpose } from '../../components/properties/propertyUtils';

const PURPOSE_TABS = [
  { value: 'sale', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'lease', label: 'Lease' },
  { value: 'pg', label: 'PG' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'rating_desc', label: 'Top rated' },
  { value: 'rating_asc', label: 'Lowest rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

function filtersFromParams(params) {
  return {
    q: params.get('q') || '',
    purpose: params.get('purpose') || 'sale',
    cityId: params.get('cityId') || '',
    localityId: params.get('localityId') || '',
    categoryId: params.get('categoryId') || '',
    propertyTypeId: params.get('propertyTypeId') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    bedrooms: params.get('bedrooms') || '',
    minReviewRating: params.get('minReviewRating') || '',
    sort: params.get('sort') || 'newest',
  };
}

function purposeShortLabel(purpose) {
  return PURPOSE_TABS.find((t) => t.value === purpose)?.label || formatPropertyPurpose(purpose);
}

const BUDGET_PRESETS = [
  { label: 'Under ₹10K', min: '', max: '10000' },
  { label: '₹10K - ₹25K', min: '10000', max: '25000' },
  { label: '₹25K - ₹50K', min: '25000', max: '50000' },
  { label: '₹50K - ₹1L', min: '50000', max: '100000' },
  { label: 'Above ₹1L', min: '100000', max: '' },
];

export default function PropertySearchPage({ embedded = false }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { accessToken, user } = useSelector((s) => s.auth);
  const {
    cities: homeCities,
    cityId: homeCityId,
    setCityId: setHomeCityId,
    cityName: homeCityName,
    localities: homeLocalities,
  } = useHomeLocationsContext();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => filtersFromParams(params));

  useEffect(() => {
    Promise.all([
      mastersService.listCountries({ activeOnly: true }),
      mastersService.listCategories({ activeOnly: true }),
      mastersService.listTypes({ activeOnly: true }),
      advertisementService.list({ placement: 'search_sidebar' }).catch(() => ({ data: { data: [] } })),
    ]).then(async ([countriesRes, cats, tps, adsRes]) => {
      setCategories(cats.data.data);
      setTypes(tps.data.data);
      setAds(adsRes.data.data || []);
      if (homeCities?.length) {
        setCities(homeCities);
        return;
      }
      const india = countriesRes.data.data.find((c) => c.iso2 === 'IN') || countriesRes.data.data[0];
      if (india) {
        const states = await mastersService.listStates(india.id, { activeOnly: true });
        const cityLists = await Promise.all(
          states.data.data.map((s) => mastersService.listCities(s.id, { activeOnly: true }))
        );
        setCities(cityLists.flatMap((r) => r.data.data));
      }
    });
  }, [homeCities]);

  useEffect(() => {
    if (homeCities?.length) setCities(homeCities);
  }, [homeCities]);

  useEffect(() => {
    if (!filters.cityId) {
      setLocalities(homeLocalities?.length ? homeLocalities : []);
      return;
    }
    if (
      String(filters.cityId) === String(homeCityId)
      && homeLocalities?.length
    ) {
      setLocalities(homeLocalities);
      return;
    }
    mastersService
      .listLocalities(filters.cityId, { activeOnly: true })
      .then((res) => setLocalities(res.data.data || []))
      .catch(() => setLocalities([]));
  }, [filters.cityId, homeCityId, homeLocalities]);

  const load = useCallback(async (nextFilters, page = 1) => {
    setLoading(true);
    try {
      const query = {
        page,
        limit: 12,
        purpose: nextFilters.purpose || undefined,
        cityId: nextFilters.cityId || undefined,
        localityId: nextFilters.localityId || undefined,
        categoryId: nextFilters.categoryId || undefined,
        propertyTypeId: nextFilters.propertyTypeId || undefined,
        minPrice: nextFilters.minPrice || undefined,
        maxPrice: nextFilters.maxPrice || undefined,
        bedrooms: nextFilters.bedrooms || undefined,
        minReviewRating: nextFilters.minReviewRating || undefined,
        q: nextFilters.q || undefined,
        sort: nextFilters.sort || undefined,
      };
      const { data } = await propertyService.search(query);
      setItems(data.data);
      setMeta(data.meta);
      setFilters(nextFilters);
    } catch (err) {
      toast.apiError(err, 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const nextFilters = filtersFromParams(params);
    const page = Number(params.get('page') || 1);
    load(nextFilters, page);
  }, [params, load]);

  const updateParams = (nextFilters, page = 1) => {
    setParams(
      Object.fromEntries(
        Object.entries({ ...nextFilters, page: String(page) }).filter(([, v]) => v)
      ),
      { replace: true }
    );
  };

  const cityName = useMemo(
    () => homeCityName
      || cities.find((c) => String(c.id) === String(filters.cityId))?.name,
    [homeCityName, cities, filters.cityId]
  );

  const cityOptions = cities.length ? cities : homeCities;

  const filteredTypes = useMemo(
    () => types.filter((t) => !filters.categoryId || t.categoryId === filters.categoryId),
    [types, filters.categoryId]
  );

  const plotTypeId = useMemo(
    () => types.find((t) => t.code === 'plot')?.id || '',
    [types]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.localityId) n += 1;
    if (filters.categoryId) n += 1;
    if (filters.propertyTypeId) n += 1;
    if (filters.bedrooms) n += 1;
    if (filters.minPrice || filters.maxPrice) n += 1;
    if (filters.minReviewRating) n += 1;
    return n;
  }, [filters]);

  const buildBuyerSearchUrl = useCallback((extra = {}) => {
    const query = {
      purpose: filters.purpose || 'sale',
      sort: 'newest',
      cityId: filters.cityId || undefined,
      ...extra,
    };
    return `/panel/buyer/search?${new URLSearchParams(
      Object.fromEntries(Object.entries(query).filter(([, value]) => value))
    ).toString()}`;
  }, [filters.purpose, filters.cityId]);

  const applyFilters = (patch = {}, page = 1) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    updateParams(next, page);
  };

  const handleHeaderCityChange = (id) => {
    const cityId = id || '';
    setHomeCityId(cityId);
    applyFilters({ cityId, localityId: '' });
  };

  // If search URL has a city, keep the shared header city matching it.
  // If URL has no city, use the home header city for search.
  useEffect(() => {
    if (embedded) return;
    const urlCity = params.get('cityId') || '';
    if (urlCity) {
      if (String(homeCityId || '') !== String(urlCity)) {
        setHomeCityId(urlCity);
      }
      return;
    }
    if (homeCityId && String(filters.cityId || '') !== String(homeCityId)) {
      applyFilters({ cityId: homeCityId, localityId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, params, homeCityId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const handlePurposeChange = (purpose) => {
    applyFilters({ purpose });
  };

  const handleSortChange = (sort) => {
    applyFilters({ sort });
  };

  const resetFilters = () => {
    applyFilters({
      q: '',
      localityId: '',
      categoryId: '',
      propertyTypeId: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      minReviewRating: '',
    });
  };

  const save = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) {
      toast.info('Sign in to save properties');
      return;
    }
    try {
      const { data } = await propertyService.toggleWishlist(id);
      toast.success(data.data.saved ? 'Saved' : 'Removed from saved');
    } catch (err) {
      toast.apiError(err, 'Could not update wishlist');
    }
  };

  const compare = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) {
      toast.info('Sign in to compare properties');
      return;
    }
    try {
      const { data } = await propertyService.toggleCompare(id);
      const metaInfo = data.data.meta || {};
      toast.info(
        data.data.compared
          ? `In compare (${metaInfo.total}/${metaInfo.max})`
          : 'Removed from compare'
      );
    } catch (err) {
      toast.apiError(err, 'Could not update compare');
    }
  };

  const pageStart = meta.total === 0 ? 0 : ((meta.page - 1) * 12) + 1;
  const pageEnd = Math.min(meta.page * 12, meta.total);

  const searchTopbar = (
    <form className="property-search-topbar-form" onSubmit={handleSubmit}>
      

      <div className="property-search-header-input property-search-header-input--full">
        <i className="bi bi-search" aria-hidden />
        <input
          type="text"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Enter Locality, Landmark, Project or builder"
          aria-label="Search keyword"
        />
        <button type="submit" className="property-search-header-submit" aria-label="Search">
          <i className="bi bi-search" aria-hidden />
        </button>
      </div>
    </form>
  );

  const bhkOptions = useMemo(
    () => [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+ BHK` })),
    []
  );

  const typeOptions = useMemo(
    () => filteredTypes.map((t) => ({ value: t.id, label: t.name })),
    [filteredTypes]
  );

  const localityOptions = useMemo(
    () => localities.map((l) => ({ value: l.id, label: l.name })),
    [localities]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const ratingOptions = useMemo(
    () => [5, 6, 7, 8, 9].map((n) => ({ value: String(n), label: `${n}+ / 10` })),
    []
  );

  const chipBar = (
    <div className="property-search-chipbar">
      <div className="property-search-chips">
        <SearchFilterDropdown
          label="BHK"
          placeholder="BHK"
          value={filters.bedrooms}
          options={bhkOptions}
          onChange={(bedrooms) => applyFilters({ bedrooms })}
        />

        <SearchBudgetDropdown
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          presets={BUDGET_PRESETS}
          onApply={({ minPrice, maxPrice }) => applyFilters({ minPrice, maxPrice })}
        />

        <SearchFilterDropdown
          label="Property type"
          placeholder="Property type"
          value={filters.propertyTypeId}
          options={typeOptions}
          onChange={(propertyTypeId) => applyFilters({ propertyTypeId })}
        />

        <SearchFilterDropdown
          label="Locality"
          placeholder={filters.cityId ? 'Locality' : 'Select city first'}
          value={filters.localityId}
          options={localityOptions}
          disabled={!filters.cityId}
          onChange={(localityId) => applyFilters({ localityId })}
        />

        <SearchFilterDropdown
          label="Category"
          placeholder="Category"
          value={filters.categoryId}
          options={categoryOptions}
          onChange={(categoryId) => applyFilters({ categoryId, propertyTypeId: '' })}
        />

        <SearchFilterDropdown
          label="More filters"
          placeholder="More filters"
          buttonLabel={
            filters.minReviewRating
              ? `Rating ${filters.minReviewRating}+`
              : 'More filters'
          }
          value={filters.minReviewRating}
          options={ratingOptions}
          className="ps-filter-dd--more"
          menuClassName="ps-filter-dd-menu--more"
        >
          {({ close }) => (
            <div className="ps-filter-more-panel">
              <p className="ps-filter-more-title">
                <i className="bi bi-sliders" aria-hidden />
                Quality rating
              </p>
              <ul className="ps-filter-dd-list">
                <li>
                  <button
                    type="button"
                    className={`ps-filter-dd-option${!filters.minReviewRating ? ' is-selected' : ''}`}
                    onClick={() => {
                      applyFilters({ minReviewRating: '' });
                      close();
                    }}
                  >
                    Any rating
                  </button>
                </li>
                {ratingOptions.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className={`ps-filter-dd-option${String(filters.minReviewRating) === opt.value ? ' is-selected' : ''}`}
                      onClick={() => {
                        applyFilters({ minReviewRating: opt.value });
                        close();
                      }}
                    >
                      {opt.label}
                      {String(filters.minReviewRating) === opt.value && (
                        <i className="bi bi-check2" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SearchFilterDropdown>
      </div>

      {activeFilterCount > 0 && (
        <button type="button" className="property-search-reset" onClick={resetFilters}>
          Reset filters
        </button>
      )}
    </div>
  );

  const resultsBody = (
    <>
      {loading ? (
        <PropertySearchResultsSkeleton />
      ) : (
        <>
          <div className="property-search-results-bar">
            <div>
              <p className="property-search-breadcrumb mb-1">
                <Link to="/">Home</Link>
                <span>/</span>
                <span>
                  {purposeShortLabel(filters.purpose)}
                  {cityName ? ` in ${cityName}` : ''}
                </span>
              </p>
              <div className="property-search-count-line">
                <strong>
                  {meta.total === 0
                    ? 'No properties found'
                    : `Showing ${pageStart.toLocaleString('en-IN')} - ${pageEnd.toLocaleString('en-IN')} of ${meta.total.toLocaleString('en-IN')} properties`}
                </strong>
                {cityName ? <span className="text-secondary"> in {cityName}</span> : null}
              </div>
            </div>
            <div className="property-search-results-actions">
              <label className="property-search-sort-label">
                <span>Sort by</span>
                <select
                  className="form-select form-select-sm property-search-sort"
                  value={filters.sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  aria-label="Sort results"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              {accessToken && user?.role?.code === 'BUYER' && (
                <Link to="/panel/buyer/compare" className="btn btn-sm btn-outline-secondary">
                  Compare list
                </Link>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="property-search-empty">
              <i className="bi bi-house-x" aria-hidden />
              <h2>No properties found</h2>
              <p>Try changing filters or search in another city.</p>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div className="property-search-list">
                {items.map((p) => (
                  <PropertySearchCard
                    key={p.id}
                    property={p}
                    onSave={save}
                    onCompare={compare}
                    showActions={embedded ? Boolean(accessToken) : true}
                  />
                ))}
              </div>
              {meta.totalPages > 1 && (
                <nav className="property-search-pagination" aria-label="Search results pages">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={meta.page <= 1}
                    onClick={() => applyFilters({}, meta.page - 1)}
                  >
                    Previous
                  </button>
                  <span className="property-search-page-info">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => applyFilters({}, meta.page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </>
  );

  const resultsSection = (
    <div className="row g-4">
      <div className={embedded ? 'col-12' : 'col-lg-9'}>
        {resultsBody}
      </div>

      {!embedded && (
        <div className="col-lg-3">
          <aside className="property-search-sidebar">
            <div className="hs-app-promo">
              <div className="hs-app-promo-head">
                <h2>Get our Free App</h2>
                <span className="hs-app-promo-rating">
                  <i className="bi bi-star-fill" aria-hidden /> 4.5
                </span>
              </div>
              <div className="hs-app-promo-qr">
                <div className="hs-app-promo-qr-box" aria-label="App QR coming soon">
                  <i className="bi bi-qr-code" aria-hidden />
                  <span className="hs-app-promo-qr-soon">Coming soon</span>
                </div>
                <p>App download QR will be available soon</p>
              </div>
              <label className="hs-app-promo-sms">
                <span>Get App Download Link via SMS</span>
                <div className="hs-app-promo-sms-row">
                  <span className="hs-app-promo-cc">+91</span>
                  <input type="tel" inputMode="numeric" placeholder="Mobile Number" maxLength={10} />
                  <button type="button" aria-label="Send link" onClick={() => toast.info('App download SMS coming soon')}>
                    <i className="bi bi-arrow-right" aria-hidden />
                  </button>
                </div>
              </label>
              <div className="hs-app-promo-stores">
                <span className="hs-app-store-badge">Google Play</span>
                <span className="hs-app-store-badge">App Store</span>
              </div>
            </div>

            {ads.length > 0 && (
              <div className="property-search-sidebar-card mt-3">
                <h2 className="h6 mb-3">Sponsored</h2>
                {ads.map((ad) => (
                  <a
                    key={ad.id}
                    href={ad.linkUrl || '#'}
                    className="property-search-ad"
                    target={ad.linkUrl?.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                  >
                    {ad.imageUrl && (
                      <img src={mediaUrl(ad.imageUrl)} alt="" loading="lazy" />
                    )}
                    <span>{ad.title}</span>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="property-search-embedded">
        <section className="property-search-embedded-hero">
          <div className="property-search-embedded-hero-head">
            <div>
              <h1 className="property-search-embedded-title">Search properties</h1>
              <p className="property-search-embedded-subtitle">
                {purposeShortLabel(filters.purpose)}
                {cityName ? ` in ${cityName}` : ' across all cities'}
              </p>
            </div>
            <div className="property-search-embedded-quicklinks">
              <Link to="/panel/buyer/saved" className="btn btn-sm btn-outline-light">
                <i className="bi bi-heart me-1" aria-hidden />
                Saved
              </Link>
              <Link to="/panel/buyer/compare" className="btn btn-sm btn-outline-light">
                <i className="bi bi-sliders me-1" aria-hidden />
                Compare
              </Link>
            </div>
          </div>
          {searchTopbar}
        </section>

        <div className="property-search-embedded-filters">
          {chipBar}
        </div>

        <section className="property-search-embedded-results panel-card">
          {resultsBody}
        </section>

        <div className="property-search-embedded-discovery">
          <HomeProminentProjects cityId={filters.cityId} cityName={cityName} embedded />
          <HomeNewProperties
            cityId={filters.cityId}
            cityName={cityName}
            viewAllTo={buildBuyerSearchUrl()}
            embedded
          />
          {plotTypeId && (
            <HomeNewProperties
              cityId={filters.cityId}
              cityName={cityName}
              propertyTypeId={plotTypeId}
              title="Plots"
              viewAllTo={buildBuyerSearchUrl({ propertyTypeId: plotTypeId, purpose: 'sale' })}
              className="home-new-plots"
              embedded
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="property-search-page">
      <HomeHeader
        cities={cityOptions}
        selectedCityId={homeCityId || filters.cityId}
        onCityChange={handleHeaderCityChange}
        localities={homeLocalities}
        overlay
      />

      <section className="property-search-topbar">
        <div className="container">
          <h1 className="visually-hidden">
            {purposeShortLabel(filters.purpose)}
            {cityName ? ` in ${cityName}` : ' properties'}
          </h1>
          {searchTopbar}
        </div>
      </section>

      <div className="property-search-filter-strip">
        <div className="container">
          {chipBar}
        </div>
      </div>

      <div className="container property-search-body">
        {resultsSection}
      </div>

      <PublicSiteFooter />
    </div>
  );
}
