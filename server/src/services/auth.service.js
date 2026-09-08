import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import { REGISTERABLE_ROLES, USER_STATUS, requiresAccountApproval } from '../models/constants.js';
import {
  comparePassword,
  generateOtp,
  generateRawToken,
  generateUuid,
  hashPassword,
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../helpers/crypto.helper.js';
import {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../helpers/mail.helper.js';
import { writeActivityLog, writeAuditLog } from '../helpers/audit.helper.js';
import * as userService from './user.service.js';

function verificationExpiryMinutes() {
  return config.emailVerificationExpiresMinutes;
}

async function issueEmailVerification(userId, email) {
  await query(
    `UPDATE email_verifications SET consumed_at = NOW()
     WHERE user_id = :userId AND consumed_at IS NULL`,
    { userId }
  );

  const verifyToken = generateRawToken();
  const minutes = verificationExpiryMinutes();
  await query(
    `INSERT INTO email_verifications (user_id, token_hash, expires_at)
     VALUES (:userId, :tokenHash, DATE_ADD(NOW(), INTERVAL ${minutes} MINUTE))`,
    {
      userId,
      tokenHash: hashToken(verifyToken),
    }
  );

  await sendVerificationEmail(email, verifyToken, minutes);
  return verifyToken;
}

function assertEmailVerified(user) {
  if (!user.emailVerifiedAt) {
    throw new ApiError(
      403,
      'Please verify your email before signing in. Check your inbox for the verification link (valid for 5 minutes).',
      [],
      'EMAIL_NOT_VERIFIED'
    );
  }
}

function publicUser(user, permissions = []) {
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
    role: {
      code: user.roleCode,
      name: user.roleName,
    },
    permissions,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

async function issueTokenPair(user, req) {
  const permissions = await userService.getPermissionCodesForUser(user.id);
  const accessToken = signAccessToken({
    sub: user.uuid,
    role: user.roleCode,
    permissions,
  });

  const refreshToken = signRefreshToken({ sub: user.uuid });
  const tokenHash = hashToken(refreshToken);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (:userId, :tokenHash, :expiresAt, :userAgent, :ipAddress)`,
    {
      userId: user.id,
      tokenHash,
      expiresAt: refreshExpiryDate(),
      userAgent: req.get('user-agent') || null,
      ipAddress: req.ip || null,
    }
  );

  return { accessToken, refreshToken, permissions };
}

export async function register(payload, req) {
  const roleCode = payload.role || 'BUYER';
  if (!REGISTERABLE_ROLES.includes(roleCode)) {
    throw new ApiError(400, 'Selected role cannot self-register', [], 'INVALID_ROLE');
  }

  const existing = await userService.findUserByEmail(payload.email.toLowerCase());
  if (existing) {
    if (!existing.emailVerifiedAt) {
      throw new ApiError(
        409,
        'This email is already registered but not verified.',
        [],
        'EMAIL_EXISTS_UNVERIFIED'
      );
    }
    throw new ApiError(409, 'Email already registered. Please sign in.', [], 'EMAIL_EXISTS');
  }

  if (payload.phone) {
    const [phoneRows] = await query(
      `SELECT id FROM users WHERE phone = :phone AND deleted_at IS NULL LIMIT 1`,
      { phone: payload.phone }
    );
    if (phoneRows.length) {
      throw new ApiError(409, 'Phone already registered', [], 'PHONE_EXISTS');
    }
  }

  const role = await userService.findRoleByCode(roleCode);
  if (!role) {
    throw new ApiError(400, 'Invalid role', [], 'INVALID_ROLE');
  }

  const passwordHash = await hashPassword(payload.password);
  const uuid = generateUuid();

  const userId = await withTransaction(async (conn) => {
    const id = await userService.createUser({
      uuid,
      email: payload.email.toLowerCase(),
      phone: payload.phone || null,
      passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName || null,
      primaryRoleId: role.id,
      status: USER_STATUS.PENDING,
      connection: conn,
    });
    await userService.assignUserRole(id, role.id, null, conn);
    return id;
  });

  await issueEmailVerification(userId, payload.email.toLowerCase());

  await writeAuditLog({
    actorUserId: userId,
    action: 'user.register',
    entityType: 'user',
    entityId: userId,
    newValues: { email: payload.email.toLowerCase(), role: roleCode },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  await writeActivityLog({
    userId,
    activityType: 'auth.register',
    description: 'User registered',
    ipAddress: req.ip,
  });

  const user = await userService.findUserById(userId);
  return {
    user: publicUser(user, []),
    message: requiresAccountApproval(roleCode)
      ? `Registration successful. Verify your email, then wait for admin approval before using the ${roleCode.toLowerCase()} panel.`
      : `Registration successful. We sent a verification link to your email. It expires in ${config.emailVerificationExpiresMinutes} minutes.`,
    expiresInMinutes: config.emailVerificationExpiresMinutes,
  };
}

export async function login(payload, req) {
  const user = await userService.findUserByEmail(payload.email.toLowerCase());
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Invalid email or password', [], 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(payload.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password', [], 'INVALID_CREDENTIALS');
  }

  if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.BANNED) {
    throw new ApiError(403, `Account is ${user.status}`, [], 'ACCOUNT_DISABLED');
  }

  assertEmailVerified(user);

  const { accessToken, refreshToken, permissions } = await issueTokenPair(user, req);
  await userService.updateLastLogin(user.id);

  await writeActivityLog({
    userId: user.id,
    activityType: 'auth.login',
    description: 'User logged in',
    ipAddress: req.ip,
  });

  return {
    accessToken,
    refreshToken,
    user: publicUser(user, permissions),
  };
}

export async function refresh(refreshToken, req) {
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token required', [], 'REFRESH_REQUIRED');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid refresh token', [], 'INVALID_REFRESH');
  }

  const tokenHash = hashToken(refreshToken);
  const [rows] = await query(
    `SELECT id, user_id AS userId, revoked_at AS revokedAt, expires_at AS expiresAt
     FROM refresh_tokens WHERE token_hash = :tokenHash LIMIT 1`,
    { tokenHash }
  );
  const stored = rows[0];
  if (!stored || stored.revokedAt || new Date(stored.expiresAt) < new Date()) {
    throw new ApiError(401, 'Refresh token expired or revoked', [], 'INVALID_REFRESH');
  }

  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id`, {
    id: stored.id,
  });

  const user = await userService.findUserByUuid(decoded.sub);
  if (!user || user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.BANNED) {
    throw new ApiError(401, 'User not found or disabled', [], 'INVALID_REFRESH');
  }

  const tokens = await issueTokenPair(user, req);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: publicUser(user, tokens.permissions),
  };
}

export async function logout(refreshToken, userId = null) {
  if (refreshToken) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = :tokenHash AND revoked_at IS NULL`,
      { tokenHash: hashToken(refreshToken) }
    );
  } else if (userId) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = :userId AND revoked_at IS NULL`,
      { userId }
    );
  }

  if (userId) {
    await writeActivityLog({
      userId,
      activityType: 'auth.logout',
      description: 'User logged out',
    });
  }
}

