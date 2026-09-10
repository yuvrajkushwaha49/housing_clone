import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import ProjectDetailSkeleton from '../../components/public/ProjectDetailSkeleton';
import PropertyDetailBody from '../../components/public/PropertyDetailBody';
import AppModal from '../../components/public/AppModal';
import { BuyerAuthPrompt, useBuyerAccess } from '../../components/public/BuyerAuthGate';
import PropertyNearbySection from '../../components/public/PropertyNearbySection';
import PropertyNearbyProjectsSection from '../../components/public/PropertyNearbyProjectsSection';
import HomeProminentProjects from '../../components/public/HomeProminentProjects';
import HomeNewProperties from '../../components/public/HomeNewProperties';
import PropertyQualityBadge from '../../components/properties/PropertyQualityBadge';
import {
  formatPropertyPurpose,
  isPlotProperty,
} from '../../components/properties/propertyUtils';
import {
  formatPriceCompact,
  formatShortLocation,
} from '../../components/projects/projectUtils';
import {
  chatService,
  leadService,
  mastersService,
  mediaUrl,
  propertyService,
  reviewService,
  reportService,
} from '../../services';
import { PANEL_HOME } from '../../constants';
import { useToast } from '../../hooks/useToast';

function estimateEmi(price) {
  if (price == null) return null;
  const principal = Number(price) * 0.8;
  const monthlyRate = 0.085 / 12;
  const months = 240;
  const emi = (principal * monthlyRate * ((1 + monthlyRate) ** months))
    / (((1 + monthlyRate) ** months) - 1);
  if (!Number.isFinite(emi)) return null;
  if (emi >= 100000) return `₹${(emi / 100000).toFixed(2)} L`;
  if (emi >= 1000) return `₹${(emi / 1000).toFixed(2)} K`;
  return `₹${Math.round(emi).toLocaleString('en-IN')}`;
}

function formatAvgPricePerSqft(price, area) {
  const p = Number(price);
  const a = Number(area);
  if (!p || !a) return null;
  const n = p / a;
  if (n >= 1000) {
    return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')} K/sq.ft`;
  }
  return `₹${Math.round(n).toLocaleString('en-IN')}/sq.ft`;
}

