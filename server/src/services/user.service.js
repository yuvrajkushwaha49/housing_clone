import { query } from '../config/db.js';

const userSelect = `
  u.id, u.uuid, u.email, u.phone, u.first_name AS firstName, u.last_name AS lastName,
  u.avatar_url AS avatarUrl, u.status, u.email_verified_at AS emailVerifiedAt,
  u.phone_verified_at AS phoneVerifiedAt, u.last_login_at AS lastLoginAt,
  u.primary_role_id AS primaryRoleId, u.created_at AS createdAt,
  r.code AS roleCode, r.name AS roleName
`;

export async function findUserByEmail(email) {
  const [rows] = await query(
    `SELECT ${userSelect}, u.password_hash AS passwordHash
     FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE u.email = :email AND u.deleted_at IS NULL
     LIMIT 1`,
    { email }
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await query(
    `SELECT ${userSelect}
     FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE u.id = :id AND u.deleted_at IS NULL
     LIMIT 1`,
    { id }
  );
  return rows[0] || null;
}

export async function findUserByUuid(uuid) {
  const [rows] = await query(
    `SELECT ${userSelect}
     FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE u.uuid = :uuid AND u.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  return rows[0] || null;
}

export async function findRoleByCode(code) {
  const [rows] = await query(
    `SELECT id, uuid, code, name, description, is_system AS isSystem
     FROM roles WHERE code = :code AND deleted_at IS NULL LIMIT 1`,
    { code }
  );
  return rows[0] || null;
}

export async function getPermissionCodesForUser(userId) {
  const [roleRows] = await query(
    `SELECT r.code AS roleCode, r.id AS roleId
     FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE u.id = :userId AND u.deleted_at IS NULL
     LIMIT 1`,
    { userId }
  );
  const roleCode = roleRows[0]?.roleCode;
  const roleId = roleRows[0]?.roleId;

  if (!roleId) {
    return [];
  }

  if (roleCode === 'SUPER_ADMIN') {
    const [all] = await query(
      `SELECT code FROM permissions WHERE deleted_at IS NULL ORDER BY code`
    );
    return all.map((r) => r.code);
  }

  const [rows] = await query(
    `SELECT DISTINCT p.code
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id IN (
       SELECT :roleId AS role_id
       UNION
       SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = :userId
     )
       AND p.deleted_at IS NULL
     ORDER BY p.code`,
    { userId, roleId }
  );
  return rows.map((r) => r.code);
}

export async function createUser({
  uuid,
  email,
  phone = null,
  passwordHash,
  firstName,
  lastName = null,
  primaryRoleId,
  status = 'pending',
  emailVerifiedAt = null,
  connection = null,
}) {
  const exec = connection ? connection.execute.bind(connection) : query;
  const [result] = await exec(
    `INSERT INTO users
      (uuid, email, phone, password_hash, first_name, last_name, primary_role_id, status, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid, email, phone, passwordHash, firstName, lastName, primaryRoleId, status, emailVerifiedAt]
  );
  return result.insertId;
}

export async function assignUserRole(userId, roleId, assignedBy = null, connection = null) {
  const exec = connection ? connection.execute.bind(connection) : query;
  await exec(
    `INSERT INTO user_roles (user_id, role_id, assigned_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP`,
    [userId, roleId, assignedBy]
  );
}

export async function updateLastLogin(userId) {
  await query(`UPDATE users SET last_login_at = NOW() WHERE id = :userId`, { userId });
}

export async function setEmailVerified(userId) {
  const user = await userService.findUserById(userId);
  const autoActivate = user && !requiresAccountApproval(user.roleCode);
  if (autoActivate) {
    await query(
      `UPDATE users SET email_verified_at = NOW(), status = IF(status = 'pending', 'active', status)
       WHERE id = :userId`,
      { userId }
    );
  } else {
    await query(`UPDATE users SET email_verified_at = NOW() WHERE id = :userId`, { userId });
  }
}

export async function updatePassword(userId, passwordHash) {
  await query(`UPDATE users SET password_hash = :passwordHash WHERE id = :userId`, {
    userId,
    passwordHash,
  });
}

export async function countUsersByRole() {
  const [rows] = await query(
    `SELECT r.code AS roleCode, r.name AS roleName, COUNT(u.id) AS total
     FROM roles r
     LEFT JOIN users u ON u.primary_role_id = r.id AND u.deleted_at IS NULL
     WHERE r.deleted_at IS NULL
     GROUP BY r.id, r.code, r.name
     ORDER BY r.id`
  );
  return rows;
}

export async function countUsersByStatus() {
  const [rows] = await query(
    `SELECT status, COUNT(*) AS total
     FROM users WHERE deleted_at IS NULL
     GROUP BY status`
  );
  return rows;
}
