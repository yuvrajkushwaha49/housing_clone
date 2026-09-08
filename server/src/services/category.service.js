import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';

export async function listCategories({ activeOnly = false } = {}) {
  const where = activeOnly
    ? 'WHERE deleted_at IS NULL AND is_active = 1'
    : 'WHERE deleted_at IS NULL';
  const [rows] = await query(
    `SELECT uuid, code, name, description, sort_order, is_active
     FROM property_categories ${where}
     ORDER BY sort_order, name`
  );
  return rows.map((r) => ({
    id: r.uuid,
    code: r.code,
    name: r.name,
    description: r.description,
    sortOrder: r.sort_order,
    isActive: Boolean(r.is_active),
  }));
}

export async function createCategory(payload, actorId, req) {
  const code = payload.code.toLowerCase().replace(/\s+/g, '_');
  const uuid = generateUuid();
  try {
    await query(
      `INSERT INTO property_categories (uuid, code, name, description, sort_order, is_active, created_by)
       VALUES (:uuid, :code, :name, :description, :sortOrder, :isActive, :createdBy)`,
      {
        uuid,
        code,
        name: payload.name,
        description: payload.description || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive === false ? 0 : 1,
        createdBy: actorId,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Category code already exists');
    throw err;
  }

  await writeAuditLog({
    actorUserId: actorId,
    action: 'categories.create',
    entityType: 'property_category',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listCategories()).find((c) => c.id === uuid);
}

export async function updateCategory(uuid, payload, actorId, req) {
  const [rows] = await query(
    `SELECT id FROM property_categories WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Category not found');

  await query(
    `UPDATE property_categories SET
      name = COALESCE(:name, name),
      description = COALESCE(:description, description),
      sort_order = COALESCE(:sortOrder, sort_order),
      is_active = COALESCE(:isActive, is_active),
      updated_by = :updatedBy
     WHERE uuid = :uuid`,
    {
      uuid,
      name: payload.name ?? null,
      description: payload.description ?? null,
      sortOrder: payload.sortOrder ?? null,
      isActive: payload.isActive === undefined ? null : payload.isActive ? 1 : 0,
      updatedBy: actorId,
    }
  );

  await writeAuditLog({
    actorUserId: actorId,
    action: 'categories.update',
    entityType: 'property_category',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listCategories()).find((c) => c.id === uuid);
}

export async function listTypes(categoryUuid = null, { activeOnly = false } = {}) {
  const filters = ['t.deleted_at IS NULL'];
  const params = {};
  if (activeOnly) filters.push('t.is_active = 1');
  if (categoryUuid) {
    filters.push('c.uuid = :categoryUuid');
    params.categoryUuid = categoryUuid;
  }

  const [rows] = await query(
    `SELECT t.uuid, t.code, t.name, t.sort_order, t.is_active, c.uuid AS categoryId, c.name AS categoryName
     FROM property_types t
     INNER JOIN property_categories c ON c.id = t.category_id
     WHERE ${filters.join(' AND ')}
     ORDER BY t.sort_order, t.name`,
    params
  );

  return rows.map((r) => ({
    id: r.uuid,
    code: r.code,
    name: r.name,
    sortOrder: r.sort_order,
    isActive: Boolean(r.is_active),
    categoryId: r.categoryId,
    categoryName: r.categoryName,
  }));
}

export async function createType(payload, actorId, req) {
  const [cats] = await query(
    `SELECT id FROM property_categories WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: payload.categoryId }
  );
  if (!cats.length) throw new ApiError(404, 'Category not found');

  const code = payload.code.toLowerCase().replace(/\s+/g, '_');
  const uuid = generateUuid();
  try {
    await query(
      `INSERT INTO property_types (uuid, category_id, code, name, sort_order, is_active, created_by)
       VALUES (:uuid, :categoryId, :code, :name, :sortOrder, :isActive, :createdBy)`,
      {
        uuid,
        categoryId: cats[0].id,
        code,
        name: payload.name,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive === false ? 0 : 1,
        createdBy: actorId,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Property type code already exists');
    throw err;
  }

  await writeAuditLog({
    actorUserId: actorId,
    action: 'categories.type.create',
    entityType: 'property_type',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listTypes()).find((t) => t.id === uuid);
}

export async function updateType(uuid, payload, actorId, req) {
  const [rows] = await query(
    `SELECT id FROM property_types WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Property type not found');

  await query(
    `UPDATE property_types SET
      name = COALESCE(:name, name),
      sort_order = COALESCE(:sortOrder, sort_order),
      is_active = COALESCE(:isActive, is_active),
      updated_by = :updatedBy
     WHERE uuid = :uuid`,
    {
      uuid,
      name: payload.name ?? null,
      sortOrder: payload.sortOrder ?? null,
      isActive: payload.isActive === undefined ? null : payload.isActive ? 1 : 0,
      updatedBy: actorId,
    }
  );

  await writeAuditLog({
    actorUserId: actorId,
    action: 'categories.type.update',
    entityType: 'property_type',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return (await listTypes()).find((t) => t.id === uuid);
}

export async function getLookups() {
  const [areaUnits] = await query(`SELECT id, code, name FROM area_units ORDER BY id`);
  const [facing] = await query(`SELECT id, code, name FROM facing_types ORDER BY id`);
  const [furnishing] = await query(`SELECT id, code, name FROM furnishing_types ORDER BY id`);
  const [ownership] = await query(`SELECT id, code, name FROM ownership_types ORDER BY id`);
  const [construction] = await query(
    `SELECT id, code, name FROM construction_statuses ORDER BY id`
  );

  return {
    areaUnits: areaUnits.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    facingTypes: facing.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    furnishingTypes: furnishing.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    ownershipTypes: ownership.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    constructionStatuses: construction.map((r) => ({ id: r.id, code: r.code, name: r.name })),
  };
}

export async function resolveCategoryAndType(categoryUuid, typeUuid) {
  const [cats] = await query(
    `SELECT id FROM property_categories WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: categoryUuid }
  );
  if (!cats.length) throw new ApiError(400, 'Invalid category');

  const [types] = await query(
    `SELECT id, category_id FROM property_types WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: typeUuid }
  );
  if (!types.length || types[0].category_id !== cats[0].id) {
    throw new ApiError(400, 'Invalid property type for category');
  }

  return { categoryId: cats[0].id, propertyTypeId: types[0].id };
}
