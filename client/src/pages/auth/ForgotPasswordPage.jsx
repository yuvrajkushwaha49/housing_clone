import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { authService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      const { data } = await authService.forgotPassword(email);
      toast.success(data.message);
    } catch (err) {
      toast.apiError(err, 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="h4 mb-1">Forgot password</h1>
      <p className="text-secondary small mb-4">We will email a reset link if the account exists.</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            {...register('email', { required: 'Required' })}
          />
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-center small mt-4 mb-0">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
