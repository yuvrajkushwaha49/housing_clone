import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
import * as builderService from './builder.service.js';

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function getMyProfile(user) {
  if (user.roleCode === 'BUILDER') {
    return {
      role: 'BUILDER',
      profile: await builderService.getMyProfileWithPending(user),
    };
  }
  if (user.roleCode === 'AGENT') {
    return { role: 'AGENT', profile: await getOrCreateAgentProfile(user) };
  }
  if (user.roleCode === 'OWNER') {
    return { role: 'OWNER', profile: await getOrCreateOwnerProfile(user) };
  }
  if (user.roleCode === 'BUYER') {
    return { role: 'BUYER', profile: await getOrCreateBuyerProfile(user) };
  }
  throw new ApiError(400, 'No role profile for this account');
}

export async function updateMyProfile(user, payload, req) {
  if (user.roleCode === 'BUILDER') {
    const profile = await builderService.submitProfileChangeRequest(user, payload, req);
    return { role: 'BUILDER', profile };
  }
  if (user.roleCode === 'AGENT') {
    return { role: 'AGENT', profile: await updateAgentProfile(user, payload, req) };
  }
  if (user.roleCode === 'OWNER') {
    return { role: 'OWNER', profile: await updateOwnerProfile(user, payload, req) };
  }
  if (user.roleCode === 'BUYER') {
    return { role: 'BUYER', profile: await updateBuyerProfile(user, payload, req) };
  }
  throw new ApiError(400, 'No role profile for this account');
}

async function getOrCreateAgentProfile(user) {
  const [rows] = await query(
    `SELECT ap.*, c.uuid AS city_uuid, c.name AS city_name
     FROM agent_profiles ap
     LEFT JOIN cities c ON c.id = ap.city_id
     WHERE ap.user_id = :userId AND ap.deleted_at IS NULL LIMIT 1`,
    { userId: user.id }
  );
  if (rows.length) return mapAgent(rows[0]);

  const uuid = generateUuid();
  await query(
    `INSERT INTO agent_profiles (uuid, user_id, agency_name, created_by)
     VALUES (:uuid, :userId, :agencyName, :createdBy)`,
    {
      uuid,
      userId: user.id,
      agencyName: `${user.firstName || 'Agent'} Realty`,
      createdBy: user.id,
    }
  );
  return getOrCreateAgentProfile(user);
}

function mapAgent(r) {
  return {
    id: r.uuid,
    agencyName: r.agency_name,
    licenseNumber: r.license_number,
    bio: r.bio,
    experienceYears: r.experience_years,
    verificationStatus: r.verification_status,
    city: r.city_uuid ? { id: r.city_uuid, name: r.city_name } : null,
  };
}

