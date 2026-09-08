import * as roleService from '../services/role.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await roleService.listRoles();
  return ApiResponse.success(res, roles);
});

export const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await roleService.listPermissions();
  return ApiResponse.success(res, permissions);
});

export const getRolePermissions = asyncHandler(async (req, res) => {
  const data = await roleService.getRolePermissions(req.params.uuid);
  return ApiResponse.success(res, data);
});

export const setRolePermissions = asyncHandler(async (req, res) => {
  const data = await roleService.setRolePermissions(
    req.params.uuid,
    req.body.permissions,
    req.user.id,
    req
  );
  return ApiResponse.success(res, data, 'Permissions updated');
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body, req.user.id, req);
  return ApiResponse.created(res, role, 'Role created');
});

export const listUsers = asyncHandler(async (req, res) => {
  const result = await roleService.listUsers({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search || '',
    roleCode: req.query.roleCode || '',
    status: req.query.status || '',
    emailVerified: req.query.emailVerified || '',
  });
  return ApiResponse.success(res, result.items, 'Users fetched', 200, result.meta);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await roleService.getUserDetail(req.params.uuid);
  return ApiResponse.success(res, user, 'User fetched');
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await roleService.updateUser(req.params.uuid, req.body, req.user.id, req);
  return ApiResponse.success(res, user, 'User updated');
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await roleService.updateUserStatus(
    req.params.uuid,
    req.body.status,
    req.user.id,
    req.user.uuid,
    req
  );
  return ApiResponse.success(res, user, 'User status updated');
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const result = await roleService.adminResetPassword(
    req.params.uuid,
    req.body.password,
    req.user.id,
    req
  );
  return ApiResponse.success(res, result, result.message);
});
