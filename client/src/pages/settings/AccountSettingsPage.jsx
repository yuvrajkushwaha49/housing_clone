import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { authService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function AccountSettingsPage() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password updated');
      reset();
    } catch (err) {
      toast.apiError(err, 'Password change failed');
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="panel-card">
          <h1 className="h5 mb-3">Account</h1>
          <div className="mb-2"><strong>Name:</strong> {user?.firstName} {user?.lastName || ''}</div>
          <div className="mb-2"><strong>Email:</strong> {user?.email}</div>
          <div className="mb-2"><strong>Role:</strong> {user?.role?.name || user?.role?.code}</div>
          <div className="small text-secondary">
            Email verified: {user?.emailVerified ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
      <div className="col-lg-7">
        <form className="panel-card" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="h6 mb-3">Change password</h2>
          <input
            type="password"
            className="form-control mb-2"
            placeholder="Current password"
            autoComplete="current-password"
            {...register('currentPassword', { required: true })}
          />
          <input
            type="password"
            className="form-control mb-2"
            placeholder="New password (min 8 chars)"
            autoComplete="new-password"
            {...register('newPassword', { required: true, minLength: 8 })}
          />
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Confirm new password"
            autoComplete="new-password"
            {...register('confirmPassword', { required: true, minLength: 8 })}
          />
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
