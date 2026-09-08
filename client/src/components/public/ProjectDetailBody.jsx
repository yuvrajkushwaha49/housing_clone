import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  formatPriceCompact,
  formatProjectDate,
  formatShortLocation,
} from '../projects/projectUtils';
import { cmsService, leadService, mediaUrl, projectService } from '../../services';
import { PANEL_HOME } from '../../constants';
import { useToast } from '../../hooks/useToast';
import { useSaveProject } from '../../hooks/useSaveItem';
import ProjectCard from './ProjectCard';

const SECTION_TABS = [
  { id: 'overview', label: 'Overview/Home' },
  { id: 'around', label: 'Around This Project' },
  { id: 'about', label: 'More About Project' },
  { id: 'floor-plans', label: 'Floor Plans and Pricing', useProjectName: true },
  { id: 'tour', label: 'Tour This Project' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'contact-sellers', label: 'Contact Sellers' },
  { id: 'reviews', label: 'Ratings and Reviews' },
  { id: 'price-trends', label: 'Price Trends' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'locality', label: 'Locality' },
  { id: 'compare', label: 'Compare Properties' },
  { id: 'qa', label: 'Q&A' },
  { id: 'faqs', label: 'FAQs about', useProjectName: true },
  { id: 'similar', label: 'Similar Projects' },
  { id: 'news', label: 'News' },
  { id: 'project-summary', label: null, useProjectName: true },
];

function amenityIcon(amenity) {
  if (amenity.icon) return amenity.icon.startsWith('bi-') ? amenity.icon : `bi-${amenity.icon}`;
  const name = `${amenity.name || ''} ${amenity.category || ''}`.toLowerCase();
  if (/school|education/.test(name)) return 'bi-mortarboard';
  if (/hospital|clinic|health/.test(name)) return 'bi-hospital';
  if (/metro|train|rail/.test(name)) return 'bi-train-front';
  if (/bus/.test(name)) return 'bi-bus-front';
  if (/mall|market|shop/.test(name)) return 'bi-shop';
  if (/park|garden/.test(name)) return 'bi-tree';
  if (/airport/.test(name)) return 'bi-airplane';
  if (/gym|fitness/.test(name)) return 'bi-heart-pulse';
  if (/pool|swim/.test(name)) return 'bi-water';
  return 'bi-geo-alt';
}

function formatPossessionStatus(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  if (d <= new Date()) return 'Ready to Move';
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function formatAreaRange(units) {
  const areas = units.map((u) => Number(u.area)).filter((n) => !Number.isNaN(n) && n > 0);
  if (!areas.length) return '—';
  const min = Math.min(...areas);
  const max = Math.max(...areas);
  const unit = units.find((u) => u.area != null)?.areaUnit?.name || 'sq.ft';
  if (min === max) return `${min} ${unit}`;
  return `${min} - ${max} ${unit}`;
}

function formatConfigLabel(units) {
  const beds = [...new Set(units.map((u) => u.bedrooms).filter((b) => b != null && b !== ''))]
    .sort((a, b) => Number(a) - Number(b));
  if (beds.length) return `${beds.join(', ')} BHK`;
  const types = [...new Set(units.map((u) => u.unitType).filter(Boolean))];
  return types.length ? types.slice(0, 4).join(', ') : '—';
}

function formatAvgPricePerSqft(units) {
  const rates = units
    .map((u) => {
      const price = Number(u.price);
      const area = Number(u.area);
      if (!price || !area) return null;
      return price / area;
    })
    .filter((n) => n != null && !Number.isNaN(n));
  if (!rates.length) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const fmt = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')} K`;
    return Math.round(n).toLocaleString('en-IN');
  };
  if (Math.round(min) === Math.round(max)) return `₹${fmt(min)}/sq.ft`;
  return `₹${fmt(min)} - ₹${fmt(max)}/sq.ft`;
}

