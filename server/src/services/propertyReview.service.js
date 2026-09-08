import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import { buildReviewItemsForProperty } from '../helpers/propertyReviewFields.helper.js';
import { parsePlotAmenities } from '../helpers/plotAmenityFields.helper.js';

function mapReviewItem(row) {
  return {
    id: row.uuid,
    sectionKey: row.section_key,
    fieldKey: row.field_key,
    entityUuid: row.entity_uuid,
    title: row.title,
    status: row.status,
    rating: row.rating != null ? Number(row.rating) : null,
    rejectionReason: row.rejection_reason,
  };
}

function mapReviewSession(row, items = []) {
  if (!row) return null;
  const averageRating = computeAverageRating(items);
  return {
    id: row.uuid,
    submissionNumber: row.submission_number,
    status: row.status,
    decision: row.decision,
    reviewerNotes: row.reviewer_notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    averageRating,
    items,
  };
}

export function computeAverageRating(items = []) {
  if (!items?.length) return null;
  return Math.round((items.reduce((sum, item) => sum + (item.rating ?? 0), 0) / items.length) * 10) / 10;
}

async function getPropertyRow(uuid) {
  const [rows] = await query(
    `SELECT id, uuid, title, status, listed_by_user_id, submission_count, rejection_reason
     FROM properties WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Property not found');
  return rows[0];
}

async function loadSessionItems(sessionId) {
  const [items] = await query(
    `SELECT uuid, section_key, field_key, entity_uuid, title, status, rating, rejection_reason
     FROM property_review_items WHERE session_id = :sessionId ORDER BY id`,
    { sessionId }
  );
  return items.map(mapReviewItem);
}

export async function getPropertyReview(propertyUuid, { preferActive = true } = {}) {
  const property = await getPropertyRow(propertyUuid);
  const order = preferActive
    ? `ORDER BY CASE WHEN s.status = 'in_review' THEN 0 ELSE 1 END, s.created_at DESC`
    : `ORDER BY s.created_at DESC`;

  const [sessions] = await query(
    `SELECT s.uuid, s.submission_number, s.status, s.decision, s.reviewer_notes, s.completed_at, s.created_at
     FROM property_review_sessions s
     WHERE s.property_id = :propertyId
     ${order}
     LIMIT 1`,
    { propertyId: property.id }
  );
  if (!sessions.length) return null;

  const [sessionRows] = await query(
    `SELECT id FROM property_review_sessions WHERE uuid = :uuid LIMIT 1`,
    { uuid: sessions[0].uuid }
  );
  if (sessions[0].status === 'in_review') {
    await syncReviewItemsIfNeeded(property.id, sessionRows[0].id);
  }
  const items = await loadSessionItems(sessionRows[0].id);
  return mapReviewSession(sessions[0], items);
}

function reviewItemKey(item) {
  return `${item.sectionKey}|${item.fieldKey}|${item.entityUuid || ''}`;
}

async function syncReviewItemsIfNeeded(propertyId, sessionId) {
  const expected = await buildReviewItemsForProperty(propertyId);
  const current = await loadSessionItems(sessionId);
  const expectedSig = expected.map(reviewItemKey).sort().join('\n');
  const currentSig = current.map(reviewItemKey).sort().join('\n');
  if (expectedSig === currentSig) return;

  await query(`DELETE FROM property_review_items WHERE session_id = :sessionId`, { sessionId });
  for (const def of expected) {
    await query(
      `INSERT INTO property_review_items
        (uuid, session_id, section_key, field_key, entity_uuid, title, status)
       VALUES (:uuid, :sessionId, :sectionKey, :fieldKey, :entityUuid, :title, 'pending')`,
      {
        uuid: generateUuid(),
        sessionId,
        sectionKey: def.sectionKey,
        fieldKey: def.fieldKey,
        entityUuid: def.entityUuid,
        title: def.title,
      }
    );
  }
}

export async function createReviewSession(propertyUuid) {
  const property = await getPropertyRow(propertyUuid);

  const [active] = await query(
    `SELECT id FROM property_review_sessions
     WHERE property_id = :propertyId AND status = 'in_review' LIMIT 1`,
    { propertyId: property.id }
  );
  if (active.length) {
    await query(`DELETE FROM property_review_items WHERE session_id = :id`, { id: active[0].id });
    await query(`DELETE FROM property_review_sessions WHERE id = :id`, { id: active[0].id });
  }

  const sessionUuid = generateUuid();
  const submissionNumber = Number(property.submission_count || 0) + 1;
  await query(
    `INSERT INTO property_review_sessions (uuid, property_id, submission_number, status)
     VALUES (:uuid, :propertyId, :submissionNumber, 'in_review')`,
    { uuid: sessionUuid, propertyId: property.id, submissionNumber }
  );

  const [sessionRows] = await query(
    `SELECT id FROM property_review_sessions WHERE uuid = :uuid LIMIT 1`,
    { uuid: sessionUuid }
  );
  const sessionId = sessionRows[0].id;

  const definitions = await buildReviewItemsForProperty(property.id);
  for (const def of definitions) {
    await query(
      `INSERT INTO property_review_items
        (uuid, session_id, section_key, field_key, entity_uuid, title, status)
       VALUES (:uuid, :sessionId, :sectionKey, :fieldKey, :entityUuid, :title, 'pending')`,
      {
        uuid: generateUuid(),
        sessionId,
        sectionKey: def.sectionKey,
        fieldKey: def.fieldKey,
        entityUuid: def.entityUuid,
        title: def.title,
      }
    );
  }

  return getPropertyReview(propertyUuid);
}

export async function completePropertyReview(propertyUuid, payload, user) {
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode)) {
    throw new ApiError(403, 'Only admins can complete property reviews');
  }

  const property = await getPropertyRow(propertyUuid);
  if (property.status !== 'pending') {
    throw new ApiError(400, 'Property is not pending review');
  }

  const [sessions] = await query(
    `SELECT id FROM property_review_sessions
     WHERE property_id = :propertyId AND status = 'in_review'
     ORDER BY created_at DESC LIMIT 1`,
    { propertyId: property.id }
  );
  if (!sessions.length) throw new ApiError(400, 'No active review session found');

  const sessionId = sessions[0].id;

  if (payload.propertyDecision === 'rejected') {
    const rejectionReason = payload.rejectionReason?.trim();
    if (!rejectionReason) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    const [dbItems] = await query(
      `SELECT id FROM property_review_items WHERE session_id = :sessionId`,
      { sessionId }
    );

    for (const dbItem of dbItems) {
      await query(
        `UPDATE property_review_items
         SET status = 'approved', rating = 0, rejection_reason = NULL
         WHERE id = :id`,
        { id: dbItem.id }
      );
    }

    await query(
      `UPDATE property_review_sessions
       SET status = 'completed', decision = 'rejected', reviewer_id = :reviewerId,
           reviewer_notes = :reviewerNotes, completed_at = NOW()
       WHERE id = :id`,
      {
        id: sessionId,
        reviewerId: user.id,
        reviewerNotes: payload.reviewerNotes?.trim() || null,
      }
    );

    await query(
      `UPDATE properties SET
        status = 'rejected',
        rejection_reason = :rejectionReason,
        review_average_rating = NULL,
        approved_at = NULL,
        approved_by = NULL,
        updated_by = :actorId
       WHERE id = :id`,
      {
        id: property.id,
        rejectionReason,
        actorId: user.id,
      }
    );

    const [listers] = await query(
      `SELECT id, email FROM users WHERE id = :id LIMIT 1`,
      { id: property.listed_by_user_id }
    );
    if (listers.length) {
      await notifyUser(listers[0].id, {
        type: 'property.rejected',
        title: 'Property review failed',
        body: `Your listing "${property.title}" was rejected. Reason: ${rejectionReason}`,
        data: { propertyId: property.uuid, status: 'rejected' },
        email: listers[0].email,
      });
    }

    return getPropertyReview(propertyUuid);
  }

  const [dbItems] = await query(
    `SELECT id, uuid, section_key AS sectionKey, field_key AS fieldKey,
            entity_uuid AS entityUuid, title
     FROM property_review_items WHERE session_id = :sessionId`,
    { sessionId }
  );

  const payloadById = Object.fromEntries((payload.items || []).map((item) => [item.id, item]));

  const [propertyAmenities] = await query(
    `SELECT a.uuid FROM property_amenities pa
     INNER JOIN amenities a ON a.id = pa.amenity_id
     WHERE pa.property_id = :propertyId`,
    { propertyId: property.id }
  );
  const selectedAmenityUuids = new Set(propertyAmenities.map((row) => row.uuid));

  const [plotAmenityRows] = await query(
    `SELECT plot_amenities FROM properties WHERE id = :propertyId LIMIT 1`,
    { propertyId: property.id }
  );
  const plotAmenities = parsePlotAmenities(plotAmenityRows[0]?.plot_amenities);

  const [galleryImages] = await query(
    `SELECT uuid FROM property_media
     WHERE property_id = :propertyId AND deleted_at IS NULL AND media_type = 'image'`,
    { propertyId: property.id }
  );
  const hasGalleryImages = galleryImages.length > 0;

  const updatedItems = [];
  for (const dbItem of dbItems) {
    const input = payloadById[dbItem.uuid];
    if (!input) {
      throw new ApiError(400, `Missing review for field: ${dbItem.title}`);
    }

    let status = input.status === 'rejected' ? 'rejected' : 'approved';
    let rating = status === 'rejected' ? 0 : Number(input.rating);
    let rejectionReason = input.rejectionReason?.trim() || null;

    const isNotSelectedAmenity =
      dbItem.sectionKey === 'amenity'
      && dbItem.fieldKey === 'selection'
      && dbItem.entityUuid
      && !selectedAmenityUuids.has(dbItem.entityUuid);

    const isEmptyPlotAmenity =
      dbItem.sectionKey === 'amenity'
      && dbItem.fieldKey === 'plotAmenity'
      && dbItem.entityUuid
      && !String(plotAmenities[dbItem.entityUuid] || '').trim();

    const isSkippedGalleryField = dbItem.sectionKey === 'gallery' && !hasGalleryImages;

    if (isNotSelectedAmenity || isEmptyPlotAmenity || isSkippedGalleryField) {
      status = 'approved';
      rating = 0;
      rejectionReason = null;
    } else if (status === 'approved') {
      const autoZero = isNotSelectedAmenity || isEmptyPlotAmenity || isSkippedGalleryField || rating === 0;
      if (!autoZero && (!Number.isFinite(rating) || rating < 1 || rating > 10)) {
        throw new ApiError(400, `Rating 1-10 required for approved field: ${dbItem.title}`);
      }
      if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
        throw new ApiError(400, `Rating 0-10 required for field: ${dbItem.title}`);
      }
    } else {
      rating = 0;
      if (!rejectionReason) {
        throw new ApiError(400, `Rejection reason required for: ${dbItem.title}`);
      }
    }

    await query(
      `UPDATE property_review_items
       SET status = :status, rating = :rating, rejection_reason = :rejectionReason
       WHERE id = :id`,
      { id: dbItem.id, status, rating, rejectionReason }
    );

    updatedItems.push({
      id: dbItem.uuid,
      sectionKey: dbItem.sectionKey,
      fieldKey: dbItem.fieldKey,
      entityUuid: dbItem.entityUuid,
      title: dbItem.title,
      status,
      rating,
      rejectionReason,
    });
  }

  const hasRejected = updatedItems.some((item) => item.status === 'rejected');
  const decision = hasRejected ? 'rejected' : 'approved';
  const propertyStatus = hasRejected ? 'rejected' : 'approved';
  const rejectionReason = hasRejected
    ? updatedItems
      .filter((item) => item.status === 'rejected')
      .map((item) => `${item.title}: ${item.rejectionReason}`)
      .join('\n')
    : null;
  const reviewAverageRating = propertyStatus === 'approved'
    ? computeAverageRating(updatedItems)
    : null;

  await query(
    `UPDATE property_review_sessions
     SET status = 'completed', decision = :decision, reviewer_id = :reviewerId,
         reviewer_notes = :reviewerNotes, completed_at = NOW()
     WHERE id = :id`,
    {
      id: sessionId,
      decision,
      reviewerId: user.id,
      reviewerNotes: payload.reviewerNotes?.trim() || null,
    }
  );

  await query(
    `UPDATE properties SET
      status = :status,
      rejection_reason = :rejectionReason,
      review_average_rating = :reviewAverageRating,
      approved_at = :approvedAt,
      approved_by = :approvedBy,
      updated_by = :actorId
     WHERE id = :id`,
    {
      id: property.id,
      status: propertyStatus,
      rejectionReason,
      reviewAverageRating,
      approvedAt: propertyStatus === 'approved' ? new Date() : null,
      approvedBy: propertyStatus === 'approved' ? user.id : null,
      actorId: user.id,
    }
  );

  const [listers] = await query(
    `SELECT id, email FROM users WHERE id = :id LIMIT 1`,
    { id: property.listed_by_user_id }
  );
  if (listers.length) {
    await notifyUser(listers[0].id, {
      type: `property.${propertyStatus}`,
      title: propertyStatus === 'approved' ? 'Property approved' : 'Property review failed',
      body: propertyStatus === 'approved'
        ? `Your listing "${property.title}" passed review and is now live.`
        : `Your listing "${property.title}" needs fixes. See field ratings in your property panel.`,
      data: { propertyId: property.uuid, status: propertyStatus },
      email: listers[0].email,
    });
  }

  return getPropertyReview(propertyUuid);
}
