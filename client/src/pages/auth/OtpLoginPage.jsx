import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { authService } from '../../services';
import { setCredentials } from '../../redux/slices/authSlice';
import { postLoginRedirect } from '../../utils/accountApproval';
import { useToast } from '../../hooks/useToast';

export default function OtpLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const requestForm = useForm();
  const verifyForm = useForm();

  const requestOtp = async ({ email: value }) => {
    setLoading(true);
    try {
      const { data } = await authService.requestOtp(value);
      setEmail(value);
      toast.success(data.message);
      setStep(2);
    } catch (err) {
      toast.apiError(err, 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async ({ otp }) => {
    setLoading(true);
    try {
      const { data } = await authService.verifyOtp({ email, otp });
      dispatch(setCredentials(data.data));
      navigate(postLoginRedirect(data.data.user));
    } catch (err) {
      toast.apiError(err, 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="h4 mb-1">OTP login</h1>
      <p className="text-secondary small mb-4">Receive a one-time code by email.</p>

      {step === 1 ? (
        <form onSubmit={requestForm.handleSubmit(requestOtp)}>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              {...requestForm.register('email', { required: true })}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyForm.handleSubmit(verifyOtp)}>
          <div className="mb-3">
            <label className="form-label" htmlFor="otp">Enter OTP</label>
            <input
              id="otp"
              className="form-control"
              maxLength={6}
              {...verifyForm.register('otp', { required: true, minLength: 6, maxLength: 6 })}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
        </form>
      )}

      <p className="text-center small mt-4 mb-0">
        <Link to="/login">Password login</Link>
      </p>
    </div>
  );
}
