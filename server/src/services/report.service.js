import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

export async function createPropertyReport(payload, user, req) {
  const [props] = await query(
    `SELECT id, uuid, title FROM properties WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: payload.propertyId }
  );
  if (!props.length) throw new ApiError(404, 'Property not found');

  const uuid = generateUuid();
  await query(
    `INSERT INTO property_reports
      (uuid, reporter_user_id, property_id, reason, details, status)
     VALUES (:uuid, :reporterId, :propertyId, :reason, :details, 'open')`,
    {
      uuid,
      reporterId: user?.id || null,
      propertyId: props[0].id,
      reason: payload.reason || 'other',
      details: payload.details || null,
    }
  );

  if (user) {
    await writeAuditLog({
      actorUserId: user.id,
      action: 'property_reports.create',
      entityType: 'property_report',
      entityId: uuid,
      newValues: { propertyId: props[0].uuid, reason: payload.reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  return { id: uuid, status: 'open' };
}

export async function listPropertyReports({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const where = ['pr.deleted_at IS NULL'];
  const params = {};
  if (status) {
    where.push('pr.status = :status');
    params.status = status;
  }
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM property_reports pr WHERE ${where.join(' AND ')}`,
    params
  );
  const [rows] = await query(
    `SELECT pr.uuid, pr.reason, pr.details, pr.status, pr.handler_notes AS handlerNotes,
            pr.created_at AS createdAt, p.uuid AS propertyId, p.title AS propertyTitle, p.slug AS propertySlug,
            u.email AS reporterEmail, u.first_name AS reporterFirstName
     FROM property_reports pr
     INNER JOIN properties p ON p.id = pr.property_id
     LEFT JOIN users u ON u.id = pr.reporter_user_id
     WHERE ${where.join(' AND ')}
     ORDER BY FIELD(pr.status, 'open','reviewing','resolved','dismissed'), pr.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return {
    items: rows.map((r) => ({
      id: r.uuid,
      reason: r.reason,
      details: r.details,
      status: r.status,
      handlerNotes: r.handlerNotes,
      createdAt: r.createdAt,
      property: { id: r.propertyId, title: r.propertyTitle, slug: r.propertySlug },
      reporter: r.reporterEmail
        ? { email: r.reporterEmail, name: r.reporterFirstName }
        : null,
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function updatePropertyReport(uuid, payload, user, req) {
  const [rows] = await query(
    `SELECT id FROM property_reports WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Report not found');
  if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(payload.status)) {
    throw new ApiError(400, 'Invalid status');
  }
  await query(
    `UPDATE property_reports SET
      status = :status,
      handler_notes = COALESCE(:notes, handler_notes),
      handled_by = :handlerId
     WHERE id = :id`,
    {
      id: rows[0].id,
      status: payload.status,
      notes: payload.handlerNotes || null,
      handlerId: user.id,
    }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'property_reports.update',
    entityType: 'property_report',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  const list = await listPropertyReports({ limit: 1 });
  return list.items.find((i) => i.id === uuid) || { id: uuid, status: payload.status };
}

export async function getRoleReports(user) {
  const role = user.roleCode;

  if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    const [rows] = await query(
      `SELECT
         (SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL) AS totalProperties,
         (SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND status = 'pending') AS pendingProperties,
         (SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND status = 'approved') AS liveProperties,
         (SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL) AS totalLeads,
         (SELECT COUNT(*) FROM inquiries WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS inquiries30d,
         (SELECT COUNT(*) FROM site_visits WHERE deleted_at IS NULL AND scheduled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS visits30d,
         (SELECT COUNT(*) FROM support_tickets WHERE deleted_at IS NULL AND status IN ('open','in_progress','waiting')) AS openTickets,
         (SELECT COUNT(*) FROM subscriptions WHERE deleted_at IS NULL AND status = 'active' AND ends_at >= NOW()) AS activeSubscriptions,
         (SELECT COUNT(*) FROM reviews WHERE deleted_at IS NULL AND status = 'pending') AS pendingReviews,
         (SELECT COUNT(*) FROM property_reports WHERE deleted_at IS NULL AND status IN ('open','reviewing')) AS openReports`
    );
    const [byStatus] = await query(
      `SELECT status, COUNT(*) AS total FROM properties WHERE deleted_at IS NULL GROUP BY status`
    );
    const [leadsByStatus] = await query(
      `SELECT status, COUNT(*) AS total FROM leads WHERE deleted_at IS NULL GROUP BY status`
    );
    return {
      role,
      kpis: Object.fromEntries(
        Object.entries(rows[0]).map(([k, v]) => [k, Number(v)])
      ),
      propertiesByStatus: byStatus.map((r) => ({ status: r.status, total: Number(r.total) })),
      leadsByStatus: leadsByStatus.map((r) => ({ status: r.status, total: Number(r.total) })),
    };
  }

  if (['AGENT', 'OWNER', 'BUILDER'].includes(role)) {
    const [rows] = await query(
      `SELECT
         (SELECT COUNT(*) FROM properties WHERE listed_by_user_id = :uid AND deleted_at IS NULL) AS myProperties,
         (SELECT COUNT(*) FROM properties WHERE listed_by_user_id = :uid AND deleted_at IS NULL AND status = 'approved') AS liveProperties,
         (SELECT COUNT(*) FROM properties WHERE listed_by_user_id = :uid AND deleted_at IS NULL AND status = 'pending') AS pendingProperties,
         (SELECT COUNT(*) FROM leads WHERE assigned_to_user_id = :uid AND deleted_at IS NULL) AS myLeads,
         (SELECT COUNT(*) FROM inquiries i
            INNER JOIN properties p ON p.id = i.property_id
          WHERE p.listed_by_user_id = :uid AND i.deleted_at IS NULL) AS myInquiries,
         (SELECT COUNT(*) FROM site_visits v
            INNER JOIN properties p ON p.id = v.property_id
          WHERE p.listed_by_user_id = :uid AND v.deleted_at IS NULL) AS myVisits,
         (SELECT COALESCE(SUM(views_count),0) FROM properties WHERE listed_by_user_id = :uid AND deleted_at IS NULL) AS totalViews`,
      { uid: user.id }
    );
    const [byStatus] = await query(
      `SELECT status, COUNT(*) AS total FROM properties
       WHERE listed_by_user_id = :uid AND deleted_at IS NULL GROUP BY status`,
      { uid: user.id }
    );
    return {
      role,
      kpis: Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)])),
      propertiesByStatus: byStatus.map((r) => ({ status: r.status, total: Number(r.total) })),
    };
  }

  if (role === 'SUPPORT') {
    const [rows] = await query(
      `SELECT
         (SELECT COUNT(*) FROM support_tickets WHERE deleted_at IS NULL AND status IN ('open','in_progress','waiting')) AS openTickets,
         (SELECT COUNT(*) FROM support_tickets WHERE deleted_at IS NULL AND assigned_to = :uid) AS assignedToMe,
         (SELECT COUNT(*) FROM property_reports WHERE deleted_at IS NULL AND status IN ('open','reviewing')) AS openReports,
         (SELECT COUNT(*) FROM complaints WHERE deleted_at IS NULL AND status = 'open') AS openComplaints`,
      { uid: user.id }
    );
    return {
      role,
      kpis: Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)])),
    };
  }

  if (role === 'BUYER') {
    const [rows] = await query(
      `SELECT
         (SELECT COUNT(*) FROM wishlists WHERE user_id = :uid) AS saved,
         (SELECT COUNT(*) FROM site_visits WHERE requester_user_id = :uid AND deleted_at IS NULL) AS visits,
         (SELECT COUNT(*) FROM inquiries WHERE user_id = :uid AND deleted_at IS NULL) AS inquiries,
         (SELECT COUNT(*) FROM reviews WHERE user_id = :uid AND deleted_at IS NULL) AS reviews`,
      { uid: user.id }
    );
    return {
      role,
      kpis: Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)])),
    };
  }

  return { role, kpis: {} };
}
