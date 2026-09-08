import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import { writeActivityLog } from '../helpers/audit.helper.js';

export async function assertParticipant(conversationUuid, userId) {
  const [rows] = await query(
    `SELECT c.id
     FROM conversations c
     INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
     WHERE c.uuid = :uuid AND cp.user_id = :userId AND c.deleted_at IS NULL
     LIMIT 1`,
    { uuid: conversationUuid, userId }
  );
  if (!rows.length) throw new ApiError(403, 'Not a conversation participant');
  return rows[0].id;
}

export async function getParticipantUserIds(conversationUuid) {
  const [rows] = await query(
    `SELECT cp.user_id AS userId
     FROM conversation_participants cp
     INNER JOIN conversations c ON c.id = cp.conversation_id
     WHERE c.uuid = :uuid`,
    { uuid: conversationUuid }
  );
  return rows.map((r) => r.userId);
}

async function mapConversation(row, currentUserId) {
  const [participants] = await query(
    `SELECT u.uuid, u.first_name AS firstName, u.last_name AS lastName, u.email, u.avatar_url AS avatarUrl
     FROM conversation_participants cp
     INNER JOIN users u ON u.id = cp.user_id
     WHERE cp.conversation_id = :id`,
    { id: row.id }
  );

  const [lastMsg] = await query(
    `SELECT m.uuid, m.body, m.created_at AS createdAt, u.uuid AS senderUuid, u.first_name AS senderName
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_user_id
     WHERE m.conversation_id = :id AND m.deleted_at IS NULL
     ORDER BY m.id DESC LIMIT 1`,
    { id: row.id }
  );

  const [unread] = await query(
    `SELECT COUNT(*) AS total
     FROM messages m
     INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = :userId
     WHERE m.conversation_id = :id
       AND m.deleted_at IS NULL
       AND m.sender_user_id <> :userId
       AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)`,
    { id: row.id, userId: currentUserId }
  );

  return {
    id: row.uuid,
    type: row.type,
    subject: row.subject,
    property: row.property_uuid
      ? { id: row.property_uuid, title: row.property_title, slug: row.property_slug }
      : null,
    participants: participants.map((p) => ({
      id: p.uuid,
      name: `${p.firstName}${p.lastName ? ` ${p.lastName}` : ''}`,
      email: p.email,
      avatarUrl: p.avatarUrl,
    })),
    lastMessage: lastMsg[0]
      ? {
          id: lastMsg[0].uuid,
          body: lastMsg[0].body,
          createdAt: lastMsg[0].createdAt,
          sender: { id: lastMsg[0].senderUuid, name: lastMsg[0].senderName },
        }
      : null,
    unreadCount: Number(unread[0].total),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function listConversations(userId) {
  const [rows] = await query(
    `SELECT c.id, c.uuid, c.type, c.subject, c.created_at, c.updated_at,
            p.uuid AS property_uuid, p.title AS property_title, p.slug AS property_slug
     FROM conversations c
     INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
     LEFT JOIN properties p ON p.id = c.property_id
     WHERE cp.user_id = :userId AND c.deleted_at IS NULL
     ORDER BY c.updated_at DESC`,
    { userId }
  );

  const items = [];
  for (const row of rows) {
    items.push(await mapConversation(row, userId));
  }
  return items;
}

export async function startConversation(payload, user, req) {
  const participantUuids = [...new Set(payload.participantIds || [])].filter(
    (id) => id !== user.uuid
  );

  if (payload.type === 'property') {
    if (!payload.propertyId) throw new ApiError(400, 'propertyId required');
    const [props] = await query(
      `SELECT p.id, p.uuid, p.title, p.listed_by_user_id AS listedByUserId, u.uuid AS listerUuid, u.email AS listerEmail
       FROM properties p
       INNER JOIN users u ON u.id = p.listed_by_user_id
       WHERE p.uuid = :uuid AND p.deleted_at IS NULL AND p.status = 'approved'
       LIMIT 1`,
      { uuid: payload.propertyId }
    );
    if (!props.length) throw new ApiError(404, 'Property not found');
    if (props[0].listedByUserId === user.id) {
      throw new ApiError(400, 'Cannot start chat with yourself');
    }

    // Reuse existing property conversation between same pair
    const [existing] = await query(
      `SELECT c.uuid
       FROM conversations c
       INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = :me
       INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = :host
       WHERE c.type = 'property' AND c.property_id = :propertyId AND c.deleted_at IS NULL
       LIMIT 1`,
      { me: user.id, host: props[0].listedByUserId, propertyId: props[0].id }
    );
    if (existing.length) {
      return getConversation(existing[0].uuid, user.id);
    }

    const uuid = generateUuid();
    await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO conversations (uuid, type, property_id, subject, created_by)
         VALUES (?, 'property', ?, ?, ?)`,
        [uuid, props[0].id, `Chat about ${props[0].title}`, user.id]
      );
      await conn.execute(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
        [result.insertId, user.id, result.insertId, props[0].listedByUserId]
      );
    });

    if (payload.message) {
      await sendMessage(uuid, user, { body: payload.message }, { req });
    }

    await notifyUser(props[0].listedByUserId, {
      type: 'chat.new',
      title: 'New property chat',
      body: `Someone started a chat about ${props[0].title}`,
      data: { conversationId: uuid, propertyId: props[0].uuid },
      email: props[0].listerEmail,
    });

    return getConversation(uuid, user.id);
  }

  if (payload.type === 'support') {
    const [supportUsers] = await query(
      `SELECT u.id, u.email FROM users u
       INNER JOIN roles r ON r.id = u.primary_role_id
       WHERE r.code IN ('SUPPORT','ADMIN','SUPER_ADMIN') AND u.deleted_at IS NULL AND u.status = 'active'
       ORDER BY FIELD(r.code, 'SUPPORT','ADMIN','SUPER_ADMIN')
       LIMIT 1`
    );
    if (!supportUsers.length) throw new ApiError(503, 'No support agent available');

    const uuid = generateUuid();
    await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO conversations (uuid, type, subject, created_by)
         VALUES (?, 'support', ?, ?)`,
        [uuid, payload.subject || 'Support chat', user.id]
      );
      await conn.execute(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
        [result.insertId, user.id, result.insertId, supportUsers[0].id]
      );
    });

    if (payload.message) {
      await sendMessage(uuid, user, { body: payload.message }, { req });
    }

    await notifyUser(supportUsers[0].id, {
      type: 'chat.support',
      title: 'New support chat',
      body: payload.subject || 'A user started a support chat',
      data: { conversationId: uuid },
      email: supportUsers[0].email,
    });

    return getConversation(uuid, user.id);
  }

  // direct
  if (!participantUuids.length) throw new ApiError(400, 'participantIds required');
  const placeholders = participantUuids.map((_, i) => `:p${i}`).join(', ');
  const params = Object.fromEntries(participantUuids.map((id, i) => [`p${i}`, id]));
  const [users] = await query(
    `SELECT id, uuid, email FROM users WHERE uuid IN (${placeholders}) AND deleted_at IS NULL`,
    params
  );
  if (users.length !== participantUuids.length) {
    throw new ApiError(400, 'One or more participants are invalid');
  }

  const uuid = generateUuid();
  await withTransaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO conversations (uuid, type, subject, created_by)
       VALUES (?, 'direct', ?, ?)`,
      [uuid, payload.subject || null, user.id]
    );
    await conn.execute(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`,
      [result.insertId, user.id]
    );
    for (const u of users) {
      await conn.execute(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`,
        [result.insertId, u.id]
      );
    }
  });

  if (payload.message) {
    await sendMessage(uuid, user, { body: payload.message }, { req });
  }

  return getConversation(uuid, user.id);
}

export async function getConversation(uuid, userId) {
  await assertParticipant(uuid, userId);
  const [rows] = await query(
    `SELECT c.id, c.uuid, c.type, c.subject, c.created_at, c.updated_at,
            p.uuid AS property_uuid, p.title AS property_title, p.slug AS property_slug
     FROM conversations c
     LEFT JOIN properties p ON p.id = c.property_id
     WHERE c.uuid = :uuid AND c.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Conversation not found');
  return mapConversation(rows[0], userId);
}

export async function listMessages(conversationUuid, userId, { page = 1, limit = 50 } = {}) {
  const conversationId = await assertParticipant(conversationUuid, userId);
  const offset = (page - 1) * limit;

  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM messages
     WHERE conversation_id = :id AND deleted_at IS NULL`,
    { id: conversationId }
  );

  const [rows] = await query(
    `SELECT m.uuid, m.body, m.attachments, m.created_at AS createdAt,
            u.uuid AS senderUuid, u.first_name AS firstName, u.last_name AS lastName
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_user_id
     WHERE m.conversation_id = :id AND m.deleted_at IS NULL
     ORDER BY m.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    { id: conversationId }
  );

  await query(
    `UPDATE conversation_participants SET last_read_at = NOW()
     WHERE conversation_id = :id AND user_id = :userId`,
    { id: conversationId, userId }
  );

  return {
    items: rows
      .reverse()
      .map((m) => ({
        id: m.uuid,
        body: m.body,
        attachments: typeof m.attachments === 'string' ? JSON.parse(m.attachments) : m.attachments,
        createdAt: m.createdAt,
        sender: {
          id: m.senderUuid,
          name: `${m.firstName}${m.lastName ? ` ${m.lastName}` : ''}`,
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

export async function sendMessage(conversationUuid, user, payload, meta = {}) {
  if (!payload.body?.trim()) throw new ApiError(400, 'Message body required');
  const conversationId = await assertParticipant(conversationUuid, user.id);
  const uuid = generateUuid();

  await query(
    `INSERT INTO messages (uuid, conversation_id, sender_user_id, body, attachments)
     VALUES (:uuid, :conversationId, :senderId, :body, :attachments)`,
    {
      uuid,
      conversationId,
      senderId: user.id,
      body: payload.body.trim(),
      attachments: payload.attachments ? JSON.stringify(payload.attachments) : null,
    }
  );

  await query(`UPDATE conversations SET updated_at = NOW() WHERE id = :id`, {
    id: conversationId,
  });

  await query(
    `UPDATE conversation_participants SET last_read_at = NOW()
     WHERE conversation_id = :id AND user_id = :userId`,
    { id: conversationId, userId: user.id }
  );

  if (!meta.viaSocket && meta.req) {
    await writeActivityLog({
      userId: user.id,
      activityType: 'chat.message',
      description: 'Sent a chat message',
      ipAddress: meta.req.ip,
    });
  }

  const participants = await getParticipantUserIds(conversationUuid);
  for (const uid of participants) {
    if (uid !== user.id) {
      await notifyUser(uid, {
        type: 'chat.message',
        title: 'New message',
        body: payload.body.trim().slice(0, 120),
        data: { conversationId: conversationUuid },
      });
    }
  }

  return {
    id: uuid,
    conversationId: conversationUuid,
    body: payload.body.trim(),
    createdAt: new Date().toISOString(),
    sender: {
      id: user.uuid,
      name: user.firstName || 'User',
    },
  };
}