export async function me(userUuid) {
  const user = await userService.findUserByUuid(userUuid);
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND');
  }
  const permissions = await userService.getPermissionCodesForUser(user.id);
  return publicUser(user, permissions);
}

export async function verifyEmail(token) {
  const tokenHash = hashToken(token);
  const [rows] = await query(
    `SELECT ev.id, ev.user_id AS userId
     FROM email_verifications ev
     WHERE ev.token_hash = :tokenHash
       AND ev.consumed_at IS NULL
       AND ev.expires_at > NOW()
     LIMIT 1`,
    { tokenHash }
  );
  const record = rows[0];

  if (record) {
    const user = await userService.findUserById(record.userId);
    const autoActivate = user && !requiresAccountApproval(user.roleCode);

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE email_verifications SET consumed_at = NOW() WHERE id = ?`,
        [record.id]
      );
      if (autoActivate) {
        await conn.execute(
          `UPDATE users SET email_verified_at = NOW(),
            status = IF(status = 'pending', 'active', status)
           WHERE id = ?`,
          [record.userId]
        );
      } else {
        await conn.execute(
          `UPDATE users SET email_verified_at = NOW() WHERE id = ?`,
          [record.userId]
        );
      }
    });

    await writeActivityLog({
      userId: record.userId,
      activityType: 'auth.email_verified',
      description: 'Email verified',
    });

    return { message: 'Email verified successfully' };
  }

  // Idempotent: link already used but account is verified (e.g. React double-submit)
  const [alreadyRows] = await query(
    `SELECT ev.user_id AS userId
     FROM email_verifications ev
     INNER JOIN users u ON u.id = ev.user_id
     WHERE ev.token_hash = :tokenHash
       AND ev.consumed_at IS NOT NULL
       AND u.email_verified_at IS NOT NULL
     LIMIT 1`,
    { tokenHash }
  );

  if (alreadyRows[0]) {
    return { message: 'Email already verified. You can sign in.' };
  }

  throw new ApiError(
    400,
    `Invalid or expired verification link. Links expire after ${config.emailVerificationExpiresMinutes} minutes — request a new one from the sign-in page.`,
    [],
    'INVALID_TOKEN'
  );
}

export async function resendVerification(email) {
  const user = await userService.findUserByEmail(email.toLowerCase());
  if (!user) {
    return { message: 'If the account exists, a verification email was sent' };
  }
  if (user.emailVerifiedAt) {
    throw new ApiError(400, 'Email already verified', [], 'ALREADY_VERIFIED');
  }

  await issueEmailVerification(user.id, user.email);
  return {
    message: `Verification email sent. The link expires in ${config.emailVerificationExpiresMinutes} minutes.`,
    expiresInMinutes: config.emailVerificationExpiresMinutes,
  };
}

export async function forgotPassword(email) {
  const user = await userService.findUserByEmail(email.toLowerCase());
  if (!user) {
    return { message: 'If the account exists, a reset email was sent' };
  }

  await query(
    `UPDATE password_resets SET consumed_at = NOW()
     WHERE user_id = :userId AND consumed_at IS NULL`,
    { userId: user.id }
  );

  const token = generateRawToken();
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (:userId, :tokenHash, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
    { userId: user.id, tokenHash: hashToken(token) }
  );
  await sendPasswordResetEmail(user.email, token);
  return { message: 'If the account exists, a reset email was sent' };
}

export async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const [rows] = await query(
    `SELECT id, user_id AS userId
     FROM password_resets
     WHERE token_hash = :tokenHash
       AND consumed_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    { tokenHash }
  );
  const record = rows[0];

  if (!record) {
    throw new ApiError(
      400,
      'Invalid or expired reset link. Request a new password reset email.',
      [],
      'INVALID_TOKEN'
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (conn) => {
    await conn.execute(`UPDATE password_resets SET consumed_at = NOW() WHERE id = ?`, [
      record.id,
    ]);
    await conn.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      passwordHash,
      record.userId,
    ]);
    await conn.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = ? AND revoked_at IS NULL`,
      [record.userId]
    );
  });

  await writeActivityLog({
    userId: record.userId,
    activityType: 'auth.password_reset',
    description: 'Password reset completed',
  });

  return { message: 'Password reset successful' };
}

export async function changePassword(userUuid, currentPassword, newPassword) {
  const user = await userService.findUserByUuid(userUuid);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const full = await userService.findUserByEmail(user.email);
  const valid = await comparePassword(currentPassword, full.passwordHash);
  if (!valid) {
    throw new ApiError(400, 'Current password is incorrect', [], 'INVALID_PASSWORD');
  }

  const passwordHash = await hashPassword(newPassword);
  await userService.updatePassword(user.id, passwordHash);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = :userId AND revoked_at IS NULL`,
    { userId: user.id }
  );

  await writeActivityLog({
    userId: user.id,
    activityType: 'auth.password_change',
    description: 'Password changed',
  });

  return { message: 'Password changed successfully' };
}

