export function PropertySearchResultsSkeleton({ count = 4 }) {
  return (
    <>
      <div className="property-search-results-bar property-search-results-bar--skeleton" aria-hidden>
        <div>
          <div className="skeleton-line skeleton-line--short mb-2" style={{ width: 160, height: 12 }} />
          <div className="skeleton-line" style={{ width: 260, height: 22 }} />
        </div>
        <div className="skeleton-line skeleton-pill" style={{ width: 170, height: 34 }} />
      </div>
      <div className="property-search-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="hs-listing-card hs-listing-card--skeleton">
            <div className="hs-listing-media skeleton-block" />
            <div className="hs-listing-body">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--short mt-2" />
              <div className="skeleton-block mt-3" style={{ height: 64, borderRadius: 8 }} />
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="skeleton-line" style={{ width: 100, height: 12 }} />
                <div className="skeleton-line skeleton-pill" style={{ width: 110, height: 36 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