async function updateAgentProfile(user, payload, req) {
  await getOrCreateAgentProfile(user);
  let cityId = null;
  if (payload.cityId) {
    const [cities] = await query(
      `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.cityId }
    );
    if (!cities.length) throw new ApiError(400, 'Invalid city');
    cityId = cities[0].id;
  }
  await query(
    `UPDATE agent_profiles SET
      agency_name = COALESCE(:agencyName, agency_name),
      license_number = COALESCE(:licenseNumber, license_number),
      bio = COALESCE(:bio, bio),
      experience_years = COALESCE(:experienceYears, experience_years),
      city_id = COALESCE(:cityId, city_id),
      updated_by = :actorId
     WHERE user_id = :userId AND deleted_at IS NULL`,
    {
      userId: user.id,
      agencyName: payload.agencyName || null,
      licenseNumber: payload.licenseNumber ?? null,
      bio: payload.bio ?? null,
      experienceYears: payload.experienceYears ?? null,
      cityId,
      actorId: user.id,
    }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'profiles.agent.update',
    entityType: 'agent_profile',
    entityId: user.uuid || String(user.id),
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return getOrCreateAgentProfile(user);
}

async function getOrCreateOwnerProfile(user) {
  const [rows] = await query(
    `SELECT * FROM owner_profiles WHERE user_id = :userId AND deleted_at IS NULL LIMIT 1`,
    { userId: user.id }
  );
  if (rows.length) {
    return {
      id: rows[0].uuid,
      bio: rows[0].bio,
      preferredContact: rows[0].preferred_contact,
      verificationStatus: rows[0].verification_status,
    };
  }
  const uuid = generateUuid();
  await query(
    `INSERT INTO owner_profiles (uuid, user_id, created_by) VALUES (:uuid, :userId, :createdBy)`,
    { uuid, userId: user.id, createdBy: user.id }
  );
  return getOrCreateOwnerProfile(user);
}

async function updateOwnerProfile(user, payload, req) {
  await getOrCreateOwnerProfile(user);
  await query(
    `UPDATE owner_profiles SET
      bio = COALESCE(:bio, bio),
      preferred_contact = COALESCE(:preferredContact, preferred_contact),
      updated_by = :actorId
     WHERE user_id = :userId AND deleted_at IS NULL`,
    {
      userId: user.id,
      bio: payload.bio ?? null,
      preferredContact: payload.preferredContact || null,
      actorId: user.id,
    }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'profiles.owner.update',
    entityType: 'owner_profile',
    entityId: user.uuid || String(user.id),
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return getOrCreateOwnerProfile(user);
}

async function getOrCreateBuyerProfile(user) {
  const [rows] = await query(
    `SELECT * FROM buyer_profiles WHERE user_id = :userId AND deleted_at IS NULL LIMIT 1`,
    { userId: user.id }
  );
  if (rows.length) {
    return {
      id: rows[0].uuid,
      budgetMin: rows[0].budget_min != null ? Number(rows[0].budget_min) : null,
      budgetMax: rows[0].budget_max != null ? Number(rows[0].budget_max) : null,
      preferredCities: parseJson(rows[0].preferred_cities, []),
      preferredTypes: parseJson(rows[0].preferred_types, []),
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    };
  }
  const uuid = generateUuid();
  await query(
    `INSERT INTO buyer_profiles (uuid, user_id, created_by) VALUES (:uuid, :userId, :createdBy)`,
    { uuid, userId: user.id, createdBy: user.id }
  );
  return getOrCreateBuyerProfile(user);
}

async function updateBuyerProfile(user, payload, req) {
  await getOrCreateBuyerProfile(user);
  await query(
    `UPDATE buyer_profiles SET
      budget_min = COALESCE(:budgetMin, budget_min),
      budget_max = COALESCE(:budgetMax, budget_max),
      preferred_cities = COALESCE(:preferredCities, preferred_cities),
      preferred_types = COALESCE(:preferredTypes, preferred_types),
      updated_by = :actorId
     WHERE user_id = :userId AND deleted_at IS NULL`,
    {
      userId: user.id,
      budgetMin: payload.budgetMin ?? null,
      budgetMax: payload.budgetMax ?? null,
      preferredCities: payload.preferredCities
        ? JSON.stringify(payload.preferredCities)
        : null,
      preferredTypes: payload.preferredTypes
        ? JSON.stringify(payload.preferredTypes)
        : null,
      actorId: user.id,
    }
  );
  return getOrCreateBuyerProfile(user);
}

export async function submitVerification(user, payload, req) {
  const map = { AGENT: 'agent', OWNER: 'owner', BUILDER: 'builder' };
  const profileType = map[user.roleCode];
  if (!profileType) throw new ApiError(403, 'Only Agent, Owner, or Builder can request verification');

  const [pending] = await query(
    `SELECT id FROM verification_requests
     WHERE user_id = :userId AND status = 'pending' AND deleted_at IS NULL LIMIT 1`,
    { userId: user.id }
  );
  if (pending.length) throw new ApiError(409, 'You already have a pending verification request');

  // Ensure profile exists and mark pending
  await getMyProfile(user);
  if (profileType === 'agent') {
    await query(
      `UPDATE agent_profiles SET verification_status = 'pending' WHERE user_id = :userId AND deleted_at IS NULL`,
      { userId: user.id }
    );
  } else if (profileType === 'owner') {
    await query(
      `UPDATE owner_profiles SET verification_status = 'pending' WHERE user_id = :userId AND deleted_at IS NULL`,
      { userId: user.id }
    );
  } else {
    await query(
      `UPDATE builder_profiles SET verification_status = 'pending' WHERE user_id = :userId AND deleted_at IS NULL`,
      { userId: user.id }
    );
  }

  const uuid = generateUuid();
  await query(
    `INSERT INTO verification_requests
      (uuid, user_id, profile_type, documents, message, status)
     VALUES (:uuid, :userId, :profileType, :documents, :message, 'pending')`,
    {
      uuid,
      userId: user.id,
      profileType,
      documents: JSON.stringify(payload.documents || []),
      message: payload.message || null,
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'verification.submit',
    entityType: 'verification_request',
    entityId: uuid,
    newValues: { profileType },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getVerificationByUuid(uuid);
}

export async function listMyVerifications(user) {
  const [rows] = await query(
    `SELECT uuid, profile_type AS profileType, documents, message, status,
            reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt, created_at AS createdAt
     FROM verification_requests
     WHERE user_id = :userId AND deleted_at IS NULL
     ORDER BY id DESC`,
    { userId: user.id }
  );
  return rows.map((r) => ({
    id: r.uuid,
    profileType: r.profileType,
    documents: parseJson(r.documents, []),
    message: r.message,
    status: r.status,
    reviewerNotes: r.reviewerNotes,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  }));
}

export async function listVerificationQueue({ page = 1, limit = 20, status = 'pending' } = {}) {
  const offset = (page - 1) * limit;
  const where = ['vr.deleted_at IS NULL'];
  const params = {};
  if (status) {
    where.push('vr.status = :status');
    params.status = status;
  }
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM verification_requests vr WHERE ${where.join(' AND ')}`,
    params
  );
  const [rows] = await query(
    `SELECT vr.uuid, vr.profile_type AS profileType, vr.documents, vr.message, vr.status,
            vr.reviewer_notes AS reviewerNotes, vr.reviewed_at AS reviewedAt, vr.created_at AS createdAt,
            u.uuid AS userId, u.email, u.first_name AS firstName, u.last_name AS lastName, u.phone
     FROM verification_requests vr
     INNER JOIN users u ON u.id = vr.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY FIELD(vr.status, 'pending','approved','rejected'), vr.id ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return {
    items: rows.map((r) => ({
      id: r.uuid,
      profileType: r.profileType,
      documents: parseJson(r.documents, []),
      message: r.message,
      status: r.status,
      reviewerNotes: r.reviewerNotes,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
      user: {
        id: r.userId,
        email: r.email,
        name: `${r.firstName}${r.lastName ? ` ${r.lastName}` : ''}`,
        phone: r.phone,
      },
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

async function getVerificationByUuid(uuid) {
  const [rows] = await query(
    `SELECT uuid, profile_type AS profileType, documents, message, status,
            reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt, created_at AS createdAt
     FROM verification_requests WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Verification request not found');
  const r = rows[0];
  return {
    id: r.uuid,
    profileType: r.profileType,
    documents: parseJson(r.documents, []),
    message: r.message,
    status: r.status,
    reviewerNotes: r.reviewerNotes,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}

export async function reviewVerification(uuid, payload, actor, req) {
  if (!['approved', 'rejected'].includes(payload.status)) {
    throw new ApiError(400, 'Invalid status');
  }
  const [rows] = await query(
    `SELECT * FROM verification_requests WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Verification request not found');
  if (rows[0].status !== 'pending') throw new ApiError(400, 'Request already reviewed');

  const vr = rows[0];
  await query(
    `UPDATE verification_requests SET
      status = :status,
      reviewer_notes = :notes,
      reviewed_by = :reviewerId,
      reviewed_at = NOW()
     WHERE id = :id`,
    {
      id: vr.id,
      status: payload.status,
      notes: payload.reviewerNotes || null,
      reviewerId: actor.id,
    }
  );

  const profileStatus = payload.status === 'approved' ? 'verified' : 'rejected';
  if (vr.profile_type === 'agent') {
    await query(
      `UPDATE agent_profiles SET verification_status = :status WHERE user_id = :userId AND deleted_at IS NULL`,
      { status: profileStatus, userId: vr.user_id }
    );
  } else if (vr.profile_type === 'owner') {
    await query(
      `UPDATE owner_profiles SET verification_status = :status WHERE user_id = :userId AND deleted_at IS NULL`,
      { status: profileStatus, userId: vr.user_id }
    );
  } else if (vr.profile_type === 'builder') {
    await query(
      `UPDATE builder_profiles SET verification_status = :status WHERE user_id = :userId AND deleted_at IS NULL`,
      { status: profileStatus, userId: vr.user_id }
    );
  }

  await writeAuditLog({
    actorUserId: actor.id,
    action: 'verification.review',
    entityType: 'verification_request',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getVerificationByUuid(uuid);
}
