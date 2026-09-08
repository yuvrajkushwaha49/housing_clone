import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authService } from '../../services';
import { useToast } from '../../hooks/useToast';

function formatApiError(err) {
  const api = err.response?.data;
  if (Array.isArray(api?.errors) && api.errors.length) {
    return api.errors.map((e) => `${e.field}: ${e.message}`).join(' · ');
  }
  return api?.message || 'Reset failed';
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const tokenFromUrl = params.get('token') || '';
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { token: tokenFromUrl, password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  useEffect(() => {
    if (!tokenFromUrl) {
      toast.error('Reset link is missing or invalid.');
    }
  }, [tokenFromUrl, toast]);

  const onSubmit = async (values) => {
    if (!values.token?.trim()) {
      toast.error('Reset link is invalid. Request a new password reset email.');
      return;
    }
    if (values.password !== values.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authService.resetPassword({
        token: values.token.trim(),
        password: values.password,
      });
      toast.success(data.message);
      setTimeout(() => navigate('/login', { state: { message: 'Password updated. Sign in with your new password.' } }), 1500);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="text-center">
        <h1 className="h4 mb-3">Reset password</h1>
        <p className="text-secondary small mb-3">Reset link is missing or invalid.</p>
        <Link to="/forgot-password" className="btn btn-primary">Request new reset link</Link>
        <p className="mt-3 mb-0">
          <Link to="/login" className="small">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="h4 mb-1">Reset password</h1>
      <p className="text-secondary small mb-4">Choose a new password for your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" {...register('token', { required: true })} />
        <div className="mb-3">
          <label className="form-label" htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
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
          {errors.password && (
            <div className="invalid-feedback">{errors.password.message}</div>
          )}
          <div className="form-text">At least 8 characters with uppercase, lowercase, and a number.</div>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
            {...register('confirmPassword', { required: 'Required' })}
          />
          {errors.confirmPassword && (
            <div className="invalid-feedback">{errors.confirmPassword.message}</div>
          )}
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
      <p className="text-center small mt-4 mb-0">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
