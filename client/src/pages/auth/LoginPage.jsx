import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearError, login } from '../../redux/slices/authSlice';
import { postLoginRedirect } from '../../utils/accountApproval';
import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';

function authErrorMessage(error) {
  if (!error) return '';
  return typeof error === 'string' ? error : error.message || 'Login failed';
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { status, error } = useSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: location.state?.email || 'superadmin@hous.local',
      password: 'SuperAdmin@12345',
    },
  });

  useEffect(() => () => dispatch(clearError()), [dispatch]);

  useEffect(() => {
    if (location.state?.message) {
      toast.info(location.state.message);
    }
  }, [location.state?.message, toast]);

  useEffect(() => {
    if (error) {
      toast.error(authErrorMessage(error));
    }
  }, [error, toast]);

  const onSubmit = async (values) => {
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) {
      const redirectTo = postLoginRedirect(result.payload.user, location.state?.from || '/');
      navigate(redirectTo, { replace: true });
      return;
    }
    if (login.rejected.match(result)) {
      const payload = result.payload;
      if (payload?.code === 'EMAIL_NOT_VERIFIED') {
        navigate(
          `/verify-email/pending?email=${encodeURIComponent(values.email)}&from=login`,
          { replace: true }
        );
      }
    }
  };

  return (
    <div>
      <h1 className="h4 mb-1">Sign in</h1>
      <p className="text-secondary small mb-4">Use your work email and password</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              className="password-field-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden />
            </button>
            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Link to="/forgot-password" className="small">Forgot password?</Link>
          <Link to="/login/otp" className="small">OTP login</Link>
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-center small mt-4 mb-0">
        No account? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
}
