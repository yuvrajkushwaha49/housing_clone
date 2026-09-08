import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
function mapAmenityRow(r) {
  return {
    id: r.uuid,
    code: r.code,
    name: r.name,
    icon: r.icon,
    category: r.category,
    isActive: Boolean(r.is_active),
    sortOrder: r.sort_order,
  };
}

export async function listAmenities({ activeOnly = false } = {}) {
  const where = activeOnly
    ? 'WHERE deleted_at IS NULL AND is_active = 1'
    : 'WHERE deleted_at IS NULL';
  const [rows] = await query(
    `SELECT uuid, code, name, icon, category, is_active, sort_order
     FROM amenities ${where}
     ORDER BY sort_order, name`
  );
  return rows.map(mapAmenityRow);
}

export async function createAmenity(payload, actorId, req) {
  const code = payload.code.toLowerCase().replace(/\s+/g, '_');
  const uuid = generateUuid();
  try {
    await query(
      `INSERT INTO amenities (uuid, code, name, icon, category, sort_order, is_active, created_by)
       VALUES (:uuid, :code, :name, :icon, :category, :sortOrder, :isActive, :createdBy)`,
      {
        uuid,
        code,
        name: payload.name,
        icon: payload.icon || null,
        category: payload.category || 'internal',
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive === false ? 0 : 1,
        createdBy: actorId,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Amenity code already exists');
    throw err;
  }

  await writeAuditLog({
    actorUserId: actorId,
    action: 'amenities.create',
    entityType: 'amenity',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listAmenities()).find((a) => a.id === uuid);
}

export async function updateAmenity(uuid, payload, actorId, req) {
  const [rows] = await query(
    `SELECT id FROM amenities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Amenity not found');

  await query(
    `UPDATE amenities SET
      name = COALESCE(:name, name),
      icon = COALESCE(:icon, icon),
      category = COALESCE(:category, category),
      sort_order = COALESCE(:sortOrder, sort_order),
      is_active = COALESCE(:isActive, is_active),
      updated_by = :updatedBy
     WHERE uuid = :uuid`,
    {
      uuid,
      name: payload.name ?? null,
      icon: payload.icon ?? null,
      category: payload.category ?? null,
      sortOrder: payload.sortOrder ?? null,
      isActive: payload.isActive === undefined ? null : payload.isActive ? 1 : 0,
      updatedBy: actorId,
    }
  );

  await writeAuditLog({
    actorUserId: actorId,
    action: 'amenities.update',
    entityType: 'amenity',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listAmenities()).find((a) => a.id === uuid);
}

export async function deleteAmenity(uuid, actorId) {
  const [rows] = await query(
    `SELECT id FROM amenities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Amenity not found');
  await query(
    `UPDATE amenities SET deleted_at = NOW(), updated_by = :actorId WHERE id = :id`,
    { id: rows[0].id, actorId }
  );
  return { message: 'Amenity deleted' };
}

export async function resolveAmenityIds(uuids = []) {
  if (!uuids.length) return [];
  const placeholders = uuids.map((_, i) => `:a${i}`).join(', ');
  const params = Object.fromEntries(uuids.map((u, i) => [`a${i}`, u]));
  const [rows] = await query(
    `SELECT id, uuid FROM amenities WHERE uuid IN (${placeholders}) AND deleted_at IS NULL`,
    params
  );
  if (rows.length !== uuids.length) {
    throw new ApiError(400, 'One or more amenities are invalid');
  }
  return rows.map((r) => r.id);
}
