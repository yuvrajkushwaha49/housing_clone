import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function SubscriptionPage() {
  const toast = useToast();
  const [entitlements, setEntitlements] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const me = await subscriptionService.me();
      setEntitlements(me.data.data);
      const scope = me.data.data.roleScope;
      const plansRes = await subscriptionService.listPlans({ roleScope: scope || undefined });
      setPlans(plansRes.data.data);
    } catch (err) {
      toast.apiError(err, 'Failed to load subscription');
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subscribe = async (planId) => {
    try {
      await subscriptionService.start(planId);
      toast.success('Subscription activated (payment stub)');
      await load();
    } catch (err) {
      toast.apiError(err, 'Subscribe failed');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load subscription details.</p>;
  }

  return (
    <div>
      <div className="panel-card mb-3">
        <h2 className="h6 mb-1">Your posting allowance</h2>
        <p className="small text-secondary mb-3">
          How many units you can post depends on your subscription plan.
        </p>
        {entitlements && (
          <div className="row g-3">
            <div className="col-md-3">
              <div className="stat-label">Units posted</div>
              <div className="h4 mb-0">{entitlements.activeListings} / {entitlements.listingLimit}</div>
              <small className="text-secondary">{entitlements.remainingUnits} remaining</small>
            </div>
            <div className="col-md-3">
              <div className="stat-label">Featured</div>
              <div className="h4 mb-0">{entitlements.featuredListings} / {entitlements.featuredLimit}</div>
            </div>
            <div className="col-md-3">
              <div className="stat-label">Can post more</div>
              <div className="h4 mb-0">{entitlements.canPublish ? 'Yes' : 'No'}</div>
            </div>
            <div className="col-md-3">
              <div className="stat-label">Current plan</div>
              <div className="h6 mb-0">{entitlements.subscription?.plan?.name || 'Free defaults'}</div>
              {entitlements.listingLimitBonus > 0 && (
                <small className="text-success d-block">+{entitlements.listingLimitBonus} bonus units from admin</small>
              )}
              {entitlements.subscription && (
                <small className="text-secondary">
                  Until {new Date(entitlements.subscription.endsAt).toLocaleDateString()}
                </small>
              )}
            </div>
          </div>
        )}
        {!entitlements?.canPublish && (
          <div className="alert alert-warning mt-3 mb-0 py-2">
            Unit posting limit reached. Upgrade your plan below or contact support.
          </div>
        )}
      </div>

      <div className="row g-3">
        {plans.map((p) => (
          <div className="col-md-4" key={p.id}>
            <div className="panel-card h-100">
              <h3 className="h5">{p.name}</h3>
              <div className="display-6 fw-semibold mb-2">
                ₹{Number(p.price).toLocaleString('en-IN')}
                <span className="fs-6 text-secondary"> / {p.durationDays}d</span>
              </div>
              <ul className="small mb-3">
                <li><strong>{p.listingLimit}</strong> unit postings</li>
                <li><strong>{p.featuredLimit}</strong> featured listings</li>
                {(p.features || []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={() => subscribe(p.id)}
                disabled={entitlements?.subscription?.plan?.id === p.id}
              >
                {entitlements?.subscription?.plan?.id === p.id ? 'Current plan' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="small text-secondary mt-3 mb-0">
        Payment gateway is stubbed for MVP. <Link to="../properties/new">Post a unit</Link> after upgrading.
      </p>
    </div>
  );
}
