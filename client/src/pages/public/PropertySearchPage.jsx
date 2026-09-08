import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import PropertySearchCard from '../../components/public/PropertySearchCard';
import { PropertySearchResultsSkeleton } from '../../components/public/PropertySearchResultsSkeleton';
import HomeProminentProjects from '../../components/public/HomeProminentProjects';
import HomeNewProperties from '../../components/public/HomeNewProperties';
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

export default function PropertySearchPage({ embedded = false }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { accessToken, user } = useSelector((s) => s.auth);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      const india = countriesRes.data.data.find((c) => c.iso2 === 'IN') || countriesRes.data.data[0];
      if (india) {
        const states = await mastersService.listStates(india.id, { activeOnly: true });
        const cityLists = await Promise.all(
          states.data.data.map((s) => mastersService.listCities(s.id, { activeOnly: true }))
        );
        setCities(cityLists.flatMap((r) => r.data.data));
      }
    });
  }, []);

  useEffect(() => {
    if (!filters.cityId) {
      setLocalities([]);
      return;
    }
    mastersService
      .listLocalities(filters.cityId, { activeOnly: true })
      .then((res) => setLocalities(res.data.data || []))
      .catch(() => setLocalities([]));
  }, [filters.cityId]);

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
    () => cities.find((c) => String(c.id) === String(filters.cityId))?.name,
    [cities, filters.cityId]
  );

  const filteredTypes = useMemo(
    () => types.filter((t) => !filters.categoryId || t.categoryId === filters.categoryId),
    [types, filters.categoryId]
  );

  const plotTypeId = useMemo(
    () => types.find((t) => t.code === 'plot')?.id || '',
    [types]
  );

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

  const filterForm = (
    <form className="property-search-filters" onSubmit={handleSubmit}>
      <div className="property-search-filters-main">
        <div className="property-search-field property-search-field--grow">
          <i className="bi bi-search" aria-hidden />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Search locality, landmark, or keyword"
            aria-label="Search keyword"
          />
        </div>
        <div className="property-search-field">
          <i className="bi bi-geo-alt" aria-hidden />
          <select
            value={filters.cityId}
            onChange={(e) => setFilters({ ...filters, cityId: e.target.value, localityId: '' })}
            aria-label="City"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary property-search-submit-btn">
          Search
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary property-search-advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <i className={`bi bi-sliders ${showAdvanced ? 'me-1' : ''}`} aria-hidden />
          {showAdvanced ? 'Hide filters' : 'More filters'}
        </button>
      </div>

      {showAdvanced && (
        <div className="property-search-filters-advanced">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label">Locality</label>
              <select
                className="form-select form-select-sm"
                value={filters.localityId}
                onChange={(e) => setFilters({ ...filters, localityId: e.target.value })}
                disabled={!filters.cityId}
              >
                <option value="">All localities</option>
                {localities.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Category</label>
              <select
                className="form-select form-select-sm"
                value={filters.categoryId}
                onChange={(e) => setFilters({
                  ...filters,
                  categoryId: e.target.value,
                  propertyTypeId: '',
                })}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Property type</label>
              <select
                className="form-select form-select-sm"
                value={filters.propertyTypeId}
                onChange={(e) => setFilters({ ...filters, propertyTypeId: e.target.value })}
              >
                <option value="">All types</option>
                {filteredTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Bedrooms</label>
              <select
                className="form-select form-select-sm"
                value={filters.bedrooms}
                onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}+ BHK</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Min price (₹)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                placeholder="Min"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Max price (₹)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder="Max"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Min quality rating</label>
              <select
                className="form-select form-select-sm"
                value={filters.minReviewRating}
                onChange={(e) => setFilters({ ...filters, minReviewRating: e.target.value })}
              >
                <option value="">Any</option>
                {[5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>{n}+ / 10</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button type="submit" className="btn btn-primary btn-sm w-100">Apply filters</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );

  const purposeTabs = (
    <div className="property-search-purpose-tabs" role="tablist">
      {PURPOSE_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={filters.purpose === tab.value}
          className={`property-search-purpose-tab ${filters.purpose === tab.value ? 'active' : ''}`}
          onClick={() => handlePurposeChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
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
              <strong className="property-search-count">{meta.total.toLocaleString('en-IN')}</strong>
              <span className="text-secondary ms-1">
                {meta.total === 1 ? 'property' : 'properties'}
                {cityName ? ` in ${cityName}` : ''}
              </span>
            </div>
            <div className="property-search-results-actions">
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
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => applyFilters({
                  q: '',
                  cityId: '',
                  localityId: '',
                  categoryId: '',
                  propertyTypeId: '',
                  minPrice: '',
                  maxPrice: '',
                  bedrooms: '',
                  minReviewRating: '',
                })}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="property-search-grid">
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
      <div className="col-lg-9">
        {resultsBody}
      </div>

      {!embedded && (
        <div className="col-lg-3">
          <aside className="property-search-sidebar panel-card">
            <h2 className="h6 mb-3">Sponsored</h2>
            {ads.length === 0 && <p className="text-secondary small mb-0">No ads right now</p>}
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
                {formatPropertyPurpose(filters.purpose)}
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
          {purposeTabs}
          {filterForm}
        </section>

        <section className="property-search-embedded-results panel-card">
          <div className="property-search-embedded-results-head">
            <h2 className="h6 mb-0">Search results</h2>
            <span className="small text-secondary">Listings matching your filters</span>
          </div>
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
      <PublicSiteHeader active="/search" />

      <section className="property-search-hero">
        <div className="container">
          <div className="property-search-hero-head">
            <div>
              <h1>Search properties</h1>
              <p>
                {formatPropertyPurpose(filters.purpose)}
                {cityName ? ` in ${cityName}` : ' across all cities'}
              </p>
            </div>
            <Link to="/" className="btn btn-sm btn-outline-light">
              <i className="bi bi-house" aria-hidden /> Home
            </Link>
          </div>

          {purposeTabs}
          {filterForm}
        </div>
      </section>

      <div className="container property-search-body">
        {resultsSection}
      </div>

      <PublicSiteFooter />
    </div>
  );
}
