import { generateUuid } from './crypto.helper.js';
import { sendMail } from './mail.helper.js';
import logger from '../utils/logger.js';
import { query } from '../config/db.js';

function mapRow(r) {
  return {
    id: r.uuid,
    type: r.type,
    title: r.title,
    body: r.body,
    data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
    isRead: Boolean(r.is_read ?? r.isRead),
    createdAt: r.created_at ?? r.createdAt,
  };
}

/**
 * Keep notification in DB until the client acknowledges receipt,
 * then delete it. Also push live over the socket when online.
 */
export async function notifyUser(userId, { type, title, body, data, email }) {
  const uuid = generateUuid();
  const createdAt = new Date();

  try {
    await query(
      `INSERT INTO notifications (uuid, user_id, type, title, body, data)
       VALUES (:uuid, :userId, :type, :title, :body, :data)`,
      {
        uuid,
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      }
    );
  } catch (err) {
    logger.error(`Notification persist failed: ${err.message}`);
  }

  const payload = {
    id: uuid,
    type,
    title,
    body,
    data: data || null,
    isRead: false,
    createdAt: createdAt.toISOString(),
  };

  try {
    const { emitToUser } = await import('../sockets/index.js');
    emitToUser(userId, 'notification:new', payload);
  } catch (err) {
    logger.error(`Notification socket emit failed: ${err.message}`);
  }

  if (email) {
    try {
      await sendMail({
        to: email,
        subject: title,
        html: `<p>${body}</p>`,
        text: body,
      });
    } catch (err) {
      logger.error(`Notification email failed: ${err.message}`);
    }
  }

  return uuid;
}

export async function listNotifications(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const params = { userId };

  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id = :userId`,
    params
  );

  const [rows] = await query(
    `SELECT uuid, type, title, body, data, is_read, created_at
     FROM notifications
     WHERE user_id = :userId
     ORDER BY id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    items: rows.map(mapRow),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

/** Client received these — remove from DB. */
export async function acknowledgeDelivered(userId, ids = []) {
  const uuids = (Array.isArray(ids) ? ids : []).filter(Boolean);
  if (!uuids.length) return { deleted: 0 };

  const placeholders = uuids.map((_, i) => `:id${i}`).join(', ');
  const params = { userId };
  uuids.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const [result] = await query(
    `DELETE FROM notifications
     WHERE user_id = :userId AND uuid IN (${placeholders})`,
    params
  );

  return { deleted: result?.affectedRows ?? 0 };
}

export async function markNotificationRead(userId, uuid) {
  await acknowledgeDelivered(userId, [uuid]);
}

export async function markAllNotificationsRead(userId) {
  await query(`DELETE FROM notifications WHERE user_id = :userId`, { userId });
}

export async function unreadCount(userId) {
  const [rows] = await query(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id = :userId`,
    { userId }
  );
  return Number(rows[0].total);
}
