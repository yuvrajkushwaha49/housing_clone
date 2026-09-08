import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

const ROLE_SCOPE = {
  AGENT: 'agent',
  OWNER: 'owner',
  BUILDER: 'builder',
};

const DEFAULT_LIMITS = {
  agent: { listingLimit: 3, featuredLimit: 0 },
  owner: { listingLimit: 2, featuredLimit: 0 },
  builder: { listingLimit: 5, featuredLimit: 1 },
};

function mapPlan(r) {
  return {
    id: r.uuid,
    code: r.code,
    name: r.name,
    roleScope: r.role_scope,
    price: Number(r.price),
    currency: r.currency,
    durationDays: r.duration_days,
    listingLimit: r.listing_limit,
    featuredLimit: r.featured_limit,
    features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features || [],
    description: r.description,
    isActive: Boolean(r.is_active),
  };
}

export async function listPlans({ roleScope, activeOnly = true } = {}) {
  const where = ['deleted_at IS NULL'];
  const params = {};
  if (activeOnly) where.push('is_active = 1');
  if (roleScope) {
    where.push('role_scope = :roleScope');
    params.roleScope = roleScope;
  }
  const [rows] = await query(
    `SELECT uuid, code, name, role_scope, price, currency, duration_days, listing_limit, featured_limit,
            features, description, is_active
     FROM subscription_plans
     WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, price ASC`,
    params
  );
  return rows.map(mapPlan);
}

export async function getActiveSubscription(userId) {
  await expireOverdue(userId);
  const [rows] = await query(
    `SELECT s.uuid, s.starts_at AS startsAt, s.ends_at AS endsAt, s.status, s.payment_ref AS paymentRef,
            s.amount_paid AS amountPaid,
            p.uuid AS planUuid, p.code, p.name, p.role_scope, p.price, p.currency, p.duration_days,
            p.listing_limit, p.featured_limit, p.features, p.description, p.is_active
     FROM subscriptions s
     INNER JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.user_id = :userId AND s.status = 'active' AND s.deleted_at IS NULL
       AND s.ends_at >= NOW()
     ORDER BY s.ends_at DESC
     LIMIT 1`,
    { userId }
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.uuid,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    status: r.status,
    paymentRef: r.paymentRef,
    amountPaid: Number(r.amountPaid),
    plan: mapPlan({
      uuid: r.planUuid,
      code: r.code,
      name: r.name,
      role_scope: r.role_scope,
      price: r.price,
      currency: r.currency,
      duration_days: r.duration_days,
      listing_limit: r.listing_limit,
      featured_limit: r.featured_limit,
      features: r.features,
      description: r.description,
      is_active: r.is_active,
    }),
  };
}

async function expireOverdue(userId) {
  await query(
    `UPDATE subscriptions SET status = 'expired'
     WHERE user_id = :userId AND status = 'active' AND ends_at < NOW() AND deleted_at IS NULL`,
    { userId }
  );
}

async function resolveUserByUuid(userUuid) {
  const [rows] = await query(
    `SELECT u.id, u.uuid, r.code AS roleCode
     FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE u.uuid = :uuid AND u.deleted_at IS NULL
     LIMIT 1`,
    { uuid: userUuid }
  );
  if (!rows.length) throw new ApiError(404, 'User not found');
  return rows[0];
}

async function getActiveOverride(userId) {
  const [rows] = await query(
    `SELECT listing_limit_bonus AS listingLimitBonus,
            featured_limit_bonus AS featuredLimitBonus,
            notes, expires_at AS expiresAt
     FROM subscription_entitlement_overrides
     WHERE user_id = :userId
       AND (expires_at IS NULL OR expires_at >= NOW())
     LIMIT 1`,
    { userId }
  );
  return rows[0] || null;
}

