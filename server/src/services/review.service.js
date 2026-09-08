import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';

export async function createReview(payload, user, req) {
  if (!user) {
    throw new ApiError(401, 'Buyer login required to submit a review');
  }
  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be an integer from 1 to 5');
  }
  if (!payload.body?.trim() || payload.body.trim().length < 10) {
    throw new ApiError(400, 'Review body must be at least 10 characters');
  }

  const [props] = await query(
    `SELECT id, uuid, title, listed_by_user_id AS listedByUserId, status
     FROM properties WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: payload.propertyId }
  );
  if (!props.length || props[0].status !== 'approved') {
    throw new ApiError(404, 'Property not found');
  }
  if (props[0].listedByUserId === user.id) {
    throw new ApiError(400, 'You cannot review your own property');
  }

  const uuid = generateUuid();
  try {
    await query(
      `INSERT INTO reviews (uuid, property_id, user_id, rating, title, body, status)
       VALUES (:uuid, :propertyId, :userId, :rating, :title, :body, 'pending')`,
      {
        uuid,
        propertyId: props[0].id,
        userId: user.id,
        rating,
        title: payload.title || null,
        body: payload.body.trim(),
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'You already reviewed this property');
    }
    throw err;
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'reviews.create',
    entityType: 'review',
    entityId: uuid,
    newValues: { propertyId: props[0].uuid, rating },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getReviewByUuid(uuid);
}

export async function getReviewByUuid(uuid) {
  const [rows] = await query(
    `SELECT r.uuid, r.rating, r.title, r.body, r.status, r.created_at AS createdAt,
            p.uuid AS propertyId, p.title AS propertyTitle, p.slug AS propertySlug,
            u.uuid AS userId, u.first_name AS firstName, u.last_name AS lastName
     FROM reviews r
     INNER JOIN properties p ON p.id = r.property_id
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.uuid = :uuid AND r.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Review not found');
  const r = rows[0];
  return {
    id: r.uuid,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt,
    property: { id: r.propertyId, title: r.propertyTitle, slug: r.propertySlug },
    user: {
      id: r.userId,
      name: `${r.firstName}${r.lastName ? ` ${r.lastName}` : ''}`,
    },
  };
}

export async function listPropertyReviews(propertyUuid, { includePending = false } = {}) {
  const [props] = await query(
    `SELECT id FROM properties WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: propertyUuid }
  );
  if (!props.length) throw new ApiError(404, 'Property not found');

  const statusFilter = includePending ? '' : `AND r.status = 'approved'`;
  const [rows] = await query(
    `SELECT r.uuid, r.rating, r.title, r.body, r.status, r.created_at AS createdAt,
            u.uuid AS userId, u.first_name AS firstName, u.last_name AS lastName
     FROM reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.property_id = :propertyId AND r.deleted_at IS NULL ${statusFilter}
     ORDER BY r.id DESC`,
    { propertyId: props[0].id }
  );

  const [avg] = await query(
    `SELECT AVG(rating) AS average, COUNT(*) AS total
     FROM reviews
     WHERE property_id = :propertyId AND deleted_at IS NULL AND status = 'approved'`,
    { propertyId: props[0].id }
  );

  return {
    averageRating: avg[0].average ? Number(Number(avg[0].average).toFixed(1)) : 0,
    total: Number(avg[0].total),
    items: rows.map((r) => ({
      id: r.uuid,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      user: {
        id: r.userId,
        name: `${r.firstName}${r.lastName ? ` ${r.lastName}` : ''}`,
      },
    })),
  };
}

export async function listMyReviews(userId) {
  const [rows] = await query(
    `SELECT r.uuid, r.rating, r.title, r.body, r.status, r.created_at AS createdAt,
            p.uuid AS propertyId, p.title AS propertyTitle, p.slug AS propertySlug
     FROM reviews r
     INNER JOIN properties p ON p.id = r.property_id
     WHERE r.user_id = :userId AND r.deleted_at IS NULL
     ORDER BY r.id DESC`,
    { userId }
  );
  return rows.map((r) => ({
    id: r.uuid,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt,
    property: { id: r.propertyId, title: r.propertyTitle, slug: r.propertySlug },
  }));
}

export async function listPendingReviews({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM reviews WHERE deleted_at IS NULL AND status = 'pending'`
  );
  const [rows] = await query(
    `SELECT r.uuid, r.rating, r.title, r.body, r.status, r.created_at AS createdAt,
            p.uuid AS propertyId, p.title AS propertyTitle, p.slug AS propertySlug,
            u.uuid AS userId, u.first_name AS firstName, u.email
     FROM reviews r
     INNER JOIN properties p ON p.id = r.property_id
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.deleted_at IS NULL AND r.status = 'pending'
     ORDER BY r.id ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
  );

  return {
    items: rows.map((r) => ({
      id: r.uuid,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      property: { id: r.propertyId, title: r.propertyTitle, slug: r.propertySlug },
      user: { id: r.userId, name: r.firstName, email: r.email },
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function moderateReview(uuid, { status, rejectionReason }, actor, req) {
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Invalid moderation status');
  }
  const [rows] = await query(
    `SELECT r.*, u.email, u.id AS authorId, p.title AS propertyTitle
     FROM reviews r
     INNER JOIN users u ON u.id = r.user_id
     INNER JOIN properties p ON p.id = r.property_id
     WHERE r.uuid = :uuid AND r.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Review not found');
  const review = rows[0];
  if (review.status !== 'pending') {
    throw new ApiError(400, 'Review already moderated');
  }

  await query(
    `UPDATE reviews SET
      status = :status,
      rejection_reason = :rejectionReason,
      moderated_by = :actorId,
      moderated_at = NOW()
     WHERE id = :id`,
    {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason || 'Rejected' : null,
      actorId: actor.id,
      id: review.id,
    }
  );

  await notifyUser(review.authorId, {
    type: `review.${status}`,
    title: `Review ${status}`,
    body: `Your review on "${review.propertyTitle}" was ${status}.`,
    data: { reviewId: uuid, status },
    email: review.email,
  });

  await writeAuditLog({
    actorUserId: actor.id,
    action: 'reviews.moderate',
    entityType: 'review',
    entityId: review.id,
    newValues: { status, rejectionReason },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getReviewByUuid(uuid);
}
