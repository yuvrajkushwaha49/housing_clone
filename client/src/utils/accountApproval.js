import { ACCOUNT_APPROVAL_ROLES, PANEL_HOME } from '../constants';

export function isAccountPendingApproval(user) {
  if (!user?.role?.code) return false;
  return ACCOUNT_APPROVAL_ROLES.includes(user.role.code) && user.status === 'pending';
}

export function postLoginRedirect(user, fallback = '/') {
  if (isAccountPendingApproval(user)) return '/account-pending';
  return PANEL_HOME[user.role?.code] || fallback;
}

export function accountApprovalRoleLabel(roleCode) {
  const labels = {
    BUILDER: 'Builder',
    AGENT: 'Agent',
    OWNER: 'Owner',
    CMS_MANAGER: 'CMS Manager',
  };
  return labels[roleCode] || 'Account';
}
