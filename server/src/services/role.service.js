import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid, hashPassword } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
import { USER_STATUS } from '../models/constants.js';
import * as userService from './user.service.js';

export async function listRoles() {
  const [rows] = await query(
    `SELECT r.id, r.uuid, r.code, r.name, r.description, r.is_system AS isSystem,
            COUNT(DISTINCT ur.user_id) AS userCount,
            COUNT(DISTINCT rp.permission_id) AS permissionCount
     FROM roles r
     LEFT JOIN user_roles ur ON ur.role_id = r.id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     WHERE r.deleted_at IS NULL
     GROUP BY r.id
     ORDER BY r.id`
  );
  return rows.map((r) => ({
    id: r.uuid,
    code: r.code,
    name: r.name,
    description: r.description,
    isSystem: Boolean(r.isSystem),
    userCount: Number(r.userCount),
    permissionCount: Number(r.permissionCount),
  }));
}

export async function listPermissions() {
  const [rows] = await query(
    `SELECT uuid, code, module, name, description
     FROM permissions WHERE deleted_at IS NULL
     ORDER BY module, code`
  );
  return rows.map((p) => ({
    id: p.uuid,
    code: p.code,
    module: p.module,
    name: p.name,
    description: p.description,
  }));
}

export async function getRolePermissions(roleUuid) {
  const [roles] = await query(
    `SELECT id, uuid, code, name FROM roles WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: roleUuid }
  );
  const role = roles[0];
  if (!role) throw new ApiError(404, 'Role not found');

  const [perms] = await query(
    `SELECT p.uuid, p.code, p.module, p.name
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = :roleId AND p.deleted_at IS NULL
     ORDER BY p.module, p.code`,
    { roleId: role.id }
  );

  return {
    role: { id: role.uuid, code: role.code, name: role.name },
    permissions: perms.map((p) => ({
      id: p.uuid,
      code: p.code,
      module: p.module,
      name: p.name,
    })),
  };
}

export async function setRolePermissions(roleUuid, permissionCodes, actorUserId, req) {
  const [roles] = await query(
    `SELECT id, uuid, code, is_system AS isSystem FROM roles
     WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: roleUuid }
  );
  const role = roles[0];
  if (!role) throw new ApiError(404, 'Role not found');

  if (!permissionCodes.length) {
    throw new ApiError(400, 'At least one permission is required');
  }

  const placeholders = permissionCodes.map((_, i) => `:code${i}`).join(', ');
  const codeParams = Object.fromEntries(
    permissionCodes.map((code, i) => [`code${i}`, code])
  );

  const [perms] = await query(
    `SELECT id, code FROM permissions
     WHERE code IN (${placeholders}) AND deleted_at IS NULL`,
    codeParams
  );

  if (perms.length !== permissionCodes.length) {
    throw new ApiError(400, 'One or more permission codes are invalid');
  }

  await withTransaction(async (conn) => {
    await conn.execute(`DELETE FROM role_permissions WHERE role_id = ?`, [role.id]);
    for (const p of perms) {
      await conn.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [role.id, p.id]
      );
    }
  });

  await writeAuditLog({
    actorUserId,
    action: 'roles.assign_permissions',
    entityType: 'role',
    entityId: role.id,
    newValues: { permissions: permissionCodes },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getRolePermissions(roleUuid);
}

export async function createRole({ code, name, description }, actorUserId, req) {
  const normalized = code.toUpperCase().replace(/\s+/g, '_');
  const [existing] = await query(
    `SELECT id FROM roles WHERE code = :code AND deleted_at IS NULL LIMIT 1`,
    { code: normalized }
  );
  if (existing.length) {
    throw new ApiError(409, 'Role code already exists');
  }

  const uuid = generateUuid();
  const [result] = await query(
    `INSERT INTO roles (uuid, code, name, description, is_system, created_by)
     VALUES (:uuid, :code, :name, :description, 0, :createdBy)`,
    {
      uuid,
      code: normalized,
      name,
      description: description || null,
      createdBy: actorUserId,
    }
  );

  await writeAuditLog({
    actorUserId,
    action: 'roles.create',
    entityType: 'role',
    entityId: result.insertId,
    newValues: { code: normalized, name },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return {
    id: uuid,
    code: normalized,
    name,
    description: description || null,
    isSystem: false,
  };
}

export async function listUsers({
  page = 1,
  limit = 20,
  search = '',
  roleCode = '',
  status = '',
  emailVerified = '',
}) {
  const offset = (page - 1) * limit;
  const filters = ['u.deleted_at IS NULL'];
  const params = {};

  if (search) {
    filters.push(
      `(u.email LIKE :search OR u.first_name LIKE :search OR u.last_name LIKE :search OR u.phone LIKE :search)`
    );
    params.search = `%${search}%`;
  }
  if (roleCode) {
    filters.push('r.code = :roleCode');
    params.roleCode = roleCode;
  }
  if (status) {
    filters.push('u.status = :status');
    params.status = status;
  }
  if (emailVerified === 'true') {
    filters.push('u.email_verified_at IS NOT NULL');
  } else if (emailVerified === 'false') {
    filters.push('u.email_verified_at IS NULL');
  }

  const where = filters.join(' AND ');

  const [countRows] = await query(
    `SELECT COUNT(*) AS total
     FROM users u INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE ${where}`,
    params
  );

  const [rows] = await query(
    `SELECT u.uuid, u.email, u.phone, u.first_name AS firstName, u.last_name AS lastName,
            u.status, u.email_verified_at AS emailVerifiedAt, u.created_at AS createdAt,
            r.code AS roleCode, r.name AS roleName
     FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE ${where}
     ORDER BY u.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    items: rows.map((u) => ({
      id: u.uuid,
      email: u.email,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status,
      emailVerified: Boolean(u.emailVerifiedAt),
      role: { code: u.roleCode, name: u.roleName },
      createdAt: u.createdAt,
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

async function fetchRoleProfile(user) {
  const { id: userId, roleCode } = user;

  if (roleCode === 'BUILDER') {
    const [rows] = await query(
      `SELECT bp.uuid, bp.company_name AS companyName, bp.rera_number AS reraNumber,
              bp.verification_status AS verificationStatus, c.name AS cityName
       FROM builder_profiles bp
       LEFT JOIN cities c ON c.id = bp.city_id
       WHERE bp.user_id = :userId AND bp.deleted_at IS NULL LIMIT 1`,
      { userId }
    );
    if (!rows.length) return null;
    return { type: 'BUILDER', ...rows[0], city: rows[0].cityName || null };
  }

  if (roleCode === 'AGENT') {
    const [rows] = await query(
      `SELECT ap.uuid, ap.agency_name AS agencyName, ap.license_number AS licenseNumber,
              ap.verification_status AS verificationStatus, c.name AS cityName
       FROM agent_profiles ap
       LEFT JOIN cities c ON c.id = ap.city_id
       WHERE ap.user_id = :userId AND ap.deleted_at IS NULL LIMIT 1`,
      { userId }
    );
    if (!rows.length) return null;
    return { type: 'AGENT', ...rows[0], city: rows[0].cityName || null };
  }

  if (roleCode === 'OWNER') {
    const [rows] = await query(
      `SELECT op.uuid, op.verification_status AS verificationStatus
       FROM owner_profiles op
       WHERE op.user_id = :userId AND op.deleted_at IS NULL LIMIT 1`,
      { userId }
    );
    if (!rows.length) return null;
    return { type: 'OWNER', ...rows[0] };
  }

  if (roleCode === 'BUYER') {
    const [rows] = await query(
      `SELECT bp.uuid, bp.budget_min AS budgetMin, bp.budget_max AS budgetMax,
              bp.preferred_cities AS preferredCities, bp.preferred_types AS preferredTypes
       FROM buyer_profiles bp
       WHERE bp.user_id = :userId AND bp.deleted_at IS NULL LIMIT 1`,
      { userId }
    );
    if (!rows.length) return null;
    return { type: 'BUYER', ...rows[0] };
  }

  return null;
}

export async function getUserDetail(uuid) {
  const user = await userService.findUserByUuid(uuid);
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }

  const permissions = await userService.getPermissionCodesForUser(user.id);

  const [extraRoles] = await query(
    `SELECT r.code, r.name
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = :userId AND r.id != :primaryRoleId AND r.deleted_at IS NULL
     ORDER BY r.name`,
    { userId: user.id, primaryRoleId: user.primaryRoleId }
  );

  const [statsRows] = await query(
    `SELECT
       (SELECT COUNT(*) FROM properties WHERE listed_by_user_id = :userId AND deleted_at IS NULL) AS properties,
       (SELECT COUNT(*) FROM projects p
        INNER JOIN builder_profiles bp ON bp.id = p.builder_id
        WHERE bp.user_id = :userId AND p.deleted_at IS NULL) AS projects,
       (SELECT COUNT(*) FROM support_tickets WHERE user_id = :userId) AS tickets,
       (SELECT COUNT(*) FROM booking_requests WHERE buyer_user_id = :userId AND deleted_at IS NULL) AS bookings,
       (SELECT COUNT(*) FROM leads WHERE buyer_user_id = :userId OR assigned_to_user_id = :userId) AS leads,
       (SELECT COUNT(*) FROM verification_requests WHERE user_id = :userId AND deleted_at IS NULL) AS verifications`,
    { userId: user.id }
  );

  const [verifications] = await query(
    `SELECT uuid, profile_type AS profileType, status, created_at AS createdAt, reviewed_at AS reviewedAt
     FROM verification_requests
     WHERE user_id = :userId AND deleted_at IS NULL
     ORDER BY id DESC LIMIT 5`,
    { userId: user.id }
  );

  const roleProfile = await fetchRoleProfile(user);

  return {
    id: user.uuid,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    role: { code: user.roleCode, name: user.roleName },
    extraRoles: extraRoles.map((r) => ({ code: r.code, name: r.name })),
    permissions,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    stats: {
      properties: Number(statsRows[0].properties),
      projects: Number(statsRows[0].projects),
      tickets: Number(statsRows[0].tickets),
      bookings: Number(statsRows[0].bookings),
      leads: Number(statsRows[0].leads),
      verifications: Number(statsRows[0].verifications),
    },
    roleProfile,
    recentVerifications: verifications.map((v) => ({
      id: v.uuid,
      profileType: v.profileType,
      status: v.status,
      createdAt: v.createdAt,
      reviewedAt: v.reviewedAt,
    })),
  };
}

export async function updateUser(uuid, payload, actorUserId, req) {
  const user = await userService.findUserByUuid(uuid);
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }

  const updates = [];
  const params = { userId: user.id };
  const oldValues = {};
  const newValues = {};

  if (payload.firstName !== undefined) {
    const firstName = payload.firstName.trim();
    if (!firstName) throw new ApiError(400, 'First name required');
    oldValues.firstName = user.firstName;
    newValues.firstName = firstName;
    updates.push('first_name = :firstName');
    params.firstName = firstName;
  }

  if (payload.lastName !== undefined) {
    const lastName = payload.lastName?.trim() || null;
    oldValues.lastName = user.lastName;
    newValues.lastName = lastName;
    updates.push('last_name = :lastName');
    params.lastName = lastName;
  }

  if (payload.email !== undefined) {
    const email = payload.email.toLowerCase().trim();
    const existing = await userService.findUserByEmail(email);
    if (existing && existing.uuid !== uuid) {
      throw new ApiError(400, 'Email already in use', [], 'EMAIL_IN_USE');
    }
    oldValues.email = user.email;
    newValues.email = email;
    updates.push('email = :email');
    params.email = email;
  }

  if (payload.phone !== undefined) {
    const phone = payload.phone?.trim() || null;
    if (phone) {
      const [rows] = await query(
        `SELECT uuid FROM users
         WHERE phone = :phone AND id != :userId AND deleted_at IS NULL LIMIT 1`,
        { phone, userId: user.id }
      );
      if (rows.length) {
        throw new ApiError(400, 'Phone already in use', [], 'PHONE_IN_USE');
      }
    }
    oldValues.phone = user.phone;
    newValues.phone = phone;
    updates.push('phone = :phone');
    params.phone = phone;
  }

  if (payload.roleCode !== undefined) {
    const role = await userService.findRoleByCode(payload.roleCode);
    if (!role) {
      throw new ApiError(400, 'Invalid role', [], 'INVALID_ROLE');
    }
    oldValues.roleCode = user.roleCode;
    newValues.roleCode = role.code;
    updates.push('primary_role_id = :roleId');
    params.roleId = role.id;
    await userService.assignUserRole(user.id, role.id, actorUserId);
  }

  if (!updates.length) {
    throw new ApiError(400, 'No fields to update', [], 'VALIDATION_ERROR');
  }

  updates.push('updated_by = :updatedBy');
  params.updatedBy = actorUserId;

  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = :userId`, params);

  await writeAuditLog({
    actorUserId,
    action: 'users.update',
    entityType: 'user',
    entityId: user.id,
    oldValues,
    newValues,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getUserDetail(uuid);
}

export async function updateUserStatus(uuid, status, actorUserId, actorUuid, req) {
  const user = await userService.findUserByUuid(uuid);
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }

  if (uuid === actorUuid) {
    throw new ApiError(400, 'You cannot change your own account status', [], 'SELF_STATUS_CHANGE');
  }

  if (
    user.roleCode === 'SUPER_ADMIN' &&
    status !== USER_STATUS.ACTIVE
  ) {
    const [countRows] = await query(
      `SELECT COUNT(*) AS total
       FROM users u
       INNER JOIN roles r ON r.id = u.primary_role_id
       WHERE r.code = 'SUPER_ADMIN'
         AND u.deleted_at IS NULL
         AND u.status = 'active'
         AND u.id != :userId`,
      { userId: user.id }
    );
    if (Number(countRows[0].total) < 1) {
      throw new ApiError(
        400,
        'Cannot deactivate the last active super admin',
        [],
        'LAST_SUPER_ADMIN'
      );
    }
  }

  const oldStatus = user.status;
  await query(
    `UPDATE users SET status = :status, updated_by = :updatedBy WHERE id = :userId`,
    { status, userId: user.id, updatedBy: actorUserId }
  );

  if (status === USER_STATUS.SUSPENDED || status === USER_STATUS.BANNED) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = :userId AND revoked_at IS NULL`,
      { userId: user.id }
    );
  }

  await writeAuditLog({
    actorUserId,
    action: 'users.suspend',
    entityType: 'user',
    entityId: user.id,
    oldValues: { status: oldStatus },
    newValues: { status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getUserDetail(uuid);
}

export async function adminResetPassword(uuid, newPassword, actorUserId, req) {
  const user = await userService.findUserByUuid(uuid);
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }

  const passwordHash = await hashPassword(newPassword);
  await userService.updatePassword(user.id, passwordHash);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = :userId AND revoked_at IS NULL`,
    { userId: user.id }
  );

  await writeAuditLog({
    actorUserId,
    action: 'users.password_reset',
    entityType: 'user',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return { message: 'Password updated successfully' };
}