export async function getEntitlements(user) {
  const scope = ROLE_SCOPE[user.roleCode];
  const defaults = scope ? DEFAULT_LIMITS[scope] : { listingLimit: 1, featuredLimit: 0 };
  const sub = await getActiveSubscription(user.id);
  const override = await getActiveOverride(user.id);

  const planListingLimit = sub?.plan?.listingLimit ?? defaults.listingLimit;
  const planFeaturedLimit = sub?.plan?.featuredLimit ?? defaults.featuredLimit;
  const listingLimit = planListingLimit + Number(override?.listingLimitBonus || 0);
  const featuredLimit = planFeaturedLimit + Number(override?.featuredLimitBonus || 0);

  const [counts] = await query(
    `SELECT
       SUM(CASE WHEN status IN ('pending','approved') THEN 1 ELSE 0 END) AS activeListings,
       SUM(CASE WHEN is_featured = 1 AND status IN ('pending','approved') THEN 1 ELSE 0 END) AS featuredListings
     FROM properties
     WHERE listed_by_user_id = :userId AND deleted_at IS NULL`,
    { userId: user.id }
  );

  const activeListings = Number(counts[0].activeListings || 0);
  const featuredListings = Number(counts[0].featuredListings || 0);

  return {
    roleScope: scope || null,
    subscription: sub,
    planListingLimit,
    planFeaturedLimit,
    listingLimitBonus: Number(override?.listingLimitBonus || 0),
    featuredLimitBonus: Number(override?.featuredLimitBonus || 0),
    overrideNotes: override?.notes || null,
    overrideExpiresAt: override?.expiresAt || null,
    listingLimit,
    featuredLimit,
    activeListings,
    featuredListings,
    canPublish: activeListings < listingLimit,
    canFeature: featuredListings < featuredLimit,
    remainingListings: Math.max(listingLimit - activeListings, 0),
    remainingUnits: Math.max(listingLimit - activeListings, 0),
  };
}

export async function getEntitlementsForUserUuid(userUuid) {
  const target = await resolveUserByUuid(userUuid);
  return getEntitlements({ id: target.id, roleCode: target.roleCode });
}

export async function assertCanPublishListing(user) {
  if (!['AGENT', 'OWNER', 'BUILDER'].includes(user.roleCode)) return;
  const entitlements = await getEntitlements(user);
  if (!entitlements.canPublish) {
    throw new ApiError(
      403,
      `Listing limit reached (${entitlements.activeListings}/${entitlements.listingLimit} units). Upgrade your subscription or contact support to publish more.`
    );
  }
}

export async function assertCanFeatureListing(user) {
  if (!['AGENT', 'OWNER', 'BUILDER'].includes(user.roleCode)) return;
  const entitlements = await getEntitlements(user);
  if (!entitlements.canFeature) {
    throw new ApiError(
      403,
      `Featured listing limit reached (${entitlements.featuredListings}/${entitlements.featuredLimit}). Upgrade to feature more listings.`
    );
  }
}

