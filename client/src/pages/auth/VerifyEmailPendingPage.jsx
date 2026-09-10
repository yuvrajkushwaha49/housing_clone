import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { BrandIcon } from '../../components/BrandAssets';

export default function VerifyEmailPendingPage() {
  const toast = useToast();  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') || '';
  const from = params.get('from') || 'register';
  const [resendStatus, setResendStatus] = useState('idle');

  useEffect(() => {    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  const resendVerification = async () => {
    if (!email || resendStatus === 'loading') return;
    setResendStatus('loading');
    try {
      const { data } = await authService.resendVerification(email);
      setResendStatus('success');
      toast.success(data.message || 'Verification email sent.');
    } catch (err) {
      setResendStatus('error');
      toast.apiError(err, 'Could not resend verification email.');
    }  };

  if (!email) return null;

  const heading =
    from === 'login'
      ? 'Verify email to sign in'
      : from === 'exists'
        ? 'Account already exists'
        : 'Verify your email';

  const intro =
    from === 'login'
      ? 'Your account is not verified yet. We can send a new link to your inbox.'
      : from === 'exists'
        ? 'This email is already registered but not verified. Verify your email or sign in after verifying.'
        : 'Your account was created. Open the verification link we sent to activate it.';

  return (
    <div className="text-center">
      <BrandIcon className="brand-icon--lg mx-auto mb-3" />
      <h1 className="h4 mb-2">{heading}</h1>
      <p className="text-secondary small mb-3">{intro}</p>
      <p className="mb-3">
        Email: <strong>{email}</strong>
      </p>
      <div className="alert alert-info py-2 small text-start">
        Check your Gmail inbox (and Spam). The verification link expires in <strong>5 minutes</strong>.
      </div>
      <div className="d-grid gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={resendVerification}
          disabled={resendStatus === 'loading'}
        >
          {resendStatus === 'loading' ? 'Sending…' : 'Resend verification email'}
        </button>
        <Link
          to="/login"
          state={{ email, message: 'Sign in after you verify your email.' }}
          className="btn btn-outline-primary"
        >
          Go to sign in
        </Link>
        {from !== 'register' && (
          <Link to="/register" className="btn btn-link btn-sm">
            Create a different account
          </Link>
        )}
      </div>
    </div>
  );
}