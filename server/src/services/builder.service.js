import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapProfile(r) {
  return {
    id: r.uuid,
    companyName: r.company_name,
    legalName: r.legal_name,
    gstin: r.gstin,
    reraNumber: r.rera_number,
    logoUrl: r.logo_url,
    website: r.website,
    about: r.about,
    yearEstablished: r.year_established,
    address: r.address,
    verificationStatus: r.verification_status,
    city: r.city_uuid ? { id: r.city_uuid, name: r.city_name } : null,
    user: r.user_uuid
      ? {
          id: r.user_uuid,
          name: `${r.first_name}${r.last_name ? ` ${r.last_name}` : ''}`,
          email: r.email,
        }
      : null,
  };
}

function mapChangeRequest(row) {
  return {
    id: row.uuid,
    status: row.status,
    proposedChanges: parseJson(row.proposed_changes, {}),
    snapshotBefore: parseJson(row.snapshot_before, null),
    reviewerNotes: row.reviewer_notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    builder: row.builder_uuid
      ? {
          id: row.builder_uuid,
          companyName: row.company_name,
        }
      : null,
    user: row.user_uuid
      ? {
          id: row.user_uuid,
          name: `${row.first_name || ''}${row.last_name ? ` ${row.last_name}` : ''}`.trim(),
          email: row.email,
        }
      : null,
  };
}

function snapshotFromRaw(raw, cityUuid = null, cityName = null) {
  return {
    companyName: raw.company_name,
    legalName: raw.legal_name,
    gstin: raw.gstin,
    reraNumber: raw.rera_number,
    website: raw.website,
    about: raw.about,
    yearEstablished: raw.year_established,
    address: raw.address,
    cityId: cityUuid,
    cityName,
  };
}

function normalizeProposedChanges(payload) {
  return {
    companyName: payload.companyName?.trim() || null,
    legalName: payload.legalName?.trim() || null,
    gstin: payload.gstin?.trim() || null,
    reraNumber: payload.reraNumber?.trim() || null,
    website: payload.website?.trim() || null,
    about: payload.about?.trim() || null,
    yearEstablished:
      payload.yearEstablished !== '' && payload.yearEstablished != null
        ? Number(payload.yearEstablished)
        : null,
    address: payload.address?.trim() || null,
    cityId: payload.cityId || null,
  };
}

async function getPendingChangeRequest(builderProfileId) {
  const [rows] = await query(
    `SELECT * FROM builder_profile_change_requests
     WHERE builder_profile_id = :builderProfileId
       AND status = 'pending'
       AND deleted_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    { builderProfileId }
  );
  return rows[0] || null;
}

async function resolveCityId(cityUuid) {
  if (!cityUuid) return null;
  const [cities] = await query(
    `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: cityUuid }
  );
  if (!cities.length) throw new ApiError(400, 'Invalid city');
  return cities[0].id;
}

async function applyProfileChanges(raw, changes, actorId) {
  const cityId = changes.cityId != null ? await resolveCityId(changes.cityId) : raw.city_id;

  await query(
    `UPDATE builder_profiles SET
      company_name = COALESCE(:companyName, company_name),
      legal_name = :legalName,
      gstin = :gstin,
      rera_number = :reraNumber,
      website = :website,
      about = :about,
      year_established = :yearEstablished,
      address = :address,
      city_id = :cityId,
      updated_by = :actorId
     WHERE id = :id`,
    {
      id: raw.id,
      companyName: changes.companyName || raw.company_name,
      legalName: changes.legalName ?? null,
      gstin: changes.gstin ?? null,
      reraNumber: changes.reraNumber ?? null,
      website: changes.website ?? null,
      about: changes.about ?? null,
      yearEstablished: changes.yearEstablished ?? null,
      address: changes.address ?? null,
      cityId,
      actorId,
    }
  );
}

