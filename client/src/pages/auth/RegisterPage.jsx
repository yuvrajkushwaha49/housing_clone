import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clearError, register as registerUser } from '../../redux/slices/authSlice';
import { REGISTERABLE_ROLES } from '../../constants';
import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';

function authErrorMessage(error) {
  if (!error) return '';
  return typeof error === 'string' ? error : error.message || 'Something went wrong';
}

const VALID_ROLES = REGISTERABLE_ROLES.map((r) => r.value);

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const { status, error } = useSelector((s) => s.auth);
  const roleParam = searchParams.get('role')?.toUpperCase();
  const defaultRole = VALID_ROLES.includes(roleParam) ? roleParam : 'BUYER';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { role: defaultRole } });

  useEffect(() => () => dispatch(clearError()), [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(authErrorMessage(error));
    }
  }, [error, toast]);

  const goToVerifyPending = (email, from = 'register') => {
    navigate(`/verify-email/pending?email=${encodeURIComponent(email)}&from=${from}`, {
      replace: true,
    });
  };

  const onSubmit = async (values) => {
    const result = await dispatch(registerUser(values));
    if (registerUser.fulfilled.match(result)) {
      goToVerifyPending(values.email, 'register');
      return;
    }
    if (registerUser.rejected.match(result)) {
      const payload = result.payload;
      const code = typeof payload === 'object' ? payload.code : null;
      const email = values.email;
      if (code === 'EMAIL_EXISTS_UNVERIFIED') {
        goToVerifyPending(email, 'exists');
        return;
      }
      if (code === 'EMAIL_EXISTS') {
        navigate('/login', {
          replace: true,
          state: {
            email,
            message: 'This email is already registered. Sign in with your password.',
          },
        });
      }
    }
  };

  return (
    <div>
      <h1 className="h4 mb-1">Create account</h1>
      <p className="text-secondary small mb-4">
        Register as buyer, owner, agent, or builder. We will email a verification link (valid 5 minutes).
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="firstName">First name</label>
            <input
              id="firstName"
              className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
              {...register('firstName', { required: 'Required' })}
            />
            {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="lastName">Last name</label>
            <input id="lastName" className="form-control" {...register('lastName')} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="email">Email (Gmail recommended)</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              {...register('email', { required: 'Required' })}
            />
            {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="phone">Phone <span className="text-secondary">(optional)</span></label>
            <input
              id="phone"
              className="form-control"
              placeholder="10-digit mobile number"
              {...register('phone', {
                validate: (value) =>
                  !value?.trim() || value.trim().length >= 8 || 'Phone must be at least 8 characters',
              })}
            />
            {errors.phone && <div className="text-danger small mt-1">{errors.phone.message}</div>}
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="role">Account type</label>
            <select id="role" className="form-select" {...register('role', { required: true })}>
              {REGISTERABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                {...register('password', {
                  required: 'Required',
                  minLength: { value: 8, message: 'Min 8 characters' },
                  validate: {
                    upper: (v) => /[A-Z]/.test(v) || 'Include an uppercase letter',
                    lower: (v) => /[a-z]/.test(v) || 'Include a lowercase letter',
                    number: (v) => /[0-9]/.test(v) || 'Include a number',
                  },
                })}
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
            <div className="form-text">At least 8 characters with uppercase, lowercase, and a number (e.g. <code>Demo@12345</code>).</div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-100 mt-4" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="text-center small mt-4 mb-0">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
