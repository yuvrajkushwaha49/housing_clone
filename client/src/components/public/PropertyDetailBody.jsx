import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PropertyQualityBadge from '../properties/PropertyQualityBadge';
import {
  formatPlotAmenityLabel,
  formatPropertyPurpose,
  isPlotProperty,
} from '../properties/propertyUtils';
import { formatPriceCompact } from '../projects/projectUtils';
import { mediaUrl } from '../../services';

const SECTION_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'about', label: 'About' },
  { id: 'tour', label: 'Photos' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'contact-lister', label: 'Contact' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'faqs', label: 'FAQs about', useListingName: true },
  { id: 'report', label: 'Report' },
  { id: 'listing-summary', label: null, useListingName: true },
];

function OverviewFact({ icon, label, value, hint }) {
  return (
    <div className="pd-overview-fact">
      <div className="pd-overview-fact-icon">
        <i className={`bi ${icon}`} aria-hidden />
      </div>
      <div className="pd-overview-fact-body">
        <div className="pd-overview-fact-value">{value || '—'}</div>
        <div className="pd-overview-fact-label">
          {label}
          {hint}
        </div>
      </div>
    </div>
  );
}

function amenityIcon(amenity) {
  if (amenity.icon) return amenity.icon.startsWith('bi-') ? amenity.icon : `bi-${amenity.icon}`;
  const name = `${amenity.name || ''} ${amenity.category || ''}`.toLowerCase();
  if (/park|garden/.test(name)) return 'bi-tree';
  if (/gym|fitness/.test(name)) return 'bi-heart-pulse';
  if (/pool|swim/.test(name)) return 'bi-water';
  if (/lift|elevator/.test(name)) return 'bi-arrow-up-square';
  if (/security|cctv|guard/.test(name)) return 'bi-shield-check';
  if (/power|electric/.test(name)) return 'bi-lightning';
  if (/water/.test(name)) return 'bi-droplet';
  if (/parking/.test(name)) return 'bi-p-circle';
  return 'bi-check2-circle';
}