function groupFloorPlans(units) {
  const map = new Map();
  units.forEach((unit) => {
    const key = unit.bedrooms != null
      ? `${unit.bedrooms} BHK`
      : (unit.unitType || 'Other');
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key,
        bedrooms: unit.bedrooms,
        units: [],
        minPrice: null,
        maxPrice: null,
      });
    }
    const group = map.get(key);
    group.units.push(unit);
    if (unit.price != null) {
      group.minPrice = group.minPrice == null ? unit.price : Math.min(group.minPrice, unit.price);
      group.maxPrice = group.maxPrice == null ? unit.price : Math.max(group.maxPrice, unit.price);
    }
  });

  return [...map.values()].sort((a, b) => {
    if (a.bedrooms != null && b.bedrooms != null) return Number(a.bedrooms) - Number(b.bedrooms);
    return a.label.localeCompare(b.label);
  });
}

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

export default function ProjectDetailBody({ project, images = [], onShare, onOpenGallery }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { accessToken, user } = useSelector((s) => s.auth);
  const saveProject = useSaveProject();
  const aroundRef = useRef(null);
  const tabsRef = useRef(null);
  const clickingRef = useRef(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [activePlanKey, setActivePlanKey] = useState('');
  const [activeArea, setActiveArea] = useState(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [agreeContact, setAgreeContact] = useState(true);
  const [interestedLoan, setInterestedLoan] = useState(false);
  const [contact, setContact] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [similarProjects, setSimilarProjects] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [loan, setLoan] = useState({
    principal: project.minPrice || 5000000,
    rate: 8.5,
    years: 20,
  });

  const units = project.units || [];
  const amenities = project.amenities || [];
  const shortLocation = formatShortLocation(project);
  const floorPlans = useMemo(() => groupFloorPlans(units), [units]);
  const avgPrice = formatAvgPricePerSqft(units);
  const sizeRange = formatAreaRange(units);
  const configLabel = formatConfigLabel(units);
  const possessionStatus = formatPossessionStatus(project.possessionDate);
  const areaUnit = units.find((u) => u.areaUnit?.name)?.areaUnit?.name || 'sq.ft';
  const mapHref = project.latitude && project.longitude
    ? `https://www.google.com/maps?q=${project.latitude},${project.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shortLocation)}`;

  useEffect(() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    setContact({
      name: fullName || user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
  }, [user]);

  useEffect(() => {
    if (project.minPrice) {
      setLoan((prev) => ({ ...prev, principal: project.minPrice }));
    }
  }, [project.minPrice]);

  useEffect(() => {
    const cityId = project.city?.id;
    projectService
      .list({ limit: 5, cityId: cityId || undefined })
      .then((res) => setSimilarProjects((res.data.data || []).filter((p) => p.id !== project.id).slice(0, 4)))
      .catch(() => setSimilarProjects([]));

    cmsService
      .listBlogs({ limit: 3 })
      .then((res) => setNewsItems(res.data.data || []))
      .catch(() => setNewsItems([]));
  }, [project.id, project.city?.id]);

  useEffect(() => {
    if (!floorPlans.length) {
      setActivePlanKey('');
      setActiveArea(null);
      return;
    }
    const first = floorPlans[0];
    setActivePlanKey(first.key);
    const firstArea = first.units.find((u) => u.area != null)?.area ?? null;
    setActiveArea(firstArea);
  }, [floorPlans]);

  const activePlan = floorPlans.find((p) => p.key === activePlanKey) || floorPlans[0];
  const planAreas = useMemo(() => {
    if (!activePlan) return [];
    return [...new Set(activePlan.units.map((u) => u.area).filter((a) => a != null))].sort((a, b) => a - b);
  }, [activePlan]);

  const selectedUnit = useMemo(() => {
    if (!activePlan) return null;
    if (activeArea != null) {
      return activePlan.units.find((u) => Number(u.area) === Number(activeArea)) || activePlan.units[0];
    }
    return activePlan.units[0];
  }, [activePlan, activeArea]);

  const selectedPrice = selectedUnit?.price != null
    ? formatPriceCompact(selectedUnit.price, null).replace(/^From\s+/, '')
    : formatPriceCompact(activePlan?.minPrice, activePlan?.maxPrice);

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
  }, [project.id]);

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

  const scrollAround = (dir) => {
    aroundRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  const submitContact = async (e) => {
    e.preventDefault();
    if (!agreeContact) {
      toast.info('Please agree to be contacted');
      return;
    }
    if (!contact.name.trim() || !contact.phone.trim() || !contact.email.trim()) {
      toast.info('Please fill name, phone, and email');
      return;
    }
    if (!accessToken) {
      toast.info('Please sign in to contact sellers');
      navigate('/login');
      return;
    }

    setContactBusy(true);
    try {
      await leadService.createContact({
        projectId: project.id,
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim(),
        interestedLoan: Boolean(interestedLoan),
        unitLabel: selectedUnit
          ? [selectedUnit.unitType, selectedUnit.bedrooms != null ? `${selectedUnit.bedrooms} BHK` : null]
              .filter(Boolean)
              .join(' · ') || undefined
          : undefined,
        message: `Contact request for ${project.name}`,
      });
      toast.success('Request sent. Sellers will contact you soon.');
      if (user?.role?.code === 'BUYER') {
        navigate(`${PANEL_HOME.BUYER.replace('/dashboard', '')}/leads`);
      }
    } catch (err) {
      toast.apiError(err, 'Could not send request');
    } finally {
      setContactBusy(false);
    }
  };

  const builderInitial = (project.builder?.companyName || 'P').charAt(0).toUpperCase();
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
  const tabLabel = (tab) => {
    if (tab.id === 'floor-plans') return `${project.name} Floor Plans and Pricing`;
    if (tab.id === 'faqs') return `FAQs about ${project.name}`;
    if (tab.id === 'project-summary') return project.name;
    return tab.label;
  };
  const faqs = [
    {
      q: `What is the price range of ${project.name}?`,
      a: `Units at ${project.name} are listed from ${formatPriceCompact(project.minPrice, project.maxPrice)}.`,
    },
    {
      q: `Where is ${project.name} located?`,
      a: `${project.name} is located in ${shortLocation}.`,
    },
    {
      q: `What configurations are available in ${project.name}?`,
      a: configLabel !== '—'
        ? `${project.name} offers ${configLabel} configurations.`
        : `Configuration details for ${project.name} will be updated soon.`,
    },
    {
      q: `What is the possession status of ${project.name}?`,
      a: `Current possession status is ${possessionStatus}.`,
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
            <h2 className="pd-card-title">{project.name} Overview</h2>
            <div className="pd-overview-grid">
              <OverviewFact
                icon="bi-buildings"
                label="Project Units"
                value={project.inventory?.total ?? units.length ?? '—'}
              />
              <OverviewFact icon="bi-rulers" label="Area Unit" value={areaUnit} />
              <OverviewFact
                icon="bi-currency-rupee"
                label="Formatted per unit price"
                value={avgPrice || '—'}
              />
              <OverviewFact icon="bi-aspect-ratio" label="Sizes" value={sizeRange} />
              <OverviewFact
                icon="bi-calendar3"
                label="Launch Date"
                value={formatProjectDate(project.launchDate)}
              />
              <OverviewFact icon="bi-cash-coin" label="Avg. Price" value={avgPrice || '—'} />
              <OverviewFact icon="bi-door-open" label="Possession Status" value={possessionStatus} />
              <OverviewFact icon="bi-grid-3x3-gap" label="Configurations" value={configLabel} />
              <OverviewFact
                icon="bi-shield-check"
                label="Rera Id"
                value={project.reraId || 'Rera Not Applicable'}
                hint={project.reraId ? null : (
                  <a href="#about" className="pd-inline-link ms-1">Know More</a>
                )}
              />
            </div>
            <div className="pd-overview-actions">
              <button type="button" className="pd-soft-btn" onClick={onShare}>
                <i className="bi bi-share" aria-hidden />
                Share
              </button>
              <button
                type="button"
                className="pd-soft-btn"
                onClick={(e) => saveProject(e, project.id)}
              >
                <i className="bi bi-heart" aria-hidden />
                Save
              </button>
              <a href="#contact-sellers" className="pd-primary-btn">
                Ask For Details
              </a>
            </div>
          </section>

          <section id="around" className="pd-card">
            <div className="pd-location-head">
              <h2>Property Location</h2>
              <a href={mapHref} target="_blank" rel="noreferrer" className="pd-location-link">
                <i className="bi bi-geo-alt-fill" aria-hidden />
                {shortLocation}
              </a>
            </div>

            <h3 className="pd-card-subtitle">Around This Project</h3>
            {amenities.length > 0 ? (
              <div className="pd-around-wrap">
                <div className="pd-around-track" ref={aroundRef}>
                  {amenities.map((amenity) => (
                    <article key={amenity.id} className="pd-around-card">
                      <div className="pd-around-icon">
                        {amenity.imageUrl ? (
                          <img src={mediaUrl(amenity.imageUrl)} alt="" />
                        ) : (
                          <i className={`bi ${amenityIcon(amenity)}`} aria-hidden />
                        )}
                      </div>
                      <div>
                        <div className="pd-around-type">{amenity.category || 'Amenity'}</div>
                        <div className="pd-around-name">{amenity.name}</div>
                      </div>
                    </article>
                  ))}
                </div>
                {amenities.length > 2 && (
                  <button
                    type="button"
                    className="pd-around-next"
                    onClick={() => scrollAround(1)}
                    aria-label="Scroll amenities"
                  >
                    <i className="bi bi-chevron-right" aria-hidden />
                  </button>
                )}
              </div>
            ) : (
              <p className="pd-empty-note">Nearby places will appear here when added for this project.</p>
            )}
            <div className="pd-card-footer">
              <a href={mapHref} target="_blank" rel="noreferrer" className="pd-text-link">
                View more on Maps
              </a>
            </div>
          </section>

          <section id="about" className="pd-card">
            <h2 className="pd-card-title">More About {project.name}</h2>
            {project.description ? (
              <p className="pd-about-text">{project.description}</p>
            ) : (
              <p className="pd-empty-note">Project description coming soon.</p>
            )}
            {project.brochureUrl && (
              <a
                className="pd-text-link"
                href={mediaUrl(project.brochureUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Download brochure
              </a>
            )}
          </section>

          <section id="floor-plans" className="pd-card">
            <h2 className="pd-card-title">{project.name} Floor Plans and Pricing</h2>
            {floorPlans.length > 0 ? (
              <>
                <div className="pd-plan-tabs">
                  {floorPlans.map((plan) => (
                    <button
                      key={plan.key}
                      type="button"
                      className={`pd-plan-tab${activePlanKey === plan.key ? ' is-active' : ''}`}
                      onClick={() => {
                        setActivePlanKey(plan.key);
                        const firstArea = plan.units.find((u) => u.area != null)?.area ?? null;
                        setActiveArea(firstArea);
                      }}
                    >
                      <span className="pd-plan-tab-label">{plan.label}</span>
                      <span className="pd-plan-tab-price">
                        {formatPriceCompact(plan.minPrice, plan.maxPrice)}
                      </span>
                    </button>
                  ))}
                </div>

                {planAreas.length > 0 && (
                  <div className="pd-plan-sizes">
                    {planAreas.map((area) => (
                      <button
                        key={area}
                        type="button"
                        className={`pd-plan-size${Number(activeArea) === Number(area) ? ' is-active' : ''}`}
                        onClick={() => setActiveArea(area)}
                      >
                        {area} SQ.FT
                      </button>
                    ))}
                  </div>
                )}

                <div className="pd-plan-price-row">
                  <span className="pd-plan-price">{selectedPrice}</span>
                  <i className="bi bi-info-circle" aria-hidden title="All inclusive price" />
                </div>

                {selectedUnit && (
                  <div className="pd-plan-meta">
                    {[
                      selectedUnit.unitType,
                      selectedUnit.bedrooms != null ? `${selectedUnit.bedrooms} BHK` : null,
                      selectedUnit.bathrooms != null ? `${selectedUnit.bathrooms} Bath` : null,
                      selectedUnit.tower?.name,
                    ].filter(Boolean).join(' · ') || 'Configuration details'}
                  </div>
                )}
              </>
            ) : (
              <p className="pd-empty-note">Floor plans will appear once unit inventory is added.</p>
            )}
          </section>

          <section id="tour" className="pd-card">
            <h2 className="pd-card-title">Tour This Project</h2>
            {images.length > 0 ? (
              <div className="pd-tour-grid">
                {images.slice(0, 6).map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    className="pd-tour-tile"
                    onClick={() => onOpenGallery?.(index)}
                  >
                    <img src={mediaUrl(img.url)} alt={img.caption || ''} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="pd-empty-note">Gallery images will appear here.</p>
            )}
          </section>

          <section id="amenities" className="pd-card">
            <h2 className="pd-card-title">Amenities</h2>
            {amenities.length > 0 ? (
              <div className="pd-amenity-grid">
                {amenities.map((amenity) => (
                  <div key={amenity.id} className="pd-amenity-item">
                    <span className="pd-amenity-icon">
                      {amenity.imageUrl ? (
                        <img src={mediaUrl(amenity.imageUrl)} alt="" />
                      ) : (
                        <i className={`bi ${amenityIcon(amenity)}`} aria-hidden />
                      )}
                    </span>
                    <div>
                      <div className="pd-around-name">{amenity.name}</div>
                      {amenity.category && <div className="pd-around-type">{amenity.category}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pd-empty-note">Amenities will appear here when added for this project.</p>
            )}
          </section>

          <section id="contact-sellers" className="pd-card">
            <h2 className="pd-card-title">Contact Sellers</h2>
            <form className="pd-inline-contact" onSubmit={submitContact}>
              <p className="pd-contact-prompt">Please share your contact to get seller details for {project.name}.</p>
              <div className="pd-inline-contact-grid">
                <label className="pd-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Name"
                    required
                  />
                </label>
                <label className="pd-field">
                  <span>Phone</span>
                  <div className="pd-phone-row">
                    <span className="pd-phone-code">+91</span>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="Phone"
                      required
                    />
                  </div>
                </label>
                <label className="pd-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email"
                    required
                  />
                </label>
              </div>
              <label className="pd-check">
                <input
                  type="checkbox"
                  checked={agreeContact}
                  onChange={(e) => setAgreeContact(e.target.checked)}
                />
                <span>I agree to be contacted by Workians and agents via WhatsApp, SMS, phone, email etc</span>
              </label>
              <button type="submit" className="pd-primary-btn pd-primary-btn--block" disabled={contactBusy}>
                {contactBusy ? 'Submitting…' : 'Get Contact Details'}
              </button>
              {!accessToken && (
                <p className="pd-contact-login">
                  <Link to="/login">Sign in</Link> to send your request to sellers.
                </p>
              )}
            </form>
          </section>

          <section id="reviews" className="pd-card">
            <h2 className="pd-card-title">Ratings and Reviews</h2>
            <p className="pd-empty-note">No ratings yet. Be the first to rate {project.name}.</p>
            <button type="button" className="pd-soft-btn" onClick={() => scrollToSection('contact-sellers')}>
              Become the first to Rate
            </button>
          </section>

          <section id="price-trends" className="pd-card">
            <h2 className="pd-card-title">Price Trends</h2>
            <div className="pd-trend-row">
              <div>
                <div className="pd-overview-fact-label">Current price range</div>
                <div className="pd-plan-price">{formatPriceCompact(project.minPrice, project.maxPrice)}</div>
              </div>
              <div>
                <div className="pd-overview-fact-label">Avg. price</div>
                <div className="pd-around-name">{avgPrice || '—'}</div>
              </div>
            </div>
            <p className="pd-empty-note mt-3 mb-0">
              Historical price trend data will appear here as more transactions are recorded.
            </p>
          </section>

          <section id="brochure" className="pd-card">
            <h2 className="pd-card-title">Brochure</h2>
            {project.brochureUrl ? (
              <a
                className="pd-primary-btn"
                href={mediaUrl(project.brochureUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Download brochure
              </a>
            ) : (
              <p className="pd-empty-note">Brochure is not uploaded for this project yet.</p>
            )}
          </section>

          <section id="calculator" className="pd-card">
            <h2 className="pd-card-title">Calculator</h2>
            <div className="pd-calc-grid">
              <label className="pd-field">
                <span>Loan amount (₹)</span>
                <input
                  type="number"
                  value={loan.principal}
                  onChange={(e) => setLoan((l) => ({ ...l, principal: e.target.value }))}
                />
              </label>
              <label className="pd-field">
                <span>Interest rate (% p.a.)</span>
                <input
                  type="number"
                  step="0.1"
                  value={loan.rate}
                  onChange={(e) => setLoan((l) => ({ ...l, rate: e.target.value }))}
                />
              </label>
              <label className="pd-field">
                <span>Tenure (years)</span>
                <input
                  type="number"
                  value={loan.years}
                  onChange={(e) => setLoan((l) => ({ ...l, years: e.target.value }))}
                />
              </label>
            </div>
            <div className="pd-calc-result">
              <div><span>EMI</span><strong>{fmtMoney(loanResult.emi)}</strong></div>
              <div><span>Total interest</span><strong>{fmtMoney(loanResult.interest)}</strong></div>
              <div><span>Total payable</span><strong>{fmtMoney(loanResult.total)}</strong></div>
            </div>
          </section>

          <section id="locality" className="pd-card">
            <h2 className="pd-card-title">Locality</h2>
            <p className="pd-about-text mb-2">{shortLocation}</p>
            {project.addressLine && <p className="pd-empty-note">{project.addressLine}</p>}
            <a href={mapHref} target="_blank" rel="noreferrer" className="pd-text-link">
              View locality on Maps
            </a>
          </section>

          <section id="compare" className="pd-card">
            <h2 className="pd-card-title">Compare Properties</h2>
            <p className="pd-empty-note mb-3">
              Shortlist similar homes and compare price, size, and amenities side by side.
            </p>
            <Link to="/panel/buyer/compare" className="pd-soft-btn text-decoration-none">
              Open compare
            </Link>
          </section>

          <section id="qa" className="pd-card">
            <h2 className="pd-card-title">Q&amp;A</h2>
            <p className="pd-empty-note mb-3">Have a question about {project.name}? Ask sellers directly.</p>
            <button type="button" className="pd-soft-btn" onClick={() => scrollToSection('contact-sellers')}>
              Ask a question
            </button>
          </section>

          <section id="faqs" className="pd-card">
            <h2 className="pd-card-title">FAQs about {project.name}</h2>
            <div className="pd-faq-list">
              {faqs.map((item) => (
                <details key={item.q} className="pd-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="similar" className="pd-card">
            <h2 className="pd-card-title">Similar Projects</h2>
            {similarProjects.length > 0 ? (
              <div className="home-project-grid pd-similar-grid">
                {similarProjects.map((item) => (
                  <ProjectCard key={item.id} project={item} />
                ))}
              </div>
            ) : (
              <p className="pd-empty-note">Similar projects in this area will appear here.</p>
            )}
          </section>

          <section id="news" className="pd-card">
            <h2 className="pd-card-title">News</h2>
            {newsItems.length > 0 ? (
              <div className="pd-news-list">
                {newsItems.map((item) => (
                  <Link key={item.id} to={`/blog/${item.slug}`} className="pd-news-item">
                    <strong>{item.title}</strong>
                    {item.excerpt && <span>{item.excerpt}</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="pd-empty-note">No news articles yet.</p>
            )}
            <Link to="/blog" className="pd-text-link d-inline-block mt-3">View all news</Link>
          </section>

          <section id="project-summary" className="pd-card">
            <h2 className="pd-card-title">{project.name}</h2>
            <p className="pd-about-text mb-2">
              {project.name}
              {project.builder?.companyName ? ` by ${project.builder.companyName}` : ''}
              {shortLocation !== '—' ? ` in ${shortLocation}` : ''}.
            </p>
            <div className="pd-trend-row">
              <div>
                <div className="pd-overview-fact-label">Price</div>
                <div className="pd-around-name">{formatPriceCompact(project.minPrice, project.maxPrice)}</div>
              </div>
              <div>
                <div className="pd-overview-fact-label">Configurations</div>
                <div className="pd-around-name">{configLabel}</div>
              </div>
              <div>
                <div className="pd-overview-fact-label">Possession</div>
                <div className="pd-around-name">{possessionStatus}</div>
              </div>
            </div>
          </section>
        </div>

        <aside className="pd-sidebar">
          <div className="pd-choice-banner">
            <i className="bi bi-lightning-charge-fill" aria-hidden />
            Great choice! Most liked project in this area
          </div>

          <form className="pd-contact-card" onSubmit={submitContact}>
            <div className="pd-contact-head">
              <span className="pd-builder-mark" aria-hidden>{builderInitial}</span>
              <div>
                <div className="pd-contact-kicker">Contact Sellers in</div>
                <div className="pd-contact-project">{project.name}</div>
              </div>
            </div>
            <p className="pd-contact-prompt">Please share your contact</p>

            <label className="pd-field">
              <span>Name</span>
              <input
                type="text"
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                placeholder="Name"
                required
              />
            </label>
            <label className="pd-field">
              <span>Phone</span>
              <div className="pd-phone-row">
                <span className="pd-phone-code">+91</span>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="Phone"
                  required
                />
              </div>
            </label>
            <label className="pd-field">
              <span>Email</span>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                placeholder="Email"
                required
              />
            </label>

            <label className="pd-check">
              <input
                type="checkbox"
                checked={agreeContact}
                onChange={(e) => setAgreeContact(e.target.checked)}
              />
              <span>I agree to be contacted by Workians and agents via WhatsApp, SMS, phone, email etc</span>
            </label>
            <label className="pd-check">
              <input
                type="checkbox"
                checked={interestedLoan}
                onChange={(e) => setInterestedLoan(e.target.checked)}
              />
              <span>I am interested in Home Loans</span>
            </label>

            <button type="submit" className="pd-contact-submit" disabled={contactBusy}>
              {contactBusy ? 'Submitting…' : 'Get Contact Details'}
            </button>
            {!accessToken && (
              <p className="pd-contact-login">
                <Link to="/login">Sign in</Link> to send your request to sellers.
              </p>
            )}
          </form>

          <div className="pd-shortlist-card">
            <div className="pd-shortlist-icon">
              <i className="bi bi-heart" aria-hidden />
            </div>
            <div>
              <div className="pd-shortlist-title">Still deciding?</div>
              <button
                type="button"
                className="pd-text-link"
                onClick={(e) => saveProject(e, project.id)}
              >
                Shortlist this project
              </button>
            </div>
          </div>

          <button type="button" className="pd-sidebar-share" onClick={onShare}>
            <i className="bi bi-share" aria-hidden />
            Share
          </button>
        </aside>
      </div>
    </div>
  );
}
