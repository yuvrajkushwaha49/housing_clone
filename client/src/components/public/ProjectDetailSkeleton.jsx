export default function ProjectDetailSkeleton() {
  return (
    <div className="project-detail-skeleton" aria-hidden>
      <div className="project-detail-hero-band">
        <div className="container py-3">
          <div className="skeleton-line skeleton-pill" style={{ width: 280, height: 18 }} />
        </div>
      </div>

      <div className="container py-4">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="panel-card mb-4">
              <div className="project-detail-skeleton-gallery skeleton-block" />
              <div className="d-flex gap-2 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="project-detail-skeleton-thumb skeleton-block" />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex gap-2 mb-3">
                <div className="skeleton-line skeleton-pill" style={{ width: 88, height: 28 }} />
                <div className="skeleton-line skeleton-pill" style={{ width: 120, height: 28 }} />
              </div>
              <div className="skeleton-line skeleton-line--title mb-3" style={{ height: 32, width: '70%' }} />
              <div className="skeleton-line skeleton-line--medium" />
            </div>

            <div className="row g-3 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="col-6 col-md-3" key={i}>
                  <div className="project-detail-skeleton-stat skeleton-block" />
                </div>
              ))}
            </div>

            <div className="panel-card mb-4">
              <div className="skeleton-line skeleton-line--short mb-3" style={{ height: 20, width: 180 }} />
              <div className="skeleton-line mb-2" />
              <div className="skeleton-line mb-2" />
              <div className="skeleton-line mb-2" />
              <div className="skeleton-line skeleton-line--medium" />
            </div>

            <div className="panel-card mb-4">
              <div className="skeleton-line skeleton-line--short mb-3" style={{ height: 20, width: 200 }} />
              <div className="row g-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="col-md-6" key={i}>
                    <div className="project-detail-skeleton-highlight skeleton-block" />
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card">
              <div className="skeleton-line skeleton-line--short mb-3" style={{ height: 20, width: 160 }} />
              <div className="row g-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="col-6 col-md-4" key={i}>
                    <div className="project-detail-skeleton-amenity skeleton-block" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="project-detail-sidebar">
              <div className="panel-card mb-3">
                <div className="skeleton-line mb-3" style={{ height: 36, width: '60%' }} />
                <div className="skeleton-line skeleton-line--short mb-3" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton-line mb-2" />
                ))}
                <div className="skeleton-line mt-3" style={{ height: 40 }} />
              </div>

              <div className="panel-card mb-3">
                <div className="skeleton-line skeleton-line--short mb-3" style={{ height: 18, width: '55%' }} />
                <div className="skeleton-line mb-2" style={{ height: 34 }} />
                <div className="skeleton-line mb-3" style={{ height: 88 }} />
                <div className="skeleton-line" style={{ height: 40 }} />
              </div>

              <div className="panel-card">
                <div className="project-detail-skeleton-builder-icon skeleton-block mx-auto mb-3" />
                <div className="skeleton-line skeleton-line--short mx-auto mb-2" />
                <div className="skeleton-line mx-auto" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
