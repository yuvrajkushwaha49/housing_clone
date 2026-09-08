import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { projectService, propertyService } from '../services';
import { useToast } from './useToast';

function useRequireAuth(label) {
  const toast = useToast();
  const navigate = useNavigate();
  const { accessToken } = useSelector((s) => s.auth);

  return () => {
    if (accessToken) return true;
    toast.info(`Please sign in to save ${label}`);
    navigate('/login');
    return false;
  };
}

export function useSaveProperty() {
  const toast = useToast();
  const requireAuth = useRequireAuth('listings');

  return async (e, propertyId) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!requireAuth()) return;
    try {
      const { data } = await propertyService.toggleWishlist(propertyId);
      toast.success(data.data.saved ? 'Saved' : 'Removed from saved');
    } catch (err) {
      toast.apiError(err, 'Could not update saved list');
    }
  };
}

export function useSaveProject() {
  const toast = useToast();
  const requireAuth = useRequireAuth('projects');

  return async (e, projectId) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!requireAuth()) return;
    try {
      const { data } = await projectService.toggleWishlist(projectId);
      toast.success(data.data.saved ? 'Saved' : 'Removed from saved');
    } catch (err) {
      toast.apiError(err, 'Could not update saved list');
    }
  };
}