export async function requestOtp(email) {
  const user = await userService.findUserByEmail(email.toLowerCase());
  if (!user) {
    return { message: 'If the account exists, an OTP was sent' };
  }

  const otp = generateOtp(6);
  await query(
    `INSERT INTO otp_challenges
      (user_id, channel, destination, otp_hash, purpose, expires_at)
     VALUES (:userId, 'email', :destination, :otpHash, 'login', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    {
      userId: user.id,
      destination: user.email,
      otpHash: hashToken(otp),
    }
  );
  await sendOtpEmail(user.email, otp);
  return { message: 'If the account exists, an OTP was sent' };
}

export async function verifyOtp(email, otp, req) {
  const user = await userService.findUserByEmail(email.toLowerCase());
  if (!user) {
    throw new ApiError(401, 'Invalid OTP', [], 'INVALID_OTP');
  }

  const [rows] = await query(
    `SELECT id, otp_hash AS otpHash, attempts, expires_at AS expiresAt, consumed_at AS consumedAt
     FROM otp_challenges
     WHERE user_id = :userId AND purpose = 'login' AND channel = 'email'
     ORDER BY id DESC LIMIT 1`,
    { userId: user.id }
  );
  const challenge = rows[0];
  if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt) < new Date()) {
    throw new ApiError(401, 'Invalid or expired OTP', [], 'INVALID_OTP');
  }
  if (challenge.attempts >= 5) {
    throw new ApiError(429, 'Too many OTP attempts', [], 'OTP_LOCKED');
  }

  await query(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = :id`, {
    id: challenge.id,
  });

  if (challenge.otpHash !== hashToken(otp)) {
    throw new ApiError(401, 'Invalid OTP', [], 'INVALID_OTP');
  }

  await query(`UPDATE otp_challenges SET consumed_at = NOW() WHERE id = :id`, {
    id: challenge.id,
  });

  if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.BANNED) {
    throw new ApiError(403, `Account is ${user.status}`, [], 'ACCOUNT_DISABLED');
  }

  assertEmailVerified(user);

  const tokens = await issueTokenPair(user, req);
  await userService.updateLastLogin(user.id);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: publicUser(user, tokens.permissions),
  };
}
