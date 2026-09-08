export default function PropertyDetailSkeleton() {
  return (
    <div className="container py-4 property-detail-skeleton" aria-hidden>
      <div className="d-flex justify-content-between align-items-center mb-3 gap-3">
        <div className="skeleton-line skeleton-pill" style={{ width: 100, height: 32 }} />
        <div className="d-flex gap-2">
          <div className="skeleton-line skeleton-pill" style={{ width: 88, height: 32 }} />
          <div className="skeleton-line skeleton-pill" style={{ width: 88, height: 32 }} />
          <div className="skeleton-line skeleton-pill" style={{ width: 72, height: 32 }} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="panel-card mb-3">
            <div className="property-detail-skeleton-hero skeleton-block" />
            <div className="d-flex gap-2 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="property-detail-skeleton-thumb skeleton-block" />
              ))}
            </div>
          </div>

          <div className="panel-card mb-3">
            <div className="skeleton-line skeleton-line--title mb-3" />
            <div className="skeleton-line skeleton-line--short mb-2" />
            <div className="skeleton-line mb-2" />
            <div className="skeleton-line mb-2" />
            <div className="skeleton-line skeleton-line--medium" />
          </div>

          <div className="panel-card mb-3">
            <div className="skeleton-line skeleton-line--short mb-3" />
            <div className="d-flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-line skeleton-pill" style={{ width: 72, height: 28 }} />
              ))}
            </div>
          </div>

          <div className="panel-card">
            <div className="skeleton-line skeleton-line--short mb-3" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-bottom py-3">
                <div className="skeleton-line skeleton-line--short mb-2" />
                <div className="skeleton-line mb-2" />
                <div className="skeleton-line skeleton-line--medium" />
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="panel-card mb-3">
            <div className="skeleton-line mb-3" style={{ height: 36, width: '55%' }} />
            <div className="skeleton-line skeleton-line--short mb-3" />
            <div className="skeleton-line mb-2" />
            <div className="skeleton-line mb-2" />
            <div className="skeleton-line mb-2" />
            <div className="skeleton-line skeleton-line--medium" />
          </div>

          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="panel-card mb-3">
              <div className="skeleton-line skeleton-line--short mb-3" />
              <div className="skeleton-line mb-2" style={{ height: 34 }} />
              <div className="skeleton-line mb-2" style={{ height: 34 }} />
              <div className="skeleton-line mb-3" style={{ height: 34 }} />
              <div className="skeleton-line" style={{ height: 80 }} />
              <div className="skeleton-line mt-3" style={{ height: 36 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