export default function PropertyDetailBody({
  property,
  images = [],
  reviews = { averageRating: 0, total: 0, items: [] },
  isOwnListing = false,
  onShare,
  onOpenGallery,
  onSave,
  onChat,
  onCompare,
  onInquiry,
  onVisit,
  onReview,
  chatBusy = false,
  compareBusy = false,
  reportReason,
  setReportReason,
  reportDetails,
  setReportDetails,
  onReport,
}) {
  const isPlot = isPlotProperty(property);
  const [activeTab, setActiveTab] = useState('overview');
  const [loan, setLoan] = useState({
    principal: property.price || 0,
    rate: 8.5,
    years: 20,
  });
  const tabsRef = useRef(null);
  const clickingRef = useRef(false);

  useEffect(() => {
    setLoan((prev) => ({ ...prev, principal: property.price || 0 }));
  }, [property.price, property.id]);

  useEffect(() => {
    const header = document.querySelector('.home-header');
    const tabsWrap = document.querySelector('.pd-section-tabs-wrap');

    const updateActiveTab = () => {
      if (clickingRef.current) return;
      const headerH = header?.offsetHeight || 72;
      const tabsH = tabsWrap?.offsetHeight || 52;
      const marker = headerH + tabsH + 24;
      let current = SECTION_TABS[0].id;
      SECTION_TABS.forEach((tab) => {
        const el = document.getElementById(tab.id);
        if (!el) return;
        if (el.getBoundingClientRect().top <= marker) current = tab.id;
      });
      setActiveTab((prev) => (prev === current ? prev : current));
    };

    updateActiveTab();
    window.addEventListener('scroll', updateActiveTab, { passive: true });
    window.addEventListener('resize', updateActiveTab);
    return () => {
      window.removeEventListener('scroll', updateActiveTab);
      window.removeEventListener('resize', updateActiveTab);
    };
  }, [property.id]);

  useEffect(() => {
    const activeBtn = tabsRef.current?.querySelector('.pd-section-tab.is-active');
    activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeTab]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    clickingRef.current = true;
    setActiveTab(id);
    const headerH = document.querySelector('.home-header')?.offsetHeight || 72;
    const tabsH = document.querySelector('.pd-section-tabs-wrap')?.offsetHeight || 52;
    const top = window.scrollY + el.getBoundingClientRect().top - headerH - tabsH - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    window.setTimeout(() => {
      clickingRef.current = false;
    }, 700);
  };

  const areaLabel = [property.area, property.areaUnit?.name].filter(Boolean).join(' ') || '—';
  const pricePerSqft = useMemo(() => {
    const price = Number(property.price);
    const area = Number(property.area);
    if (!price || !area) return null;
    const n = price / area;
    if (n >= 1000) {
      return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')} K/sq.ft`;
    }
    return `₹${Math.round(n).toLocaleString('en-IN')}/sq.ft`;
  }, [property.price, property.area]);

  const loanResult = useMemo(() => {
    const P = Number(loan.principal) || 0;
    const r = (Number(loan.rate) || 0) / 12 / 100;
    const n = (Number(loan.years) || 0) * 12;
    if (!P || !n) return { emi: 0, total: 0, interest: 0 };
    if (r === 0) {
      const emi = P / n;
      return { emi, total: P, interest: 0 };
    }
    const emi = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
    const total = emi * n;
    return { emi, total, interest: total - P };
  }, [loan]);

  const fmtMoney = (n) =>
    Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  const listingName = property.title || (isPlot ? 'Plot' : 'Property');
  const plotAmenityEntries = Object.entries(property.plotAmenities || {}).filter(([, v]) => v);
  const locationLine = [property.locality?.name, property.city?.name, property.state?.name]
    .filter(Boolean)
    .join(', ');

  const tabLabel = (tab) => {
    if (tab.id === 'faqs') return `FAQs about ${listingName}`;
    if (tab.id === 'listing-summary') return listingName;
    if (tab.id === 'amenities' && isPlot) return 'Plot amenities';
    return tab.label;
  };

  const faqs = [
    {
      q: `What is the price of ${listingName}?`,
      a: `${listingName} is priced at ${formatPriceCompact(property.price, null).replace(/^From\s+/, '')}.`,
    },
    {
      q: `Where is ${listingName} located?`,
      a: locationLine
        ? `${listingName} is located in ${locationLine}.`
        : 'Location details will be updated soon.',
    },
    {
      q: isPlot ? `What is the size of ${listingName}?` : `What is the configuration of ${listingName}?`,
      a: isPlot
        ? `${listingName} has a plot area of ${areaLabel}.`
        : property.bedrooms
          ? `${listingName} is a ${property.bedrooms} BHK ${property.propertyType?.name || 'property'} of ${areaLabel}.`
          : `Property type: ${property.propertyType?.name || '—'}; area ${areaLabel}.`,
    },
    {
      q: `Who listed ${listingName}?`,
      a: property.listedBy?.name
        ? `${listingName} is listed by ${property.listedBy.name}${property.listedByType ? ` (${String(property.listedByType).replace(/_/g, ' ')})` : ''}.`
        : 'Lister details are available on request.',
    },
  ];

  return (
    <div className="pd-body">
      <div className="pd-section-tabs-wrap">
        <div className="container">
          <div className="pd-section-tabs" ref={tabsRef}>
            {SECTION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`pd-section-tab${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => scrollToSection(tab.id)}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container pd-body-grid">
        <div className="pd-main">
          <section id="overview" className="pd-card">
            <h2 className="pd-card-title">{listingName} Overview</h2>
            <div className="pd-overview-grid">
              <OverviewFact
                icon="bi-house-door"
                label="Property type"
                value={property.propertyType?.name || (isPlot ? 'Plot' : '—')}
              />
              <OverviewFact icon="bi-rulers" label={isPlot ? 'Plot area' : 'Built-up area'} value={areaLabel} />
              <OverviewFact
                icon="bi-tag"
                label="Purpose"
                value={formatPropertyPurpose(property.purpose)}
              />
              <OverviewFact
                icon="bi-currency-rupee"
                label="Price"
                value={formatPriceCompact(property.price, null).replace(/^From\s+/, '')}
              />
              {pricePerSqft && (
                <OverviewFact icon="bi-calculator" label="Avg. Price" value={pricePerSqft} />
              )}
              {!isPlot && (
                <OverviewFact
                  icon="bi-door-open"
                  label="Beds / Baths"
                  value={`${property.bedrooms ?? '—'} / ${property.bathrooms ?? '—'}`}
                />
              )}
              {property.facing?.name && (
                <OverviewFact icon="bi-compass" label="Facing" value={property.facing.name} />
              )}
              {property.ownership?.name && (
                <OverviewFact icon="bi-person-vcard" label="Ownership" value={property.ownership.name} />
              )}
              {property.furnishing?.name && (
                <OverviewFact icon="bi-lamp" label="Furnishing" value={property.furnishing.name} />
              )}
              <OverviewFact icon="bi-eye" label="Views" value={property.viewsCount ?? '—'} />
              {property.reviewAverageRating != null && (
                <OverviewFact
                  icon="bi-star"
                  label="Quality rating"
                  value={`${Number(property.reviewAverageRating).toFixed(1)} / 10`}
                />
              )}
            </div>
            <div className="pd-overview-actions">
              <button type="button" className="pd-soft-btn" onClick={onShare}>
                <i className="bi bi-share" aria-hidden />
                Share
              </button>
              <button type="button" className="pd-soft-btn" onClick={onSave}>
                <i className="bi bi-heart" aria-hidden />
                Save
              </button>
              <button type="button" className="pd-soft-btn" disabled={compareBusy} onClick={onCompare}>
                <i className="bi bi-layout-three-columns" aria-hidden />
                Compare
              </button>
              {!isOwnListing && (
                <button type="button" className="pd-primary-btn" disabled={chatBusy} onClick={onChat}>
                  <i className="bi bi-chat-dots" aria-hidden />
                  Chat with lister
                </button>
              )}
            </div>
          </section>

          <section id="about" className="pd-card">
            <h2 className="pd-card-title">More About {listingName}</h2>
            {property.description ? (
              <p className="pd-about-text" style={{ whiteSpace: 'pre-wrap' }}>{property.description}</p>
            ) : (
              <p className="text-secondary mb-0">No description provided yet.</p>
            )}
            {locationLine && (
              <p className="pd-about-location mt-3 mb-0">
                <i className="bi bi-geo-alt me-1" aria-hidden />
                {locationLine}
                {property.addressLine ? ` · ${property.addressLine}` : ''}
              </p>
            )}
          </section>

          <section id="tour" className="pd-card">
            <h2 className="pd-card-title">Tour {listingName}</h2>
            {images.length === 0 ? (
              <p className="text-secondary mb-0">No photos uploaded yet.</p>
            ) : (
              <div className="pd-tour-grid">
                {images.map((img, index) => (
                  <button
                    key={img.id || index}
                    type="button"
                    className="pd-tour-tile"
                    onClick={() => onOpenGallery?.(index)}
                  >
                    <img src={mediaUrl(img.url)} alt={img.caption || ''} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section id="amenities" className="pd-card">
            <h2 className="pd-card-title">{isPlot ? `${listingName} Amenities` : 'Amenities'}</h2>
            {isPlot ? (
              plotAmenityEntries.length > 0 ? (
                <div className="pd-overview-grid">
                  {plotAmenityEntries.map(([key, value]) => (
                    <OverviewFact
                      key={key}
                      icon="bi-check2-circle"
                      label={formatPlotAmenityLabel(key)}
                      value={value}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-secondary mb-0">No plot amenities listed.</p>
              )
            ) : property.amenities?.length ? (
              <div className="pd-amenity-grid">
                {property.amenities.map((a) => (
                  <div key={a.id} className="pd-amenity-item">
                    <i className={`bi ${amenityIcon(a)}`} aria-hidden />
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary mb-0">No amenities listed.</p>
            )}
          </section>

          <section id="contact-lister" className="pd-card">
            <h2 className="pd-card-title">Contact Sellers</h2>
            {isOwnListing ? (
              <p className="text-secondary mb-0">This is your listing.</p>
            ) : (
              <>
                <p className="text-secondary">
                  Please share your contact to get seller details for {listingName}.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="pd-primary-btn" onClick={onInquiry}>
                    <i className="bi bi-envelope" aria-hidden />
                    Send inquiry
                  </button>
                  <button type="button" className="pd-soft-btn" onClick={onVisit}>
                    <i className="bi bi-calendar-check" aria-hidden />
                    Book site visit
                  </button>
                  <button type="button" className="pd-soft-btn" disabled={chatBusy} onClick={onChat}>
                    <i className="bi bi-chat-dots" aria-hidden />
                    Chat
                  </button>
                </div>
              </>
            )}
          </section>

          <section id="reviews" className="pd-card">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h2 className="pd-card-title mb-1">Ratings and Reviews</h2>
                <span className="small text-secondary">
                  {reviews.averageRating ? `${reviews.averageRating} ★` : 'No ratings'} · {reviews.total} approved
                </span>
              </div>
              {!isOwnListing && (
                <button type="button" className="pd-soft-btn" onClick={onReview}>
                  <i className="bi bi-pencil-square" aria-hidden />
                  Write a review
                </button>
              )}
            </div>
            {reviews.items.map((r) => (
              <div key={r.id} className="border-bottom py-3">
                <div className="d-flex justify-content-between">
                  <strong>{r.user?.name}</strong>
                  <span className="text-warning small">{'★'.repeat(r.rating)}</span>
                </div>
                {r.title && <div className="fw-semibold">{r.title}</div>}
                <p className="mb-0 small">{r.body}</p>
              </div>
            ))}
            {!reviews.items.length && (
              <div className="text-secondary small">
                No ratings yet. Be the first to rate {listingName}.
              </div>
            )}
          </section>

          <section id="calculator" className="pd-card">
            <h2 className="pd-card-title">EMI Calculator</h2>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small">Loan amount (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={loan.principal}
                  onChange={(e) => setLoan({ ...loan, principal: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Interest rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={loan.rate}
                  onChange={(e) => setLoan({ ...loan, rate: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Tenure (years)</label>
                <input
                  type="number"
                  className="form-control"
                  value={loan.years}
                  onChange={(e) => setLoan({ ...loan, years: e.target.value })}
                />
              </div>
            </div>
            <div className="pd-overview-grid mt-3">
              <OverviewFact icon="bi-cash-stack" label="Monthly EMI" value={fmtMoney(loanResult.emi)} />
              <OverviewFact icon="bi-wallet2" label="Total interest" value={fmtMoney(loanResult.interest)} />
              <OverviewFact icon="bi-receipt" label="Total payment" value={fmtMoney(loanResult.total)} />
            </div>
          </section>

          <section id="faqs" className="pd-card">
            <h2 className="pd-card-title">FAQs about {listingName}</h2>
            <div className="pd-faq-list">
              {faqs.map((item) => (
                <details key={item.q} className="pd-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="listing-summary" className="pd-card">
            <h2 className="pd-card-title">{listingName}</h2>
            <p className="pd-about-text mb-0">
              {listingName}
              {locationLine ? ` in ${locationLine}` : ''}
              {property.price != null
                ? ` is listed at ${formatPriceCompact(property.price, null).replace(/^From\s+/, '')}`
                : ''}
              {areaLabel !== '—' ? ` with an area of ${areaLabel}` : ''}.
            </p>
          </section>

          <section id="report" className="pd-card">
            <h2 className="pd-card-title">Report {listingName}</h2>
            <form onSubmit={onReport} className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label small">Reason</label>
                <select
                  className="form-select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="spam">Spam</option>
                  <option value="fraud">Fraud</option>
                  <option value="incorrect">Incorrect info</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="offensive">Offensive</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label small">Details (optional)</label>
                <input
                  className="form-control"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Add more details"
                />
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-outline-danger w-100">Submit report</button>
              </div>
            </form>
          </section>
        </div>

        <aside className="pd-sidebar">
          <div className="pd-choice-banner">
            <strong>Great choice!</strong>
            <span>Contact the lister for the latest availability on {listingName}.</span>
          </div>

          {!isOwnListing && (
            <div className="pd-contact-card">
              <h3 className="pd-contact-title">Contact Sellers</h3>
              <div className="pd-contact-kicker mb-1">Listing</div>
              <div className="pd-contact-project mb-3">{listingName}</div>
              {property.listedBy?.name && (
                <div className="pd-contact-lister mb-3">
                  <div className="pd-contact-avatar" aria-hidden>
                    {property.listedBy.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="fw-semibold">{property.listedBy.name}</div>
                    <div className="small text-secondary text-capitalize">
                      {String(property.listedByType || 'lister').replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              )}
              {property.reviewAverageRating != null && (
                <div className="d-flex align-items-center gap-2 mb-3">
                  <PropertyQualityBadge rating={property.reviewAverageRating} />
                  <span className="small text-secondary">Admin verified quality</span>
                </div>
              )}
              <div className="d-grid gap-2">
                <button type="button" className="pd-primary-btn w-100 justify-content-center" onClick={onInquiry}>
                  <i className="bi bi-telephone-fill" aria-hidden />
                  Contact Sellers
                </button>
                <button type="button" className="pd-soft-btn w-100 justify-content-center" onClick={onVisit}>
                  <i className="bi bi-calendar-check" aria-hidden />
                  Book site visit
                </button>
                <button
                  type="button"
                  className="pd-soft-btn w-100 justify-content-center"
                  disabled={chatBusy}
                  onClick={onChat}
                >
                  <i className="bi bi-chat-dots" aria-hidden />
                  Chat
                </button>
              </div>
            </div>
          )}

          <div className="pd-shortlist-card">
            <button type="button" className="pd-soft-btn w-100 justify-content-center" onClick={onSave}>
              <i className="bi bi-heart" aria-hidden />
              Shortlist {listingName}
            </button>
            <button
              type="button"
              className="pd-soft-btn w-100 justify-content-center mt-2"
              disabled={compareBusy}
              onClick={onCompare}
            >
              <i className="bi bi-layout-three-columns" aria-hidden />
              Add to compare
            </button>
          </div>

          <div className="pd-sidebar-share">
            <button type="button" className="pd-soft-btn w-100 justify-content-center" onClick={onShare}>
              <i className="bi bi-share" aria-hidden />
              Share listing
            </button>
            <Link to="/search" className="pd-inline-link d-inline-block mt-2">
              ← Back to search
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
