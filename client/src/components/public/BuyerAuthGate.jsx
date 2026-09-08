import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function useBuyerAccess() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const isBuyer = Boolean(accessToken && user?.role?.code === 'BUYER');
  return { accessToken, user, isBuyer };
}

export function BuyerAuthPrompt({ propertySlug, actionLabel }) {
  const { accessToken, isBuyer } = useBuyerAccess();
  const returnPath = `/property/${propertySlug}`;

  if (!accessToken) {
    return (
      <div className="property-buyer-login-prompt border-0 p-0 bg-transparent">
        <p className="text-secondary mb-3">
          Sign in with a <strong>buyer account</strong> to {actionLabel}.
        </p>
        <Link
          to="/login"
          state={{ from: returnPath, message: `Sign in as a buyer to ${actionLabel}.` }}
          className="btn btn-primary w-100"
        >
          Sign in as buyer
        </Link>
        <p className="small text-center text-secondary mt-3 mb-0">
          New here? <Link to="/register">Create buyer account</Link>
        </p>
      </div>
    );
  }

  if (!isBuyer) {
    return (
      <div className="property-buyer-login-prompt border-0 p-0 bg-transparent">
        <p className="text-secondary mb-0">
          Only <strong>buyer accounts</strong> can {actionLabel}.
          {' '}Please sign in with a buyer account or{' '}
          <Link to="/register">register as a buyer</Link>.
        </p>
      </div>
    );
  }

  return null;
}

export default function BuyerAuthGate({ propertySlug, actionLabel, children }) {
  const { isBuyer, accessToken } = useBuyerAccess();

  if (!accessToken || !isBuyer) {
    return <BuyerAuthPrompt propertySlug={propertySlug} actionLabel={actionLabel} />;
  }

  return children;
}