export async function startSubscription(payload, user, req) {
  const scope = ROLE_SCOPE[user.roleCode];
  if (!scope) {
    throw new ApiError(403, 'Subscriptions are only available for Agent, Owner, and Builder roles');
  }

  const [plans] = await query(
    `SELECT id, uuid, code, name, role_scope, price, currency, duration_days, listing_limit, featured_limit,
            features, description, is_active
     FROM subscription_plans
     WHERE uuid = :uuid AND deleted_at IS NULL AND is_active = 1
     LIMIT 1`,
    { uuid: payload.planId }
  );
  if (!plans.length) throw new ApiError(404, 'Plan not found');
  if (plans[0].role_scope !== scope) {
    throw new ApiError(400, `This plan is for ${plans[0].role_scope} accounts`);
  }

  await expireOverdue(user.id);
  await query(
    `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = :userId AND status = 'active' AND deleted_at IS NULL`,
    { userId: user.id }
  );

  const uuid = generateUuid();
  const paymentRef = `STUB-${uuid.slice(0, 8).toUpperCase()}`;
  const duration = plans[0].duration_days;

  await query(
    `INSERT INTO subscriptions
      (uuid, user_id, plan_id, starts_at, ends_at, status, payment_ref, amount_paid, notes)
     VALUES
      (:uuid, :userId, :planId, NOW(), DATE_ADD(NOW(), INTERVAL :days DAY), 'active', :paymentRef, :amount, :notes)`,
    {
      uuid,
      userId: user.id,
      planId: plans[0].id,
      days: duration,
      paymentRef,
      amount: plans[0].price,
      notes: 'Payment gateway stub — treat as paid for MVP',
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'subscriptions.start',
    entityType: 'subscription',
    entityId: uuid,
    newValues: { plan: plans[0].code, paymentRef },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getActiveSubscription(user.id);
}

export async function adminListSubscriptions({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const where = ['s.deleted_at IS NULL'];
  const params = {};
  if (status) {
    where.push('s.status = :status');
    params.status = status;
  }
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM subscriptions s WHERE ${where.join(' AND ')}`,
    params
  );
  const [rows] = await query(
    `SELECT s.uuid, s.status, s.starts_at AS startsAt, s.ends_at AS endsAt, s.payment_ref AS paymentRef,
            s.amount_paid AS amountPaid, p.name AS planName, p.code AS planCode,
            u.uuid AS userId, u.email, u.first_name AS firstName, u.last_name AS lastName
     FROM subscriptions s
     INNER JOIN subscription_plans p ON p.id = s.plan_id
     INNER JOIN users u ON u.id = s.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY s.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return {
    items: rows.map((r) => ({
      id: r.uuid,
      status: r.status,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      paymentRef: r.paymentRef,
      amountPaid: Number(r.amountPaid),
      plan: { code: r.planCode, name: r.planName },
      user: {
        id: r.userId,
        email: r.email,
        name: `${r.firstName}${r.lastName ? ` ${r.lastName}` : ''}`,
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

export async function adminUpsertPlan(payload, user, req, uuid = null) {
  if (uuid) {
    const [existing] = await query(
      `SELECT id FROM subscription_plans WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid }
    );
    if (!existing.length) throw new ApiError(404, 'Plan not found');
    await query(
      `UPDATE subscription_plans SET
        name = :name, price = :price, duration_days = :durationDays,
        listing_limit = :listingLimit, featured_limit = :featuredLimit,
        features = :features, description = :description, is_active = :isActive
       WHERE id = :id`,
      {
        id: existing[0].id,
        name: payload.name,
        price: payload.price,
        durationDays: payload.durationDays,
        listingLimit: payload.listingLimit,
        featuredLimit: payload.featuredLimit ?? 0,
        features: JSON.stringify(payload.features || []),
        description: payload.description || null,
        isActive: payload.isActive === false ? 0 : 1,
      }
    );
    await writeAuditLog({
      actorUserId: user.id,
      action: 'plans.update',
      entityType: 'subscription_plan',
      entityId: uuid,
      newValues: payload,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    const plans = await listPlans({ activeOnly: false });
    return plans.find((p) => p.id === uuid);
  }

  const newUuid = generateUuid();
  const code =
    payload.code ||
    `${payload.roleScope}-${String(payload.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  await query(
    `INSERT INTO subscription_plans
      (uuid, code, name, role_scope, price, duration_days, listing_limit, featured_limit, features, description, is_active)
     VALUES (:uuid, :code, :name, :roleScope, :price, :durationDays, :listingLimit, :featuredLimit, :features, :description, :isActive)`,
    {
      uuid: newUuid,
      code,
      name: payload.name,
      roleScope: payload.roleScope,
      price: payload.price,
      durationDays: payload.durationDays,
      listingLimit: payload.listingLimit,
      featuredLimit: payload.featuredLimit ?? 0,
      features: JSON.stringify(payload.features || []),
      description: payload.description || null,
      isActive: payload.isActive === false ? 0 : 1,
    }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'plans.create',
    entityType: 'subscription_plan',
    entityId: newUuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  const plans = await listPlans({ activeOnly: false });
  return plans.find((p) => p.id === newUuid);
}

export async function adminGrantSubscription(userUuid, payload, actor, req) {
  const target = await resolveUserByUuid(userUuid);
  const scope = ROLE_SCOPE[target.roleCode];
  if (!scope) {
    throw new ApiError(400, 'Subscriptions apply only to Builder, Agent, and Owner accounts');
  }

  const [plans] = await query(
    `SELECT id, uuid, code, name, role_scope, price, currency, duration_days, listing_limit, featured_limit,
            features, description, is_active
     FROM subscription_plans
     WHERE uuid = :uuid AND deleted_at IS NULL AND is_active = 1
     LIMIT 1`,
    { uuid: payload.planId }
  );
  if (!plans.length) throw new ApiError(404, 'Plan not found');
  if (plans[0].role_scope !== scope) {
    throw new ApiError(400, `This plan is for ${plans[0].role_scope} accounts`);
  }

  await expireOverdue(target.id);
  await query(
    `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = :userId AND status = 'active' AND deleted_at IS NULL`,
    { userId: target.id }
  );

  const subUuid = generateUuid();
  const duration = payload.durationDays ?? plans[0].duration_days;
  const paymentRef = payload.paymentRef || `ADMIN-${subUuid.slice(0, 8).toUpperCase()}`;

  await query(
    `INSERT INTO subscriptions
      (uuid, user_id, plan_id, starts_at, ends_at, status, payment_ref, amount_paid, notes)
     VALUES
      (:uuid, :userId, :planId, NOW(), DATE_ADD(NOW(), INTERVAL :days DAY), 'active', :paymentRef, :amount, :notes)`,
    {
      uuid: subUuid,
      userId: target.id,
      planId: plans[0].id,
      days: duration,
      paymentRef,
      amount: plans[0].price,
      notes: payload.notes || 'Granted by admin',
    }
  );

  await writeAuditLog({
    actorUserId: actor.id,
    action: 'subscriptions.admin_grant',
    entityType: 'subscription',
    entityId: subUuid,
    newValues: { userUuid, plan: plans[0].code, durationDays: duration },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getEntitlements({ id: target.id, roleCode: target.roleCode });
}

export async function adminSetEntitlementOverride(userUuid, payload, actor, req) {
  const target = await resolveUserByUuid(userUuid);
  const scope = ROLE_SCOPE[target.roleCode];
  if (!scope) {
    throw new ApiError(400, 'Posting limits apply only to Builder, Agent, and Owner accounts');
  }

  const listingBonus = Math.max(0, Number(payload.listingLimitBonus ?? 0));
  const featuredBonus = Math.max(0, Number(payload.featuredLimitBonus ?? 0));
  const notes = payload.notes?.trim() || null;
  const expiresAt = payload.expiresAt || null;

  const [existing] = await query(
    `SELECT id FROM subscription_entitlement_overrides WHERE user_id = :userId LIMIT 1`,
    { userId: target.id }
  );

  if (existing.length) {
    await query(
      `UPDATE subscription_entitlement_overrides SET
        listing_limit_bonus = :listingBonus,
        featured_limit_bonus = :featuredBonus,
        notes = :notes,
        expires_at = :expiresAt,
        updated_by = :updatedBy
       WHERE user_id = :userId`,
      {
        userId: target.id,
        listingBonus,
        featuredBonus,
        notes,
        expiresAt,
        updatedBy: actor.id,
      }
    );
  } else {
    await query(
      `INSERT INTO subscription_entitlement_overrides
        (user_id, listing_limit_bonus, featured_limit_bonus, notes, expires_at, created_by, updated_by)
       VALUES (:userId, :listingBonus, :featuredBonus, :notes, :expiresAt, :createdBy, :updatedBy)`,
      {
        userId: target.id,
        listingBonus,
        featuredBonus,
        notes,
        expiresAt,
        createdBy: actor.id,
        updatedBy: actor.id,
      }
    );
  }

  await writeAuditLog({
    actorUserId: actor.id,
    action: 'subscriptions.override',
    entityType: 'user',
    entityId: userUuid,
    newValues: { listingLimitBonus: listingBonus, featuredLimitBonus: featuredBonus, notes, expiresAt },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getEntitlements({ id: target.id, roleCode: target.roleCode });
}