export async function getOrCreateProfileForUser(user, payload = {}) {
  const [existing] = await query(
    `SELECT bp.*, c.uuid AS city_uuid, c.name AS city_name,
            u.uuid AS user_uuid, u.first_name, u.last_name, u.email
     FROM builder_profiles bp
     INNER JOIN users u ON u.id = bp.user_id
     LEFT JOIN cities c ON c.id = bp.city_id
     WHERE bp.user_id = :userId AND bp.deleted_at IS NULL
     LIMIT 1`,
    { userId: user.id }
  );
  if (existing.length) return mapProfile(existing[0]);

  if (user.roleCode !== 'BUILDER' && !['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode)) {
    throw new ApiError(403, 'Builder profile required');
  }

  const uuid = generateUuid();
  const companyName =
    payload.companyName ||
    `${user.firstName || 'Builder'} Developments`;

  await query(
    `INSERT INTO builder_profiles
      (uuid, user_id, company_name, legal_name, about, created_by)
     VALUES (:uuid, :userId, :companyName, :legalName, :about, :createdBy)`,
    {
      uuid,
      userId: user.id,
      companyName,
      legalName: payload.legalName || null,
      about: payload.about || null,
      createdBy: user.id,
    }
  );

  return getProfileByUserId(user.id);
}

export async function getProfileByUserId(userId) {
  const [rows] = await query(
    `SELECT bp.*, c.uuid AS city_uuid, c.name AS city_name,
            u.uuid AS user_uuid, u.first_name, u.last_name, u.email
     FROM builder_profiles bp
     INNER JOIN users u ON u.id = bp.user_id
     LEFT JOIN cities c ON c.id = bp.city_id
     WHERE bp.user_id = :userId AND bp.deleted_at IS NULL
     LIMIT 1`,
    { userId }
  );
  if (!rows.length) throw new ApiError(404, 'Builder profile not found');
  return mapProfile(rows[0]);
}

export async function getProfileByUuid(uuid) {
  const [rows] = await query(
    `SELECT bp.*, c.uuid AS city_uuid, c.name AS city_name,
            u.uuid AS user_uuid, u.first_name, u.last_name, u.email
     FROM builder_profiles bp
     INNER JOIN users u ON u.id = bp.user_id
     LEFT JOIN cities c ON c.id = bp.city_id
     WHERE bp.uuid = :uuid AND bp.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Builder profile not found');
  return mapProfile(rows[0]);
}

export async function getRawProfileByUserId(userId) {
  const [rows] = await query(
    `SELECT * FROM builder_profiles WHERE user_id = :userId AND deleted_at IS NULL LIMIT 1`,
    { userId }
  );
  return rows[0] || null;
}

export async function getMyProfileWithPending(user) {
  const profile = await getOrCreateProfileForUser(user);
  const raw = await getRawProfileByUserId(user.id);
  const pending = await getPendingChangeRequest(raw.id);
  return {
    ...profile,
    pendingChange: pending ? mapChangeRequest(pending) : null,
  };
}

export async function submitProfileChangeRequest(user, payload, req) {
  await getOrCreateProfileForUser(user);
  const raw = await getRawProfileByUserId(user.id);
  const existingPending = await getPendingChangeRequest(raw.id);
  if (existingPending) {
    throw new ApiError(409, 'A profile update is already under review. Wait for approval before submitting again.');
  }

  const proposedChanges = normalizeProposedChanges(payload);
  if (!proposedChanges.companyName) {
    throw new ApiError(400, 'Company name is required');
  }

  const [cityRow] = await query(
    `SELECT c.uuid, c.name FROM cities c WHERE c.id = :cityId LIMIT 1`,
    { cityId: raw.city_id }
  );
  const snapshotBefore = snapshotFromRaw(
    raw,
    cityRow[0]?.uuid || null,
    cityRow[0]?.name || null
  );

  const uuid = generateUuid();
  await query(
    `INSERT INTO builder_profile_change_requests
      (uuid, builder_profile_id, user_id, snapshot_before, proposed_changes, status)
     VALUES (:uuid, :builderProfileId, :userId, :snapshotBefore, :proposedChanges, 'pending')`,
    {
      uuid,
      builderProfileId: raw.id,
      userId: user.id,
      snapshotBefore: JSON.stringify(snapshotBefore),
      proposedChanges: JSON.stringify(proposedChanges),
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'builders.profile.change_request',
    entityType: 'builder_profile_change_request',
    entityId: uuid,
    newValues: proposedChanges,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getMyProfileWithPending(user);
}

export async function listProfileChangeQueue({ status = 'pending', page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const where = ['cr.deleted_at IS NULL'];
  const params = {};
  if (status) {
    where.push('cr.status = :status');
    params.status = status;
  }

  const [countRows] = await query(
    `SELECT COUNT(*) AS total
     FROM builder_profile_change_requests cr
     WHERE ${where.join(' AND ')}`,
    params
  );

  const [rows] = await query(
    `SELECT cr.*, bp.uuid AS builder_uuid, bp.company_name,
            u.uuid AS user_uuid, u.first_name, u.last_name, u.email
     FROM builder_profile_change_requests cr
     INNER JOIN builder_profiles bp ON bp.id = cr.builder_profile_id
     INNER JOIN users u ON u.id = cr.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY cr.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    items: rows.map(mapChangeRequest),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function reviewProfileChangeRequest(reviewer, requestUuid, payload, req) {
  const [rows] = await query(
    `SELECT cr.*, bp.uuid AS builder_uuid
     FROM builder_profile_change_requests cr
     INNER JOIN builder_profiles bp ON bp.id = cr.builder_profile_id
     WHERE cr.uuid = :uuid AND cr.deleted_at IS NULL
     LIMIT 1`,
    { uuid: requestUuid }
  );
  if (!rows.length) throw new ApiError(404, 'Change request not found');
  const cr = rows[0];
  if (cr.status !== 'pending') throw new ApiError(400, 'Request already reviewed');

  const nextStatus = payload.status === 'approved' ? 'approved' : 'rejected';

  if (nextStatus === 'approved') {
    const [profileRows] = await query(
      `SELECT * FROM builder_profiles WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { id: cr.builder_profile_id }
    );
    if (!profileRows.length) throw new ApiError(404, 'Builder profile not found');
    const changes = parseJson(cr.proposed_changes, {});
    await applyProfileChanges(profileRows[0], changes, reviewer.id);
  }

  await query(
    `UPDATE builder_profile_change_requests SET
      status = :status,
      reviewer_notes = :reviewerNotes,
      reviewed_by = :reviewedBy,
      reviewed_at = NOW()
     WHERE id = :id`,
    {
      id: cr.id,
      status: nextStatus,
      reviewerNotes: payload.reviewerNotes || null,
      reviewedBy: reviewer.id,
    }
  );

  await writeAuditLog({
    actorUserId: reviewer.id,
    action: `builders.profile.change_${nextStatus}`,
    entityType: 'builder_profile_change_request',
    entityId: requestUuid,
    newValues: { status: nextStatus, reviewerNotes: payload.reviewerNotes || null },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const [updated] = await query(
    `SELECT cr.*, bp.uuid AS builder_uuid, bp.company_name,
            u.uuid AS user_uuid, u.first_name, u.last_name, u.email
     FROM builder_profile_change_requests cr
     INNER JOIN builder_profiles bp ON bp.id = cr.builder_profile_id
     INNER JOIN users u ON u.id = cr.user_id
     WHERE cr.id = :id
     LIMIT 1`,
    { id: cr.id }
  );

  const reviewed = updated[0];
  const companyLabel = reviewed.company_name || 'your builder profile';
  const reviewerNotes = payload.reviewerNotes?.trim() || null;

  if (nextStatus === 'approved') {
    await notifyUser(reviewed.user_id, {
      type: 'builder.profile.approved',
      title: 'Profile update approved',
      body: `Your changes to ${companyLabel} were approved and are now live.`,
      data: { changeRequestId: requestUuid, status: nextStatus },
      email: reviewed.email,
    });
  } else {
    await notifyUser(reviewed.user_id, {
      type: 'builder.profile.rejected',
      title: 'Profile update rejected',
      body: reviewerNotes
        ? `Your profile update for ${companyLabel} was rejected: ${reviewerNotes}`
        : `Your profile update for ${companyLabel} was rejected. Edit your profile and submit again.`,
      data: { changeRequestId: requestUuid, status: nextStatus, reviewerNotes },
      email: reviewed.email,
    });
  }

  return mapChangeRequest(reviewed);
}

export async function updateProfile(user, payload, req) {
  return submitProfileChangeRequest(user, payload, req);
}

export async function listBuilders({ page = 1, limit = 20, q, featured = false, cityId } = {}) {
  if (featured) {
    return listFeaturedDevelopers({ limit, cityId });
  }

  const offset = (page - 1) * limit;
  const where = ['bp.deleted_at IS NULL'];
  const params = {};
  if (q) {
    where.push('(bp.company_name LIKE :q OR bp.rera_number LIKE :q)');
    params.q = `%${q}%`;
  }
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM builder_profiles bp WHERE ${where.join(' AND ')}`,
    params
  );
  const [rows] = await query(
    `SELECT bp.*, c.uuid AS city_uuid, c.name AS city_name,
            u.uuid AS user_uuid, u.first_name, u.last_name, u.email
     FROM builder_profiles bp
     INNER JOIN users u ON u.id = bp.user_id
     LEFT JOIN cities c ON c.id = bp.city_id
     WHERE ${where.join(' AND ')}
     ORDER BY bp.company_name ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return {
    items: rows.map(mapProfile),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

/**
 * Builders with public projects for the home "Featured Developers" section.
 */
export async function listFeaturedDevelopers({ limit = 6, cityId } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 12);
  const params = {};
  const cityFilter = cityId
    ? 'AND (ci.uuid = :cityId OR bp.city_id IN (SELECT id FROM cities WHERE uuid = :cityId AND deleted_at IS NULL))'
    : '';
  if (cityId) params.cityId = cityId;

  const publicProject = `(p.status = 'published' OR (p.status = 'pending' AND p.published_at IS NOT NULL))`;

  const [rows] = await query(
    `SELECT bp.uuid, bp.company_name, bp.logo_url, bp.about, bp.year_established,
            c.uuid AS city_uuid, c.name AS city_name,
            COUNT(DISTINCT p.id) AS project_count
     FROM builder_profiles bp
     INNER JOIN projects p ON p.builder_id = bp.id
       AND p.deleted_at IS NULL
       AND ${publicProject}
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN cities c ON c.id = bp.city_id
     WHERE bp.deleted_at IS NULL
       ${cityFilter}
     GROUP BY bp.id, bp.uuid, bp.company_name, bp.logo_url, bp.about, bp.year_established,
              c.uuid, c.name
     ORDER BY project_count DESC, bp.company_name ASC
     LIMIT ${safeLimit}`,
    params
  );

  if (!rows.length) {
    return { items: [], meta: { page: 1, limit: safeLimit, total: 0, totalPages: 1 } };
  }

  const builderUuids = rows.map((r) => r.uuid);
  const placeholders = builderUuids.map((_, i) => `:b${i}`).join(', ');
  const builderParams = Object.fromEntries(builderUuids.map((id, i) => [`b${i}`, id]));

  const [projectRows] = await query(
    `SELECT
       bp.uuid AS builder_uuid,
       p.uuid AS project_uuid,
       p.slug AS project_slug,
       p.name AS project_name,
       p.min_price,
       p.max_price,
       p.published_at,
       lo.name AS locality_name,
       ci.name AS city_name,
       (SELECT pm.file_path FROM project_media pm
        WHERE pm.project_id = p.id AND pm.deleted_at IS NULL AND pm.media_type = 'image'
        ORDER BY pm.is_primary DESC, pm.sort_order ASC, pm.id ASC LIMIT 1) AS primary_image
     FROM builder_profiles bp
     INNER JOIN projects p ON p.builder_id = bp.id
       AND p.deleted_at IS NULL
       AND ${publicProject}
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     WHERE bp.uuid IN (${placeholders})
     ORDER BY p.published_at DESC, p.id DESC`,
    builderParams
  );

  const projectByBuilder = {};
  projectRows.forEach((r) => {
    if (projectByBuilder[r.builder_uuid]) return;
    projectByBuilder[r.builder_uuid] = {
      id: r.project_uuid,
      slug: r.project_slug,
      name: r.project_name,
      minPrice: r.min_price != null ? Number(r.min_price) : null,
      maxPrice: r.max_price != null ? Number(r.max_price) : null,
      location: [r.locality_name, r.city_name].filter(Boolean).join(', '),
      primaryImage: r.primary_image ? `/uploads/${r.primary_image}` : null,
    };
  });

  const items = rows.map((r) => {
    let logoUrl = r.logo_url || null;
    if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('/')) {
      logoUrl = `/uploads/${logoUrl}`;
    } else if (logoUrl && logoUrl.startsWith('uploads/')) {
      logoUrl = `/${logoUrl}`;
    }
    return {
      id: r.uuid,
      companyName: r.company_name,
      logoUrl,
      about: r.about,
      yearEstablished: r.year_established,
      projectCount: Number(r.project_count || 0),
      city: r.city_uuid ? { id: r.city_uuid, name: r.city_name } : null,
      featuredProject: projectByBuilder[r.uuid] || null,
    };
  });

  return {
    items,
    meta: {
      page: 1,
      limit: safeLimit,
      total: items.length,
      totalPages: 1,
    },
  };
}

export async function listTeam(user) {
  const profile = await getOrCreateProfileForUser(user);
  const raw = await getRawProfileByUserId(user.id);
  const [rows] = await query(
    `SELECT uuid, name, email, phone, role_title AS roleTitle, status, invited_at AS invitedAt, created_at AS createdAt
     FROM builder_team_members
     WHERE builder_id = :builderId AND deleted_at IS NULL
     ORDER BY id DESC`,
    { builderId: raw.id }
  );
  return {
    builder: profile,
    members: rows.map((r) => ({
      id: r.uuid,
      name: r.name,
      email: r.email,
      phone: r.phone,
      roleTitle: r.roleTitle,
      status: r.status,
      invitedAt: r.invitedAt,
      createdAt: r.createdAt,
    })),
  };
}

export async function addTeamMember(user, payload, req) {
  const raw = await getRawProfileByUserId(user.id);
  if (!raw) await getOrCreateProfileForUser(user, payload);
  const builder = await getRawProfileByUserId(user.id);

  const uuid = generateUuid();
  await query(
    `INSERT INTO builder_team_members
      (uuid, builder_id, name, email, phone, role_title, status, invited_at)
     VALUES (:uuid, :builderId, :name, :email, :phone, :roleTitle, 'active', NOW())`,
    {
      uuid,
      builderId: builder.id,
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      roleTitle: payload.roleTitle || null,
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'builders.team.add',
    entityType: 'builder_team_member',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return listTeam(user);
}

export async function removeTeamMember(user, memberUuid, req) {
  const builder = await getRawProfileByUserId(user.id);
  if (!builder) throw new ApiError(404, 'Builder profile not found');
  const [rows] = await query(
    `SELECT id FROM builder_team_members
     WHERE uuid = :uuid AND builder_id = :builderId AND deleted_at IS NULL LIMIT 1`,
    { uuid: memberUuid, builderId: builder.id }
  );
  if (!rows.length) throw new ApiError(404, 'Team member not found');
  await query(`UPDATE builder_team_members SET deleted_at = NOW(), status = 'inactive' WHERE id = :id`, {
    id: rows[0].id,
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: 'builders.team.remove',
    entityType: 'builder_team_member',
    entityId: memberUuid,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return listTeam(user);
}
