import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import PublicSiteHeader from '../../components/public/PublicSiteHeader';
import PublicSiteFooter from '../../components/public/PublicSiteFooter';
import PropertyDetailSkeleton from '../../components/public/PropertyDetailSkeleton';
import AppModal from '../../components/public/AppModal';
import { BuyerAuthPrompt, useBuyerAccess } from '../../components/public/BuyerAuthGate';
import PropertyNearbySection from '../../components/public/PropertyNearbySection';
import PropertyNearbyProjectsSection from '../../components/public/PropertyNearbyProjectsSection';
import HomeProminentProjects from '../../components/public/HomeProminentProjects';
import HomeNewProperties from '../../components/public/HomeNewProperties';
import { chatService, leadService, mastersService, mediaUrl, propertyService, reviewService, reportService } from '../../services';
import { PANEL_HOME } from '../../constants';
import PropertyQualityBadge from '../../components/properties/PropertyQualityBadge';
import { formatPlotAmenityLabel, isPlotProperty } from '../../components/properties/propertyUtils';
import { useToast } from '../../hooks/useToast';

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
    propertyService
      .getBySlug(slug)
      .then(async (res) => {
        setProperty(res.data.data);
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

  if (loading) {
    return (
      <div className="property-detail-page">
        <PublicSiteHeader active="/search" />
        <PropertyDetailSkeleton />
        <PublicSiteFooter />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="property-detail-page">
        <PublicSiteHeader active="/search" />
        <div className="container py-5">
          <div className="panel-card text-center py-5">
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

  const images = property.media?.filter((m) => m.mediaType === 'image') || [];
  const isOwnListing = user && property.listedBy?.id === user.id;
  const isPlot = isPlotProperty(property);
  const plotSearchUrl = plotTypeId
    ? `/search?purpose=sale&propertyTypeId=${encodeURIComponent(plotTypeId)}${
      property.city?.id ? `&cityId=${encodeURIComponent(property.city.id)}` : ''
    }`
    : '/search?purpose=sale';

  return (
    <div className="property-detail-page">
      <PublicSiteHeader active="/search" />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Link to="/search" className="btn btn-sm btn-outline-secondary">← Search</Link>
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            {!isOwnListing && (
              <button type="button" className="btn btn-sm btn-primary" disabled={chatBusy} onClick={startChat}>
                Chat with lister
              </button>
            )}
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={compareBusy} onClick={toggleCompare}>
              Compare
            </button>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={save}>
              Save
            </button>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="panel-card mb-3">
              <div
                className="property-detail-hero-image"
                style={{
                  background: images[0]
                    ? `center/cover url(${mediaUrl(images[0].url)})`
                    : 'linear-gradient(135deg,#2d235f,#5d519b)',
                }}
              />
              {images.length > 1 && (
                <div className="d-flex gap-2 mt-2 overflow-auto">
                  {images.slice(1).map((img) => (
                    <img key={img.id} src={mediaUrl(img.url)} alt="" height={72} style={{ borderRadius: 8 }} />
                  ))}
                </div>
              )}
            </div>
            <div className="panel-card mb-3">
              <h1 className="h3">{property.title}</h1>
              <p className="text-secondary">
                {property.locality?.name ? `${property.locality.name}, ` : ''}
                {property.city?.name}, {property.state?.name}
              </p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{property.description}</p>
            </div>
            <div className="panel-card mb-3">
              <h2 className="h6">{isPlotProperty(property) ? 'Plot amenities' : 'Amenities'}</h2>
              {isPlotProperty(property) ? (
                <div className="row g-3">
                  {Object.entries(property.plotAmenities || {}).filter(([, value]) => value).length > 0 ? (
                    Object.entries(property.plotAmenities)
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <div key={key} className="col-md-6">
                          <div className="small text-secondary">{formatPlotAmenityLabel(key)}</div>
                          <div className="fw-medium">{value}</div>
                        </div>
                      ))
                  ) : (
                    <div className="col-12 text-secondary">No plot amenities listed</div>
                  )}
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {property.amenities?.map((a) => (
                    <span key={a.id} className="badge text-bg-light border">{a.name}</span>
                  ))}
                  {!property.amenities?.length && <span className="text-secondary">No amenities listed</span>}
                </div>
              )}
            </div>

            <div className="panel-card">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                  <h2 className="h6 mb-1">Reviews</h2>
                  <span className="small text-secondary">
                    {reviews.averageRating ? `${reviews.averageRating} ★` : 'No ratings'} · {reviews.total} approved
                  </span>
                </div>
                {!isOwnListing && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openBuyerModal('review', 'write a review')}
                  >
                    <i className="bi bi-pencil-square me-1" aria-hidden />
                    Write a review
                  </button>
                )}
              </div>
              {reviews.items.map((r) => (
                <div key={r.id} className="border-bottom py-3">
                  <div className="d-flex justify-content-between">
                    <strong>{r.user.name}</strong>
                    <span className="text-warning small">{'★'.repeat(r.rating)}</span>
                  </div>
                  {r.title && <div className="fw-semibold">{r.title}</div>}
                  <p className="mb-0 small">{r.body}</p>
                </div>
              ))}
              {!reviews.items.length && (
                <div className="text-secondary small">No reviews yet. Be the first to share your experience.</div>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="panel-card mb-3">
              <div className="display-6 fw-semibold mb-2">
                ₹{Number(property.price).toLocaleString('en-IN')}
              </div>
              {property.reviewAverageRating != null && (
                <div className="d-flex align-items-center gap-2 mb-2">
                  <PropertyQualityBadge rating={property.reviewAverageRating} />
                  <span className="small text-secondary">Admin verified quality</span>
                </div>
              )}
              <div className="mb-3 text-secondary">{property.purpose.toUpperCase()}</div>
              <ul className="list-unstyled small mb-3">
                <li className="mb-1"><strong>Type:</strong> {property.propertyType?.name}</li>
                <li className="mb-1"><strong>{isPlot ? 'Plot area' : 'Area'}:</strong> {property.area} {property.areaUnit?.name}</li>
                {!isPlot && (
                  <li className="mb-1"><strong>Beds / Baths:</strong> {property.bedrooms ?? '—'} / {property.bathrooms ?? '—'}</li>
                )}
                {isPlot && property.facing?.name && (
                  <li className="mb-1"><strong>Facing:</strong> {property.facing.name}</li>
                )}
                {isPlot && property.ownership?.name && (
                  <li className="mb-1"><strong>Ownership:</strong> {property.ownership.name}</li>
                )}
                <li className="mb-1"><strong>Views:</strong> {property.viewsCount}</li>
              </ul>
              <div className="border-top pt-3">
                <div className="fw-semibold">{property.listedBy?.name}</div>
                <div className="small text-secondary text-capitalize">{property.listedByType}</div>
              </div>
            </div>

            {!isOwnListing && (
              <div className="panel-card mb-3">
                <h2 className="h6">Interested in this property?</h2>
                <p className="small text-secondary mb-3">
                  Contact the lister or schedule a visit at your convenience.
                </p>
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openBuyerModal('inquiry', 'send an inquiry')}
                  >
                    <i className="bi bi-envelope me-1" aria-hidden />
                    Send inquiry
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => openBuyerModal('visit', 'book a site visit')}
                  >
                    <i className="bi bi-calendar-check me-1" aria-hidden />
                    Book site visit
                  </button>
                </div>
              </div>
            )}

            <div className="panel-card">
              <h2 className="h6">Report listing</h2>
              <form onSubmit={submitReport}>
                <select className="form-select form-select-sm mb-2" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                  <option value="spam">Spam</option>
                  <option value="fraud">Fraud</option>
                  <option value="incorrect">Incorrect info</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="offensive">Offensive</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  className="form-control form-control-sm mb-2"
                  rows={2}
                  placeholder="Details (optional)"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
                <button type="submit" className="btn btn-outline-danger btn-sm w-100">Submit report</button>
              </form>
            </div>
          </div>
        </div>
      </div>

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
              placeholder="Your message (min 10 characters)"
              {...inquiryForm.register('message', { required: true, minLength: 10 })}
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
