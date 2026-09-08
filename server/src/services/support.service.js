import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

function ticketNumber() {
  const n = Date.now().toString().slice(-8);
  return `TKT-${n}`;
}

export async function createTicket(payload, user, req) {
  if (!payload.subject?.trim() || !payload.message?.trim()) {
    throw new ApiError(400, 'Subject and message are required');
  }

  const uuid = generateUuid();
  const number = ticketNumber();
  const msgUuid = generateUuid();

  await withTransaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO support_tickets
        (uuid, ticket_number, user_id, subject, category, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [
        uuid,
        number,
        user.id,
        payload.subject.trim(),
        payload.category || 'other',
        payload.priority || 'medium',
      ]
    );
    await conn.execute(
      `INSERT INTO support_ticket_messages (uuid, ticket_id, sender_user_id, message)
       VALUES (?, ?, ?, ?)`,
      [msgUuid, result.insertId, user.id, payload.message.trim()]
    );
  });

  const [support] = await query(
    `SELECT u.id, u.email FROM users u
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE r.code = 'SUPPORT' AND u.deleted_at IS NULL AND u.status = 'active'
     LIMIT 1`
  );
  if (support.length) {
    await notifyUser(support[0].id, {
      type: 'ticket.new',
      title: `New ticket ${number}`,
      body: payload.subject.trim(),
      data: { ticketId: uuid },
      email: support[0].email,
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'tickets.create',
    entityType: 'support_ticket',
    entityId: uuid,
    newValues: { number, subject: payload.subject },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getTicket(uuid, user);
}

export async function listTickets(user, filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 50);
  const offset = (page - 1) * limit;
  const where = ['t.deleted_at IS NULL'];
  const params = {};

  const isStaff = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(user.roleCode);
  if (!isStaff) {
    where.push('t.user_id = :userId');
    params.userId = user.id;
  } else if (filters.assignedToMe === 'true') {
    where.push('t.assigned_to = :userId');
    params.userId = user.id;
  }
  if (filters.status) {
    where.push('t.status = :status');
    params.status = filters.status;
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM support_tickets t WHERE ${whereSql}`,
    params
  );
  const [rows] = await query(
    `SELECT t.uuid, t.ticket_number AS ticketNumber, t.subject, t.category, t.priority,
            t.status, t.created_at AS createdAt, t.updated_at AS updatedAt,
            u.uuid AS userUuid, u.first_name AS firstName, u.email,
            a.uuid AS assigneeUuid, a.first_name AS assigneeName
     FROM support_tickets t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN users a ON a.id = t.assigned_to
     WHERE ${whereSql}
     ORDER BY FIELD(t.priority, 'urgent','high','medium','low'), t.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map((t) => ({
      id: t.uuid,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      user: { id: t.userUuid, name: t.firstName, email: t.email },
      assignee: t.assigneeUuid
        ? { id: t.assigneeUuid, name: t.assigneeName }
        : null,
    })),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function getTicket(uuid, user) {
  const [rows] = await query(
    `SELECT t.*, u.uuid AS userUuid, u.first_name AS firstName, u.email,
            a.uuid AS assigneeUuid, a.first_name AS assigneeName
     FROM support_tickets t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN users a ON a.id = t.assigned_to
     WHERE t.uuid = :uuid AND t.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Ticket not found');
  const t = rows[0];

  const isStaff = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(user.roleCode);
  if (!isStaff && t.user_id !== user.id) {
    throw new ApiError(403, 'Forbidden');
  }

  const [messages] = await query(
    `SELECT m.uuid, m.message, m.is_internal AS isInternal, m.created_at AS createdAt,
            u.uuid AS senderUuid, u.first_name AS firstName, r.code AS roleCode
     FROM support_ticket_messages m
     INNER JOIN users u ON u.id = m.sender_user_id
     INNER JOIN roles r ON r.id = u.primary_role_id
     WHERE m.ticket_id = :ticketId AND m.deleted_at IS NULL
       AND (m.is_internal = 0 OR :isStaff = 1)
     ORDER BY m.id ASC`,
    { ticketId: t.id, isStaff: isStaff ? 1 : 0 }
  );

  return {
    id: t.uuid,
    ticketNumber: t.ticket_number,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    closedAt: t.closed_at,
    user: { id: t.userUuid, name: t.firstName, email: t.email },
    assignee: t.assigneeUuid ? { id: t.assigneeUuid, name: t.assigneeName } : null,
    messages: messages.map((m) => ({
      id: m.uuid,
      message: m.message,
      isInternal: Boolean(m.isInternal),
      createdAt: m.createdAt,
      sender: { id: m.senderUuid, name: m.firstName, roleCode: m.roleCode },
    })),
  };
}

export async function addTicketMessage(uuid, payload, user, req) {
  const ticket = await getTicket(uuid, user);
  const [rows] = await query(
    `SELECT id, user_id, assigned_to, status FROM support_tickets WHERE uuid = :uuid LIMIT 1`,
    { uuid }
  );
  const t = rows[0];
  if (['resolved', 'closed'].includes(t.status)) {
    throw new ApiError(400, 'Cannot message a closed ticket');
  }

  const isStaff = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(user.roleCode);
  const msgUuid = generateUuid();
  await query(
    `INSERT INTO support_ticket_messages (uuid, ticket_id, sender_user_id, message, is_internal)
     VALUES (:uuid, :ticketId, :senderId, :message, :isInternal)`,
    {
      uuid: msgUuid,
      ticketId: t.id,
      senderId: user.id,
      message: payload.message.trim(),
      isInternal: isStaff && payload.isInternal ? 1 : 0,
    }
  );
  await query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = :id`, { id: t.id });

  const notifyId = isStaff ? t.user_id : t.assigned_to;
  if (notifyId) {
    await notifyUser(notifyId, {
      type: 'ticket.message',
      title: `Ticket ${ticket.ticketNumber}`,
      body: payload.message.trim().slice(0, 120),
      data: { ticketId: uuid },
    });
  }

  return getTicket(uuid, user);
}

export async function updateTicket(uuid, payload, user, req) {
  const isStaff = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(user.roleCode);
  if (!isStaff) throw new ApiError(403, 'Forbidden');

  const [rows] = await query(
    `SELECT * FROM support_tickets WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Ticket not found');
  const t = rows[0];

  let assignedTo = t.assigned_to;
  if (payload.assignToMe) assignedTo = user.id;

  await query(
    `UPDATE support_tickets SET
      status = COALESCE(:status, status),
      priority = COALESCE(:priority, priority),
      assigned_to = COALESCE(:assignedTo, assigned_to),
      closed_at = CASE
        WHEN :status IN ('resolved','closed') THEN NOW()
        ELSE closed_at
      END
     WHERE id = :id`,
    {
      status: payload.status ?? null,
      priority: payload.priority ?? null,
      assignedTo,
      id: t.id,
    }
  );

  await notifyUser(t.user_id, {
    type: 'ticket.status',
    title: `Ticket ${t.ticket_number} updated`,
    body: `Status is now ${payload.status || t.status}`,
    data: { ticketId: uuid },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'tickets.update',
    entityType: 'support_ticket',
    entityId: t.id,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getTicket(uuid, user);
}

export async function listFaqs({ activeOnly = true } = {}) {
  const where = activeOnly
    ? 'WHERE deleted_at IS NULL AND is_active = 1'
    : 'WHERE deleted_at IS NULL';
  const [rows] = await query(
    `SELECT uuid, category, question, answer, sort_order AS sortOrder, is_active AS isActive
     FROM faqs ${where}
     ORDER BY sort_order, id`
  );
  return rows.map((r) => ({
    id: r.uuid,
    category: r.category,
    question: r.question,
    answer: r.answer,
    sortOrder: r.sortOrder,
    isActive: Boolean(r.isActive),
  }));
}

export async function createFaq(payload, user, req) {
  const uuid = generateUuid();
  await query(
    `INSERT INTO faqs (uuid, category, question, answer, sort_order, is_active, created_by)
     VALUES (:uuid, :category, :question, :answer, :sortOrder, 1, :createdBy)`,
    {
      uuid,
      category: payload.category || 'general',
      question: payload.question,
      answer: payload.answer,
      sortOrder: payload.sortOrder ?? 0,
      createdBy: user.id,
    }
  );
  return (await listFaqs({ activeOnly: false })).find((f) => f.id === uuid);
}

export async function createComplaint(payload, user, req) {
  const uuid = generateUuid();
  await query(
    `INSERT INTO complaints (uuid, user_id, against_type, against_id, subject, description, status)
     VALUES (:uuid, :userId, :againstType, :againstId, :subject, :description, 'open')`,
    {
      uuid,
      userId: user.id,
      againstType: payload.againstType || 'other',
      againstId: payload.againstId || null,
      subject: payload.subject,
      description: payload.description,
    }
  );
  return { id: uuid, message: 'Complaint submitted' };
}

export async function listComplaints(user, filters = {}) {
  const isStaff = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(user.roleCode);
  const where = ['deleted_at IS NULL'];
  const params = {};
  if (!isStaff) {
    where.push('user_id = :userId');
    params.userId = user.id;
  }
  if (filters.status) {
    where.push('status = :status');
    params.status = filters.status;
  }
  const [rows] = await query(
    `SELECT uuid, against_type AS againstType, against_id AS againstId, subject, description,
            status, created_at AS createdAt
     FROM complaints
     WHERE ${where.join(' AND ')}
     ORDER BY id DESC`,
    params
  );
  return rows.map((r) => ({
    id: r.uuid,
    againstType: r.againstType,
    againstId: r.againstId,
    subject: r.subject,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
  }));
}
