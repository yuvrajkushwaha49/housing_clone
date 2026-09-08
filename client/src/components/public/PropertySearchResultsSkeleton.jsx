export function PropertySearchResultsSkeleton({ count = 6 }) {
  return (
    <>
      <div className="property-search-results-bar property-search-results-bar--skeleton" aria-hidden>
        <div className="skeleton-line" style={{ width: 180, height: 28 }} />
        <div className="skeleton-line skeleton-pill" style={{ width: 170, height: 34 }} />
      </div>
      <div className="property-search-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="property-search-card property-search-card--skeleton">
            <div className="property-search-card-image skeleton-block" />
            <div className="property-search-card-body">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line skeleton-line--medium mt-2" />
              <div className="d-flex gap-2 mt-3">
                <div className="skeleton-line skeleton-pill flex-grow-1" style={{ height: 32 }} />
                <div className="skeleton-line skeleton-pill flex-grow-1" style={{ height: 32 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
