import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function VerifyEmailPage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'ready' : 'error');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('idle');
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      const msg = 'Verification link is missing or invalid.';
      setMessage(msg);
      toast.error(msg);
    }
  }, [token, toast]);

  const confirmVerification = async () => {
    if (!token || verifyingRef.current || status === 'loading' || status === 'success') {
      return;
    }
    verifyingRef.current = true;
    setStatus('loading');
    setMessage('');
    try {
      const { data } = await authService.verifyEmail(token);
      setStatus('success');
      setMessage(data.message);
      toast.success(data.message);
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      setStatus('error');
      setMessage(msg);
      toast.error(msg);
      verifyingRef.current = false;
    }
  };

  const resendVerification = async (e) => {
    e.preventDefault();
    if (!email.trim() || resendStatus === 'loading') return;
    setResendStatus('loading');
    try {
      const { data } = await authService.resendVerification(email.trim());
      setResendStatus('success');
      toast.success(data.message || 'Verification email sent.');
    } catch (err) {
      setResendStatus('error');
      toast.apiError(err, 'Could not resend verification email.');
    }
  };

  return (
    <div className="text-center">
      <h1 className="h4 mb-3">Email verification</h1>
      {status === 'loading' && <div className="spinner-border text-primary" />}
      {status === 'ready' && (
        <>
          <p className="text-secondary small mb-4">
            Click the button below to verify your email. The link is valid for 5 minutes.
          </p>
          <button type="button" className="btn btn-primary" onClick={confirmVerification}>
            Verify my email
          </button>
        </>
      )}
      {status !== 'loading' && status !== 'ready' && message && (
        <p className={`small ${status === 'success' ? 'text-success' : 'text-danger'}`}>{message}</p>
      )}
      {status === 'success' && (
        <Link to="/login" className="btn btn-primary mt-2">Continue to sign in</Link>
      )}
      {status === 'error' && (
        <div className="text-start mt-4">
          <p className="small text-secondary mb-3">
            Enter your email to receive a new verification link (valid for 5 minutes).
          </p>
          <form onSubmit={resendVerification}>
            <label className="form-label" htmlFor="resendEmail">Email</label>
            <input
              id="resendEmail"
              type="email"
              className="form-control mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn btn-outline-primary w-100"
              disabled={resendStatus === 'loading'}
            >
              {resendStatus === 'loading' ? 'Sending…' : 'Resend verification email'}
            </button>
          </form>
          <div className="text-center mt-3">
            <Link to="/login" className="small">Back to sign in</Link>
          </div>
        </div>
      )}
    </div>
  );
}
