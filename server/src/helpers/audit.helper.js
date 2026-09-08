import { query } from '../config/db.js';

export async function writeAuditLog({
  actorUserId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) {
  await query(
    `INSERT INTO audit_logs
      (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES (:actorUserId, :action, :entityType, :entityId, :oldValues, :newValues, :ipAddress, :userAgent)`,
    {
      actorUserId,
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent,
    }
  );
}

export async function writeActivityLog({
  userId = null,
  activityType,
  description,
  meta = null,
  ipAddress = null,
}) {
  await query(
    `INSERT INTO activity_logs
      (user_id, activity_type, description, meta, ip_address)
     VALUES (:userId, :activityType, :description, :meta, :ipAddress)`,
    {
      userId,
      activityType,
      description,
      meta: meta ? JSON.stringify(meta) : null,
      ipAddress,
    }
  );
}
