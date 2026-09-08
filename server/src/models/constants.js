/**
 * Role codes used across the platform.
 */
export const ROLE_CODES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  BUILDER: 'BUILDER',
  AGENT: 'AGENT',
  OWNER: 'OWNER',
  BUYER: 'BUYER',
  SUPPORT: 'SUPPORT',
  CMS_MANAGER: 'CMS_MANAGER',
});

export const REGISTERABLE_ROLES = Object.freeze([
  ROLE_CODES.BUYER,
  ROLE_CODES.OWNER,
  ROLE_CODES.AGENT,
  ROLE_CODES.BUILDER,
]);

export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
});

/** Roles that stay pending until a super admin activates the account. */
export const ACCOUNT_APPROVAL_ROLES = Object.freeze([
  ROLE_CODES.BUILDER,
  ROLE_CODES.AGENT,
  ROLE_CODES.OWNER,
  ROLE_CODES.CMS_MANAGER,
]);

export function requiresAccountApproval(roleCode) {
  return ACCOUNT_APPROVAL_ROLES.includes(roleCode);
}

export const PANEL_PATHS = Object.freeze({
  SUPER_ADMIN: '/panel/super-admin',
  ADMIN: '/panel/admin',
  BUILDER: '/panel/builder',
  AGENT: '/panel/agent',
  OWNER: '/panel/owner',
  BUYER: '/panel/buyer',
  SUPPORT: '/panel/support',
  CMS_MANAGER: '/panel/cms',
});
