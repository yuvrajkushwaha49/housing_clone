import { Router } from 'express';
import * as rbacController from '../controllers/rbac.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import {
  adminResetPasswordRules,
  createRoleRules,
  listUsersRules,
  rolePermissionRules,
  updateUserRules,
  updateUserStatusRules,
  userUuidRules,
  validate,
} from '../validators/auth.validator.js';

const router = Router();

router.use(authenticate);

router.get('/roles', authorize('roles.read'), rbacController.listRoles);
router.post('/roles', authorize('roles.create'), createRoleRules, validate, rbacController.createRole);
router.get(
  '/roles/:uuid/permissions',
  authorize('roles.read'),
  rbacController.getRolePermissions
);
router.put(
  '/roles/:uuid/permissions',
  authorize('roles.assign_permissions'),
  rolePermissionRules,
  validate,
  rbacController.setRolePermissions
);
router.get('/permissions', authorize('permissions.read'), rbacController.listPermissions);
router.get('/users', authorize('users.read'), listUsersRules, validate, rbacController.listUsers);
router.get('/users/:uuid', authorize('users.read'), userUuidRules, validate, rbacController.getUser);
router.patch(
  '/users/:uuid/password',
  authorize('users.update'),
  adminResetPasswordRules,
  validate,
  rbacController.adminResetPassword
);
router.patch(
  '/users/:uuid/status',
  authorize('users.suspend'),
  updateUserStatusRules,
  validate,
  rbacController.updateUserStatus
);
router.patch('/users/:uuid', authorize('users.update'), updateUserRules, validate, rbacController.updateUser);

export default router;
