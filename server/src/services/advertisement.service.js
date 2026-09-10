import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
import { deleteStoredFile, mediaUrl, storeUpload } from '../helpers/storage.helper.js';

function mapAd(r) {
  return {
    id: r.uuid,
    title: r.title,
    placement: r.placement,
    imageUrl: mediaUrl(r.image_path),
    linkUrl: r.link_url,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    isActive: Boolean(r.is_active),
    sortOrder: r.sort_order,
    cityId: r.city_uuid || null,
  };
}

export async function listPublicAds({ placement, cityId } = {}) {
  const where = [
    'a.deleted_at IS NULL',
    'a.is_active = 1',
    '(a.starts_at IS NULL OR a.starts_at <= NOW())',
    '(a.ends_at IS NULL OR a.ends_at >= NOW())',
  ];
  const params = {};
  if (placement) {
    where.push('a.placement = :placement');
    params.placement = placement;
  }
  if (cityId) {
    where.push('(a.city_id IS NULL OR c.uuid = :cityId)');
    params.cityId = cityId;
  }
  const [rows] = await query(
    `SELECT a.uuid, a.title, a.placement, a.image_path, a.link_url, a.starts_at, a.ends_at,
            a.is_active, a.sort_order, c.uuid AS city_uuid
     FROM advertisements a
     LEFT JOIN cities c ON c.id = a.city_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.sort_order ASC, a.id DESC`,
    params
  );
  return rows.map(mapAd);
}

export async function adminListAds() {
  const [rows] = await query(
    `SELECT a.uuid, a.title, a.placement, a.image_path, a.link_url, a.starts_at, a.ends_at,
            a.is_active, a.sort_order, c.uuid AS city_uuid
     FROM advertisements a
     LEFT JOIN cities c ON c.id = a.city_id
     WHERE a.deleted_at IS NULL
     ORDER BY a.sort_order ASC, a.id DESC`
  );
  return rows.map(mapAd);
}

export async function createAd(payload, user, req, file) {
  let imagePath = null;
  if (file) {
    const stored = await storeUpload(file, { folder: 'ads', mediaType: 'image' });
    imagePath = stored.filePath;
  }
  let cityId = null;
  if (payload.cityId) {
    const [cities] = await query(
      `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.cityId }
    );
    if (!cities.length) throw new ApiError(400, 'Invalid city');
    cityId = cities[0].id;
  }

  const uuid = generateUuid();
  await query(
    `INSERT INTO advertisements
      (uuid, title, placement, image_path, link_url, starts_at, ends_at, is_active, sort_order, city_id, created_by)
     VALUES (:uuid, :title, :placement, :imagePath, :linkUrl, :startsAt, :endsAt, :isActive, :sortOrder, :cityId, :createdBy)`,
    {
      uuid,
      title: payload.title,
      placement: payload.placement || 'home_hero',
      imagePath,
      linkUrl: payload.linkUrl || null,
      startsAt: payload.startsAt || null,
      endsAt: payload.endsAt || null,
      isActive: payload.isActive === false || payload.isActive === 'false' ? 0 : 1,
      sortOrder: Number(payload.sortOrder || 0),
      cityId,
      createdBy: user.id,
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'ads.create',
    entityType: 'advertisement',
    entityId: uuid,
    newValues: { title: payload.title, placement: payload.placement },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const ads = await adminListAds();
  return ads.find((a) => a.id === uuid);
}

export async function updateAd(uuid, payload, user, req, file) {
  const [rows] = await query(
    `SELECT id, image_path FROM advertisements WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Advertisement not found');

  let imagePath = rows[0].image_path;
  if (file) {
    const stored = await storeUpload(file, { folder: 'ads', mediaType: 'image' });
    if (imagePath) await deleteStoredFile(imagePath);
    imagePath = stored.filePath;
  }

  let cityId;
  if (payload.cityId === '' || payload.cityId === null) {
    cityId = null;
  } else if (payload.cityId) {
    const [cities] = await query(
      `SELECT id FROM cities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.cityId }
    );
    if (!cities.length) throw new ApiError(400, 'Invalid city');
    cityId = cities[0].id;
  }

  await query(
    `UPDATE advertisements SET
      title = COALESCE(:title, title),
      placement = COALESCE(:placement, placement),
      image_path = :imagePath,
      link_url = COALESCE(:linkUrl, link_url),
      starts_at = COALESCE(:startsAt, starts_at),
      ends_at = COALESCE(:endsAt, ends_at),
      is_active = COALESCE(:isActive, is_active),
      sort_order = COALESCE(:sortOrder, sort_order),
      city_id = COALESCE(:cityId, city_id)
     WHERE id = :id`,
    {
      id: rows[0].id,
      title: payload.title || null,
      placement: payload.placement || null,
      imagePath,
      linkUrl: payload.linkUrl ?? null,
      startsAt: payload.startsAt || null,
      endsAt: payload.endsAt || null,
      isActive:
        payload.isActive === undefined
          ? null
          : payload.isActive === false || payload.isActive === 'false'
            ? 0
            : 1,
      sortOrder: payload.sortOrder !== undefined ? Number(payload.sortOrder) : null,
      cityId: cityId === undefined ? null : cityId,
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'ads.update',
    entityType: 'advertisement',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const ads = await adminListAds();
  return ads.find((a) => a.id === uuid);
}

export async function deleteAd(uuid, user, req) {
  const [rows] = await query(
    `SELECT id, image_path FROM advertisements WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Advertisement not found');
  await query(`UPDATE advertisements SET deleted_at = NOW(), is_active = 0 WHERE id = :id`, {
    id: rows[0].id,
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: 'ads.delete',
    entityType: 'advertisement',
    entityId: uuid,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}