function formatUpdatedAt(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PropertyDetailPage() {
  const toast = useToast();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { accessToken, user, isBuyer } = useBuyerAccess();
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState({ averageRating: 0, total: 0, items: [] });
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatBusy, setChatBusy] = useState(false);
  const [compareBusy, setCompareBusy] = useState(false);
  const [reportReason, setReportReason] = useState('incorrect');
  const [reportDetails, setReportDetails] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [authActionLabel, setAuthActionLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [plotTypeId, setPlotTypeId] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const inquiryForm = useForm({
    defaultValues: { name: '', email: '', phone: '', message: '' },
  });
  const visitForm = useForm({
    defaultValues: { name: '', email: '', phone: '', scheduledAt: '', notes: '' },
  });
  const reviewForm = useForm({
    defaultValues: { rating: 5, title: '', body: '' },
  });

  const loadReviews = async (propertyId) => {
    const { data } = await reviewService.forProperty(propertyId);
    setReviews(data.data);
  };

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    propertyService
      .getBySlug(slug)
      .then(async (res) => {
        setProperty(res.data.data);
        setActiveImage(0);
        try {
          await loadReviews(res.data.data.id);
        } catch {
          /* public reviews optional */
        }
      })
      .catch((err) => {
        toast.apiError(err, 'Property not found');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [slug, toast]);

  useEffect(() => {
    mastersService
      .listTypes({ activeOnly: true })
      .then((res) => {
        const plot = res.data.data.find((t) => t.code === 'plot');
        if (plot) setPlotTypeId(plot.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      inquiryForm.setValue('name', fullName);
      inquiryForm.setValue('email', user.email || '');
      inquiryForm.setValue('phone', user.phone || '');
      visitForm.setValue('name', fullName);
      visitForm.setValue('email', user.email || '');
      visitForm.setValue('phone', user.phone || '');
    }
  }, [user, inquiryForm, visitForm]);

  const images = useMemo(
    () => property?.media?.filter((m) => m.mediaType === 'image') || [],
    [property]
  );

  const closeModal = () => {
    setActiveModal(null);
    setAuthActionLabel('');
  };

  const openBuyerModal = (modalKey, actionLabel) => {
    if (!isBuyer) {
      setAuthActionLabel(actionLabel);
      setActiveModal('auth');
      return;
    }
    setActiveModal(modalKey);
  };

  const save = async () => {
    if (!accessToken) {
      toast.info('Please sign in to save properties');
      return;
    }
    try {
      const { data } = await propertyService.toggleWishlist(property.id);
      toast.success(data.data.saved ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast.apiError(err, 'Wishlist update failed');
    }
  };

  const toggleCompare = async () => {
    if (!accessToken) {
      toast.info('Please sign in to compare properties');
      return;
    }
    setCompareBusy(true);
    try {
      const { data } = await propertyService.toggleCompare(property.id);
      const meta = data.data.meta || {};
      toast.success(
        data.data.compared
          ? `Added to compare (${meta.total || 0}/${meta.max || 4})`
          : 'Removed from compare'
      );
    } catch (err) {
      toast.apiError(err, 'Compare update failed');
    } finally {
      setCompareBusy(false);
    }
  };

  const startChat = async () => {
    if (!accessToken) {
      toast.info('Please sign in to chat with the lister');
      return;
    }
    setChatBusy(true);
    try {
      const { data } = await chatService.start({
        type: 'property',
        propertyId: property.id,
        message: `Hi, I'm interested in ${property.title}`,
      });
      const base = PANEL_HOME[user.role.code].replace('/dashboard', '');
      navigate(`${base}/chat?c=${data.data.id}`);
    } catch (err) {
      toast.apiError(err, 'Could not start chat');
    } finally {
      setChatBusy(false);
    }
  };

  const submitInquiry = async (values) => {
    if (!isBuyer) return;
    setSubmitting(true);
    try {
      await leadService.createInquiry({
        ...values,
        message: values.message?.trim() || undefined,
        phone: values.phone?.trim() || user?.phone || undefined,
        propertyId: property.id,
      });
      toast.success('Inquiry sent. The lister will contact you soon.');
      inquiryForm.reset({
        name: values.name,
        email: values.email,
        phone: values.phone,
        message: '',
      });
      closeModal();
    } catch (err) {
      toast.apiError(err, 'Inquiry failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitVisit = async (values) => {
    if (!isBuyer) return;
    setSubmitting(true);
    try {
      await leadService.createVisit({
        ...values,
        phone: values.phone?.trim() || user?.phone || undefined,
        propertyId: property.id,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
      });
      toast.success('Visit requested. Await confirmation from the host.');
      visitForm.setValue('scheduledAt', '');
      visitForm.setValue('notes', '');
      closeModal();
    } catch (err) {
      toast.apiError(err, 'Visit booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async (values) => {
    if (!isBuyer) return;
    setSubmitting(true);
    try {
      await reviewService.create({
        propertyId: property.id,
        rating: Number(values.rating),
        title: values.title || undefined,
        body: values.body,
      });
      toast.success('Review submitted for moderation');
      reviewForm.reset({ rating: 5, title: '', body: '' });
      await loadReviews(property.id);
      closeModal();
    } catch (err) {
      toast.apiError(err, 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!accessToken) {
      toast.info('Please sign in to report a listing');
      return;
    }
    try {
      await reportService.createPropertyReport({
        propertyId: property.id,
        reason: reportReason,
        details: reportDetails || undefined,
      });
      toast.success('Report submitted. Our team will review it.');
      setReportDetails('');
    } catch (err) {
      toast.apiError(err, 'Report failed');
    }
  };

  const shareProperty = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.info('Unable to share right now');
    }
  };

  const openGallery = (index = 0) => {
    setActiveImage(index);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="project-detail-page project-detail-page--housing property-detail-page">
        <PublicSiteHeader active="/search" />
        <ProjectDetailSkeleton />
        <PublicSiteFooter />
      </div>
    );
  }

  if (loadFailed || !property) {
    return (
      <div className="project-detail-page project-detail-page--housing property-detail-page">
        <PublicSiteHeader active="/search" />
        <div className="container py-5">
          <div className="project-detail-empty panel-card text-center py-5">
            <i className="bi bi-house-x display-4 text-secondary mb-3 d-block" />
            <h1 className="h4">Property not found</h1>
            <p className="text-secondary mb-4">This listing may be unavailable or removed.</p>
            <Link to="/search" className="btn btn-primary">Back to search</Link>
          </div>
        </div>
        <PublicSiteFooter />
      </div>
    );
  }

  const isOwnListing = user && property.listedBy?.id === user.id;
  const isPlot = isPlotProperty(property);
  const shortLocation = formatShortLocation(property);
  const priceCompact = formatPriceCompact(property.price, null).replace(/^From\s+/, '');
  const avgPrice = formatAvgPricePerSqft(property.price, property.area);
  const emiLabel = estimateEmi(property.price);
  const updatedAt = formatUpdatedAt(property.publishedAt || property.updatedAt);
  const moreCount = Math.max(images.length - 3, 0);
  const areaLabel = [property.area, property.areaUnit?.name].filter(Boolean).join(' ') || '—';
  const configLabel = isPlot
    ? (property.propertyType?.name || 'Plot')
    : property.bedrooms != null
      ? `${property.bedrooms} BHK`
      : (property.propertyType?.name || '—');
  const plotSearchUrl = plotTypeId
    ? `/search?purpose=sale&propertyTypeId=${encodeURIComponent(plotTypeId)}${
      property.city?.id ? `&cityId=${encodeURIComponent(property.city.id)}` : ''
    }`
    : '/search?purpose=sale';

  return (
    <div className="project-detail-page project-detail-page--housing property-detail-page">
      <PublicSiteHeader active="/search" />

      <div className="project-detail-top-band">
        <div className="container project-detail-top">
          <div className="project-detail-crumb-row">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb project-detail-breadcrumb mb-0">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                <li className="breadcrumb-item"><Link to="/search">Search</Link></li>
                {property.city?.name && (
                  <li className="breadcrumb-item">
                    <Link to={`/search?cityId=${encodeURIComponent(property.city.id)}`}>
                      {property.city.name}
                    </Link>
                  </li>
                )}
                {property.locality?.name && (
                  <li className="breadcrumb-item">{property.locality.name}</li>
                )}
                <li className="breadcrumb-item active" aria-current="page">{property.title}</li>
              </ol>
            </nav>
            {updatedAt && (
              <div className="project-detail-updated">
                Last updated: {updatedAt}
                <i className="bi bi-info-circle" aria-hidden />
              </div>
            )}
          </div>

          <div className="project-detail-header">
            <div className="project-detail-header-main">
              <h1 className="project-detail-title">{property.title}</h1>
              {property.listedBy?.name && (
                <p className="project-detail-by">
                  By{' '}
                  <span className="project-detail-builder-link">
                    {property.listedBy.name}
                  </span>
                  {property.listedByType && (
                    <span className="text-secondary text-capitalize">
                      {' '}
                      · {String(property.listedByType).replace(/_/g, ' ')}
                    </span>
                  )}
                </p>
              )}
              {shortLocation !== '—' && (
                <p className="project-detail-location-line">{shortLocation}</p>
              )}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="project-detail-rate-pill">
                  <i className="bi bi-tag me-1" aria-hidden />
                  {formatPropertyPurpose(property.purpose)}
                </span>
                {property.reviewAverageRating != null && (
                  <PropertyQualityBadge rating={property.reviewAverageRating} />
                )}
              </div>
            </div>

            <div className="project-detail-header-price">
              <div className="project-detail-price-row">
                <span className="project-detail-price-main">{priceCompact}</span>
                {avgPrice && (
                  <span className="project-detail-price-avg">| {avgPrice}</span>
                )}
              </div>
              {emiLabel && (
                <div className="project-detail-emi">EMI starts at {emiLabel}</div>
              )}
              <div className="project-detail-price-note">
                {isPlot ? 'Plot price' : 'All inclusive Price'}
              </div>
              {!isOwnListing && (
                <button
                  type="button"
                  className="project-detail-contact-btn"
                  onClick={() => openBuyerModal('inquiry', 'send an inquiry')}
                >
                  <i className="bi bi-telephone-fill" aria-hidden />
                  Contact Sellers
                </button>
              )}
            </div>
          </div>

          <div className="project-detail-gallery-grid">
            <div className="project-detail-gallery-main-tile">
              <button
                type="button"
                className="project-detail-gallery-open"
                onClick={() => openGallery(0)}
                aria-label="Open cover image"
              >
                {images[0] ? (
                  <img src={mediaUrl(images[0].url)} alt={images[0].caption || property.title} />
                ) : (
                  <div className="project-detail-gallery-placeholder">
                    <i className="bi bi-house" />
                  </div>
                )}
              </button>
              <span className="project-detail-cover-badge">Cover Image</span>
              <div className="project-detail-gallery-actions">
                <button type="button" className="project-detail-gallery-action" onClick={shareProperty}>
                  <i className="bi bi-share" aria-hidden />
                  SHARE
                </button>
                <button type="button" className="project-detail-gallery-action" onClick={save}>
                  <i className="bi bi-heart" aria-hidden />
                  SAVE
                </button>
              </div>
            </div>

            <div className="project-detail-gallery-side">
              <button
                type="button"
                className="project-detail-gallery-side-tile"
                onClick={() => openGallery(1)}
              >
                {images[1] ? (
                  <img src={mediaUrl(images[1].url)} alt={images[1].caption || ''} />
                ) : (
                  <div className="project-detail-gallery-placeholder is-side">
                    <i className="bi bi-image" />
                  </div>
                )}
              </button>
              <button
                type="button"
                className="project-detail-gallery-side-tile"
                onClick={() => openGallery(images.length > 2 ? 2 : 0)}
              >
                {images[2] ? (
                  <img src={mediaUrl(images[2].url)} alt={images[2].caption || ''} />
                ) : images[0] ? (
                  <img src={mediaUrl(images[0].url)} alt="" />
                ) : (
                  <div className="project-detail-gallery-placeholder is-side">
                    <i className="bi bi-image" />
                  </div>
                )}
                {moreCount > 0 && (
                  <span className="project-detail-more-overlay">+ {moreCount} more</span>
                )}
              </button>
            </div>
          </div>

          <div className="project-detail-highlights-bar">
            <div className="project-detail-highlight-item">
              <strong>{configLabel}</strong>
              <span>{isPlot ? 'Property type' : 'Configuration'}</span>
            </div>
            <div className="project-detail-highlight-item">
              <strong>{formatPropertyPurpose(property.purpose)}</strong>
              <span>Purpose</span>
            </div>
            <div className="project-detail-highlight-item">
              <strong>{avgPrice || '—'}</strong>
              <span>Avg. Price</span>
            </div>
            <div className="project-detail-highlight-item">
              <strong>{areaLabel}</strong>
              <span>{isPlot ? 'Plot size' : 'Size'}</span>
            </div>
          </div>
        </div>
      </div>

      <PropertyDetailBody
        property={property}
        images={images}
        reviews={reviews}
        isOwnListing={isOwnListing}
        onShare={shareProperty}
        onOpenGallery={openGallery}
        onSave={save}
        onChat={startChat}
        onCompare={toggleCompare}
        onInquiry={() => openBuyerModal('inquiry', 'send an inquiry')}
        onVisit={() => openBuyerModal('visit', 'book a site visit')}
        onReview={() => openBuyerModal('review', 'write a review')}
        chatBusy={chatBusy}
        compareBusy={compareBusy}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        onReport={submitReport}
      />

      <PropertyNearbySection property={property} />
      <PropertyNearbyProjectsSection property={property} />

      <div className="property-detail-discovery">
        <HomeProminentProjects
          cityId={property.city?.id}
          cityName={property.city?.name}
        />
        <HomeNewProperties
          cityId={property.city?.id}
          cityName={property.city?.name}
          excludePropertyId={property.id}
          className="property-detail-new-properties"
        />
        {plotTypeId && (
          <HomeNewProperties
            cityId={property.city?.id}
            cityName={property.city?.name}
            propertyTypeId={plotTypeId}
            excludePropertyId={property.id}
            title="Plots"
            viewAllTo={plotSearchUrl}
            className="property-detail-plots home-new-plots"
          />
        )}
      </div>

      {lightboxOpen && images.length > 0 && (
        <div className="project-detail-lightbox" role="dialog" aria-modal="true">
          <button
            type="button"
            className="project-detail-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close gallery"
          >
            <i className="bi bi-x-lg" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="project-detail-lightbox-nav is-prev"
                onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <button
                type="button"
                className="project-detail-lightbox-nav is-next"
                onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                aria-label="Next image"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </>
          )}
          <img
            src={mediaUrl(images[activeImage].url)}
            alt={images[activeImage].caption || property.title}
            className="project-detail-lightbox-image"
          />
          <div className="project-detail-lightbox-count">
            {activeImage + 1} / {images.length}
          </div>
        </div>
      )}

      {activeModal === 'auth' && (
        <AppModal title="Buyer sign in required" onClose={closeModal}>
          <BuyerAuthPrompt propertySlug={slug} actionLabel={authActionLabel} />
        </AppModal>
      )}

      {activeModal === 'inquiry' && isBuyer && (
        <AppModal
          title="Send inquiry"
          onClose={submitting ? undefined : closeModal}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                form="property-inquiry-form"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Send inquiry'}
              </button>
            </>
          )}
        >
          <form id="property-inquiry-form" onSubmit={inquiryForm.handleSubmit(submitInquiry)}>
            <input className="form-control mb-2" placeholder="Name" {...inquiryForm.register('name', { required: true })} />
            <input className="form-control mb-2" type="email" placeholder="Email" {...inquiryForm.register('email', { required: true })} />
            <input className="form-control mb-2" type="tel" placeholder="Phone" {...inquiryForm.register('phone', { required: true, minLength: 8 })} />
            <textarea
              className="form-control"
              rows={4}
              placeholder="Message (optional)"
              {...inquiryForm.register('message')}
            />
          </form>
        </AppModal>
      )}

      {activeModal === 'visit' && isBuyer && (
        <AppModal
          title="Book site visit"
          onClose={submitting ? undefined : closeModal}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                form="property-visit-form"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Requesting…' : 'Request visit'}
              </button>
            </>
          )}
        >
          <form id="property-visit-form" onSubmit={visitForm.handleSubmit(submitVisit)}>
            <input className="form-control mb-2" placeholder="Name" {...visitForm.register('name', { required: true })} />
            <input className="form-control mb-2" type="email" placeholder="Email" {...visitForm.register('email', { required: true })} />
            <input className="form-control mb-2" type="tel" placeholder="Phone" {...visitForm.register('phone', { required: true, minLength: 8 })} />
            <label className="form-label small text-secondary">Preferred date & time</label>
            <input className="form-control mb-2" type="datetime-local" {...visitForm.register('scheduledAt', { required: true })} />
            <textarea className="form-control" rows={3} placeholder="Notes (optional)" {...visitForm.register('notes')} />
          </form>
        </AppModal>
      )}

      {activeModal === 'review' && isBuyer && (
        <AppModal
          title="Write a review"
          onClose={submitting ? undefined : closeModal}
          footer={(
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                form="property-review-form"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit review'}
              </button>
            </>
          )}
        >
          <form id="property-review-form" onSubmit={reviewForm.handleSubmit(submitReview)}>
            <label className="form-label small text-secondary">Rating</label>
            <select className="form-select mb-2" {...reviewForm.register('rating', { required: true })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} stars</option>
              ))}
            </select>
            <input className="form-control mb-2" placeholder="Title (optional)" {...reviewForm.register('title')} />
            <textarea
              className="form-control"
              rows={4}
              placeholder="Your experience (min 10 characters)"
              {...reviewForm.register('body', { required: true, minLength: 10 })}
            />
          </form>
        </AppModal>
      )}

      <PublicSiteFooter />
    </div>
  );
}
