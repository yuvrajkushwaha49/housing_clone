import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { profileService } from '../../services';
import { useToast } from '../../hooks/useToast';

function SellerCard({ seller, onContact }) {
  const initial = (seller.name || 'S').charAt(0).toUpperCase();
  const experience = seller.experienceYears != null ? `${seller.experienceYears} Yrs Experience` : null;
  const listings = `${seller.listingCount} Total listing${seller.listingCount === 1 ? '' : 's'}`;

  return (
    <article className="home-seller-card">
      <div className="home-seller-card-head" style={{ background: seller.accent || '#3d3d3d' }}>
        <div className="home-seller-avatar" aria-hidden>{initial}</div>
        <div className="home-seller-head-text">
          <span className="home-seller-name">{seller.name}</span>
        </div>
        <i className="bi bi-chevron-right home-seller-chevron" aria-hidden />
      </div>
      <div className="home-seller-card-body">
        <p className="home-seller-stats">
          {[experience, listings].filter(Boolean).join(' | ')}
        </p>
        {seller.localities?.length > 0 && (
          <div className="home-seller-tags">
            {seller.localities.map((tag) => (
              <span key={tag} className="home-seller-tag">{tag}</span>
            ))}
          </div>
        )}
        <button type="button" className="home-seller-contact-btn" onClick={() => onContact(seller)}>
          <i className="bi bi-telephone" aria-hidden />
          Show Contact
        </button>
      </div>
    </article>
  );
}

export default function HomeRecommendedSellers({ cityId }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { accessToken } = useSelector((s) => s.auth);
  const scrollerRef = useRef(null);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    profileService
      .recommendedSellers({
        limit: 8,
        cityId: cityId || undefined,
      })
      .then((res) => setSellers(res.data.data || []))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 280, behavior: 'smooth' });
  };

  const handleContact = (seller) => {
    if (!accessToken) {
      toast.info('Sign in to view seller contact');
      navigate('/login');
      return;
    }
    if (seller.phone) {
      toast.success(`Contact: ${seller.phone}`);
      return;
    }
    toast.info('Contact this seller through a listing inquiry');
  };

  if (!loading && sellers.length === 0) return null;

  return (
    <section className="home-recommended-sellers">
      <div className="container">
        <div className="home-section-head home-section-head--left">
          <h2>Recommended sellers</h2>
          <p>Sellers with complete knowledge about locality</p>
        </div>

        <div className="home-sellers-row-wrap">
          {loading ? (
            <div className="home-sellers-row">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="home-seller-card is-skeleton">
                  <div className="skeleton-block" style={{ height: 56 }} />
                  <div className="p-3">
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="home-sellers-row" ref={scrollerRef}>
                {sellers.map((seller) => (
                  <SellerCard key={seller.id} seller={seller} onContact={handleContact} />
                ))}
              </div>
              {sellers.length > 4 && (
                <button
                  type="button"
                  className="home-sellers-next"
                  onClick={scrollNext}
                  aria-label="Next sellers"
                >
                  <i className="bi bi-chevron-right" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
