import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import { buildReviewItemsForProject } from '../helpers/projectReviewFields.helper.js';

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
  return {
    id: row.uuid,
    submissionNumber: row.submission_number,
    status: row.status,
    decision: row.decision,
    reviewerNotes: row.reviewer_notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    averageRating: items.length
      ? Math.round((items.reduce((sum, item) => sum + (item.rating ?? 0), 0) / items.length) * 10) / 10
      : null,
    items,
  };
}

async function getProjectRow(uuid) {
  const [rows] = await query(
    `SELECT id, uuid, name, status, builder_id, submission_count, rejection_reason, resubmit_note
     FROM projects WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Project not found');
  return rows[0];
}

async function loadSessionItems(sessionId) {
  const [items] = await query(
    `SELECT uuid, section_key, field_key, entity_uuid, title, status, rating, rejection_reason
     FROM project_review_items WHERE session_id = :sessionId ORDER BY id`,
    { sessionId }
  );
  return items.map(mapReviewItem);
}

export async function getProjectReview(projectUuid, { preferActive = true } = {}) {
  const project = await getProjectRow(projectUuid);
  const order = preferActive
    ? `ORDER BY CASE WHEN s.status = 'in_review' THEN 0 ELSE 1 END, s.created_at DESC`
    : `ORDER BY s.created_at DESC`;

  const [sessions] = await query(
    `SELECT s.uuid, s.submission_number, s.status, s.decision, s.reviewer_notes, s.completed_at, s.created_at
     FROM project_review_sessions s
     WHERE s.project_id = :projectId
     ${order}
     LIMIT 1`,
    { projectId: project.id }
  );
  if (!sessions.length) return null;

  const [sessionRows] = await query(
    `SELECT id FROM project_review_sessions WHERE uuid = :uuid LIMIT 1`,
    { uuid: sessions[0].uuid }
  );
  if (sessions[0].status === 'in_review') {
    await syncReviewItemsIfNeeded(project.id, sessionRows[0].id);
  }
  const items = await loadSessionItems(sessionRows[0].id);
  return mapReviewSession(sessions[0], items);
}

async function buildReviewItems(projectId) {
  return buildReviewItemsForProject(projectId);
}

function reviewItemKey(item) {
  return `${item.sectionKey}|${item.fieldKey}|${item.entityUuid || ''}`;
}

async function syncReviewItemsIfNeeded(projectId, sessionId) {
  const expected = await buildReviewItems(projectId);
  const current = await loadSessionItems(sessionId);
  const expectedSig = expected.map(reviewItemKey).sort().join('\n');
  const currentSig = current.map(reviewItemKey).sort().join('\n');
  if (expectedSig === currentSig) return;

  await query(`DELETE FROM project_review_items WHERE session_id = :sessionId`, { sessionId });
  for (const def of expected) {
    await query(
      `INSERT INTO project_review_items
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

export async function createReviewSession(projectUuid) {
  const project = await getProjectRow(projectUuid);

  const [active] = await query(
    `SELECT id FROM project_review_sessions
     WHERE project_id = :projectId AND status = 'in_review' LIMIT 1`,
    { projectId: project.id }
  );
  if (active.length) {
    await query(`DELETE FROM project_review_items WHERE session_id = :id`, { id: active[0].id });
    await query(`DELETE FROM project_review_sessions WHERE id = :id`, { id: active[0].id });
  }

  const sessionUuid = generateUuid();
  const submissionNumber = Number(project.submission_count || 0) + 1;
  await query(
    `INSERT INTO project_review_sessions (uuid, project_id, submission_number, status)
     VALUES (:uuid, :projectId, :submissionNumber, 'in_review')`,
    { uuid: sessionUuid, projectId: project.id, submissionNumber }
  );

  const [sessionRows] = await query(
    `SELECT id FROM project_review_sessions WHERE uuid = :uuid LIMIT 1`,
    { uuid: sessionUuid }
  );
  const sessionId = sessionRows[0].id;

  const definitions = await buildReviewItems(project.id);
  for (const def of definitions) {
    await query(
      `INSERT INTO project_review_items
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

  return getProjectReview(projectUuid);
}

export async function completeProjectReview(projectUuid, payload, user) {
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode)) {
    throw new ApiError(403, 'Only admins can complete project reviews');
  }

  const project = await getProjectRow(projectUuid);
  if (project.status !== 'pending') {
    throw new ApiError(400, 'Project is not pending review');
  }

  const [sessions] = await query(
    `SELECT id FROM project_review_sessions
     WHERE project_id = :projectId AND status = 'in_review'
     ORDER BY created_at DESC LIMIT 1`,
    { projectId: project.id }
  );
  if (!sessions.length) throw new ApiError(400, 'No active review session found');

  const sessionId = sessions[0].id;
  const [dbItems] = await query(
    `SELECT id, uuid, section_key AS sectionKey, field_key AS fieldKey,
            entity_uuid AS entityUuid, title
     FROM project_review_items WHERE session_id = :sessionId`,
    { sessionId }
  );

  if (payload.projectDecision === 'rejected') {
    const rejectionReason = payload.rejectionReason?.trim();
    if (!rejectionReason) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    for (const dbItem of dbItems) {
      await query(
        `UPDATE project_review_items
         SET status = 'approved', rating = 0, rejection_reason = NULL
         WHERE id = :id`,
        { id: dbItem.id }
      );
    }

    await query(
      `UPDATE project_review_sessions
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
      `UPDATE projects SET
        status = 'rejected',
        rejection_reason = :rejectionReason,
        published_at = NULL,
        approved_at = NULL,
        approved_by = NULL,
        updated_by = :actorId
       WHERE id = :id`,
      {
        id: project.id,
        rejectionReason,
        actorId: user.id,
      }
    );

    const [builders] = await query(
      `SELECT u.id, u.email FROM builder_profiles bp
       INNER JOIN users u ON u.id = bp.user_id
       WHERE bp.id = :id LIMIT 1`,
      { id: project.builder_id }
    );
    if (builders.length) {
      await notifyUser(builders[0].id, {
        type: 'project.rejected',
        title: 'Project review failed',
        body: `Your project "${project.name}" was rejected. Reason: ${rejectionReason}`,
        data: { projectId: project.uuid, status: 'rejected' },
        email: builders[0].email,
      });
    }

    return getProjectReview(projectUuid);
  }

  const payloadById = Object.fromEntries((payload.items || []).map((item) => [item.id, item]));
  const rejectedTowerUuids = new Set(
    (payload.items || [])
      .filter((item) => item.sectionKey === 'tower' && item.status === 'rejected' && item.entityUuid)
      .map((item) => item.entityUuid)
  );

  const [unitsWithTowers] = await query(
    `SELECT u.uuid AS unitUuid, t.uuid AS towerUuid
     FROM project_units u
     LEFT JOIN project_towers t ON t.id = u.tower_id
     WHERE u.project_id = :projectId AND u.deleted_at IS NULL`,
    { projectId: project.id }
  );
  const unitTowerMap = Object.fromEntries(
    unitsWithTowers.map((row) => [row.unitUuid, row.towerUuid])
  );

  const [projectAmenities] = await query(
    `SELECT a.uuid FROM project_amenities pa
     INNER JOIN amenities a ON a.id = pa.amenity_id
     WHERE pa.project_id = :projectId`,
    { projectId: project.id }
  );
  const selectedAmenityUuids = new Set(projectAmenities.map((row) => row.uuid));

  const [galleryImages] = await query(
    `SELECT uuid FROM project_media
     WHERE project_id = :projectId AND deleted_at IS NULL AND media_type = 'image'`,
    { projectId: project.id }
  );
  const hasGalleryImages = galleryImages.length > 0;

  const [documentRows] = await query(
    `SELECT uuid FROM project_media
     WHERE project_id = :projectId AND deleted_at IS NULL AND media_type = 'document'`,
    { projectId: project.id }
  );
  const hasDocuments = documentRows.length > 0;

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
      && dbItem.entityUuid
      && !selectedAmenityUuids.has(dbItem.entityUuid);

    const isSkippedGalleryField = dbItem.sectionKey === 'gallery' && !hasGalleryImages;
    const isSkippedDocumentField = dbItem.sectionKey === 'document' && !hasDocuments;

    if (isNotSelectedAmenity || isSkippedGalleryField || isSkippedDocumentField) {
      status = 'approved';
      rating = 0;
      rejectionReason = null;
    } else if (
      dbItem.sectionKey === 'unit'
      && dbItem.entityUuid
      && rejectedTowerUuids.has(unitTowerMap[dbItem.entityUuid])
    ) {
      status = 'rejected';
      rating = 0;
      rejectionReason = rejectionReason || 'Rejected because parent tower was rejected';
    }

    if (status === 'approved') {
      const autoZero = isNotSelectedAmenity || isSkippedGalleryField || isSkippedDocumentField || rating === 0;
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
      `UPDATE project_review_items
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
  const decision = hasRejected ? 'rejected' : 'published';
  const projectStatus = hasRejected ? 'rejected' : 'published';
  const rejectionReason = hasRejected
    ? updatedItems
      .filter((item) => item.status === 'rejected')
      .map((item) => `${item.title}: ${item.rejectionReason}`)
      .join('\n')
    : null;

  await query(
    `UPDATE project_review_sessions
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
    `UPDATE projects SET
      status = :status,
      rejection_reason = :rejectionReason,
      resubmit_note = :resubmitNote,
      published_at = :publishedAt,
      approved_at = :approvedAt,
      approved_by = :approvedBy,
      updated_by = :actorId
     WHERE id = :id`,
    {
      id: project.id,
      status: projectStatus,
      rejectionReason,
      resubmitNote: projectStatus === 'published' ? null : project.resubmit_note,
      publishedAt: projectStatus === 'published' ? new Date() : null,
      approvedAt: projectStatus === 'published' ? new Date() : null,
      approvedBy: projectStatus === 'published' ? user.id : null,
      actorId: user.id,
    }
  );

  const [builders] = await query(
    `SELECT u.id, u.email FROM builder_profiles bp
     INNER JOIN users u ON u.id = bp.user_id
     WHERE bp.id = :id LIMIT 1`,
    { id: project.builder_id }
  );
  if (builders.length) {
    await notifyUser(builders[0].id, {
      type: `project.${projectStatus}`,
      title: projectStatus === 'published' ? 'Project published' : 'Project review failed',
      body: projectStatus === 'published'
        ? `Your project "${project.name}" passed review and is now live.`
        : `Your project "${project.name}" needs fixes. See field ratings in the project panel.`,
      data: { projectId: project.uuid, status: projectStatus },
      email: builders[0].email,
    });
  }

  return getProjectReview(projectUuid);
}
