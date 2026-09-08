import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../helpers/crypto.helper.js';
import * as userService from '../services/user.service.js';
import { USER_STATUS } from '../models/constants.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new ApiError(401, 'Authentication required', [], 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired access token', [], 'TOKEN_EXPIRED');
    }

    const user = await userService.findUserByUuid(decoded.sub);
    if (!user) {
      throw new ApiError(401, 'User not found', [], 'UNAUTHORIZED');
    }
    if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.BANNED) {
      throw new ApiError(403, `Account is ${user.status}`, [], 'ACCOUNT_DISABLED');
    }

    const permissions = await userService.getPermissionCodesForUser(user.id);

    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleCode: user.roleCode,
      permissions,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Attach user when token present; continue as guest otherwise. */
export async function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  return authenticate(req, _res, next);
}

export function authorize(...requiredPermissions) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', [], 'UNAUTHORIZED'));
    }

    if (req.user.roleCode === 'SUPER_ADMIN') {
      return next();
    }

    const hasAll = requiredPermissions.every((p) => req.user.permissions.includes(p));
    if (!hasAll) {
      return next(new ApiError(403, 'Insufficient permissions', [], 'FORBIDDEN'));
    }
    return next();
  };
}

export function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', [], 'UNAUTHORIZED'));
    }
    if (req.user.roleCode === 'SUPER_ADMIN') {
      return next();
    }
    if (!roles.includes(req.user.roleCode)) {
      return next(new ApiError(403, 'Role not allowed', [], 'FORBIDDEN'));
    }
    return next();
  };
}
