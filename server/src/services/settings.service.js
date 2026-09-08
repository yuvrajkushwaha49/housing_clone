import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

const PUBLIC_KEYS = new Set(['app_name', 'app_url', 'support_email', 'support_phone']);

export async function getPublicSettings() {
  const [rows] = await query(
    `SELECT \`key\`, \`value\`, group_name AS groupName
     FROM settings
     WHERE \`key\` IN ('app_name','app_url','support_email','support_phone')`
  );
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function listSettings({ group } = {}) {
  const where = ['1=1'];
  const params = {};
  if (group) {
    where.push('group_name = :group');
    params.group = group;
  }
  const [rows] = await query(
    `SELECT \`key\`, \`value\`, group_name AS groupName, updated_at AS updatedAt
     FROM settings
     WHERE ${where.join(' AND ')}
     ORDER BY group_name, \`key\``,
    params
  );
  return rows;
}

export async function upsertSettings(entries, user, req) {
  if (!Array.isArray(entries) || !entries.length) {
    throw new ApiError(400, 'settings array required');
  }
  for (const item of entries) {
    if (!item.key || typeof item.key !== 'string') {
      throw new ApiError(400, 'Each setting needs a key');
    }
    await query(
      `INSERT INTO settings (\`key\`, \`value\`, group_name, updated_by)
       VALUES (:key, :value, :groupName, :updatedBy)
       ON DUPLICATE KEY UPDATE
         \`value\` = VALUES(\`value\`),
         group_name = VALUES(group_name),
         updated_by = VALUES(updated_by)`,
      {
        key: item.key,
        value: item.value == null ? null : String(item.value),
        groupName: item.groupName || 'general',
        updatedBy: user.id,
      }
    );
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'settings.update',
    entityType: 'settings',
    entityId: null,
    newValues: { keys: entries.map((e) => e.key) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return listSettings();
}

export function isPublicKey(key) {
  return PUBLIC_KEYS.has(key);
}
