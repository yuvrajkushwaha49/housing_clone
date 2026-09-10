import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { deleteStoredFile, mediaUrl, slugify, storeUpload } from '../helpers/storage.helper.js';
import { writeActivityLog, writeAuditLog } from '../helpers/audit.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import * as locationService from './location.service.js';
import * as categoryService from './category.service.js';
import * as amenityService from './amenity.service.js';
import * as userService from './user.service.js';
import * as subscriptionService from './subscription.service.js';
import * as propertyReviewService from './propertyReview.service.js';

function mapPropertyRow(r) {
  return {
    id: r.uuid,
    slug: r.slug,
    title: r.title,
    description: r.description,
    purpose: r.purpose,
    price: Number(r.price),
    priceNegotiable: Boolean(r.price_negotiable),
    area: Number(r.area),
    carpetArea: r.carpet_area != null ? Number(r.carpet_area) : null,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    balconies: r.balconies,
    parking: r.parking,
    floorNumber: r.floor_number,
    totalFloors: r.total_floors,
    ageYears: r.age_years,
    listedByType: r.listed_by_type,
    status: r.status,
    rejectionReason: r.rejection_reason || null,
    submissionCount: Number(r.submission_count || 0),
    reviewAverageRating: r.review_average_rating != null ? Number(r.review_average_rating) : null,
    verificationStatus: r.verification_status,
    isFeatured: Boolean(r.is_featured),
    isPremium: Boolean(r.is_premium),
    viewsCount: r.views_count,
    addressLine: r.address_line,
    landmark: r.landmark,
    pincode: r.pincode,
    latitude: r.latitude,
    longitude: r.longitude,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    metaKeywords: r.meta_keywords,
    plotAmenities: parsePlotAmenities(r),
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    category: r.category_uuid
      ? { id: r.category_uuid, name: r.category_name, code: r.category_code }
      : undefined,
    propertyType: r.type_uuid
      ? { id: r.type_uuid, name: r.type_name, code: r.type_code }
      : undefined,
    city: r.city_uuid ? { id: r.city_uuid, name: r.city_name, slug: r.city_slug } : undefined,
    locality: r.locality_uuid
      ? { id: r.locality_uuid, name: r.locality_name, slug: r.locality_slug }
      : undefined,
    areaUnit: r.area_unit_code
      ? { id: r.area_unit_id, code: r.area_unit_code, name: r.area_unit_name }
      : undefined,
    facing: r.facing_code ? { id: r.facing_id, code: r.facing_code, name: r.facing_name } : null,
    furnishing: r.furnishing_code
      ? { id: r.furnishing_id, code: r.furnishing_code, name: r.furnishing_name }
      : null,
    ownership: r.ownership_code
      ? { id: r.ownership_id, code: r.ownership_code, name: r.ownership_name }
      : null,
    constructionStatus: r.construction_code
      ? { id: r.construction_id, code: r.construction_code, name: r.construction_name }
      : null,
    primaryImage: r.primary_image || null,
    listedBy: r.lister_uuid
      ? {
          id: r.lister_uuid,
          name: `${r.lister_first_name}${r.lister_last_name ? ` ${r.lister_last_name}` : ''}`,
          email: r.lister_email,
        }
      : undefined,
  };
}

const listSelect = `
  p.id, p.uuid, p.slug, p.title, p.description, p.purpose, p.price, p.price_negotiable,
  p.area, p.carpet_area, p.bedrooms, p.bathrooms, p.balconies, p.parking,
  p.floor_number, p.total_floors, p.age_years, p.listed_by_type, p.status, p.rejection_reason, p.submission_count, p.review_average_rating,
  p.verification_status, p.is_featured, p.is_premium, p.views_count,
  p.address_line, p.landmark, p.pincode, p.latitude, p.longitude,
  p.meta_title, p.meta_description, p.meta_keywords, p.plot_amenities, p.published_at, p.created_at, p.updated_at,
  pc.uuid AS category_uuid, pc.name AS category_name, pc.code AS category_code,
  pt.uuid AS type_uuid, pt.name AS type_name, pt.code AS type_code,
  ci.uuid AS city_uuid, ci.name AS city_name, ci.slug AS city_slug,
  lo.uuid AS locality_uuid, lo.name AS locality_name, lo.slug AS locality_slug,
  au.id AS area_unit_id, au.code AS area_unit_code, au.name AS area_unit_name,
  ft.id AS facing_id, ft.code AS facing_code, ft.name AS facing_name,
  fu.id AS furnishing_id, fu.code AS furnishing_code, fu.name AS furnishing_name,
  ow.id AS ownership_id, ow.code AS ownership_code, ow.name AS ownership_name,
  cs.id AS construction_id, cs.code AS construction_code, cs.name AS construction_name,
  u.uuid AS lister_uuid, u.first_name AS lister_first_name, u.last_name AS lister_last_name, u.email AS lister_email,
  (SELECT pm.file_path FROM property_media pm
    WHERE pm.property_id = p.id AND pm.deleted_at IS NULL AND pm.media_type = 'image'
    ORDER BY pm.is_primary DESC, pm.sort_order ASC LIMIT 1) AS primary_image
`;

async function uniqueSlug(base) {
  let slug = slugify(base) || `property-${Date.now()}`;
  let attempt = 0;
  while (attempt < 20) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const [rows] = await query(
      `SELECT id FROM properties WHERE slug = :slug LIMIT 1`,
      { slug: candidate }
    );
    if (!rows.length) return candidate;
    attempt += 1;
  }
  return `${slug}-${generateUuid().slice(0, 8)}`;
}

function listedByTypeForRole(roleCode) {
  if (roleCode === 'AGENT') return 'agent';
  if (roleCode === 'BUILDER') return 'builder';
  return 'owner';
}

function parsePlotAmenities(row) {
  if (!row?.plot_amenities) return null;
  if (typeof row.plot_amenities === 'object') return row.plot_amenities;
  try {
    return JSON.parse(row.plot_amenities);
  } catch {
    return null;
  }
}

function normalizePlotAmenities(payload) {
  if (!payload?.plotAmenities || typeof payload.plotAmenities !== 'object') return null;
  const cleaned = {};
  for (const [key, value] of Object.entries(payload.plotAmenities)) {
    if (value != null && String(value).trim() !== '') {
      cleaned[key] = String(value).trim();
    }
  }
  return Object.keys(cleaned).length ? JSON.stringify(cleaned) : null;
}

export async function createProperty(payload, user, req) {
  const loc = await locationService.resolveLocationIds({
    countryId: payload.countryId,
    stateId: payload.stateId,
    cityId: payload.cityId,
    localityId: payload.localityId,
  });
  const { categoryId, propertyTypeId } = await categoryService.resolveCategoryAndType(
    payload.categoryId,
    payload.propertyTypeId
  );

  const [areaUnits] = await query(
    `SELECT id FROM area_units WHERE id = :id LIMIT 1`,
    { id: payload.areaUnitId }
  );
  if (!areaUnits.length) throw new ApiError(400, 'Invalid area unit');

  const amenityIds = await amenityService.resolveAmenityIds(payload.amenityIds || []);
  const uuid = generateUuid();
  const slug = await uniqueSlug(payload.title);
  const listedByType = listedByTypeForRole(user.roleCode);
  const status = payload.submit ? 'pending' : 'draft';
  const submissionCount = payload.submit ? 1 : 0;
  if (status === 'pending') {
    await subscriptionService.assertCanPublishListing(user);
  }
  if (payload.isFeatured) {
    await subscriptionService.assertCanFeatureListing(user);
  }

  const propertyId = await withTransaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO properties (
        uuid, slug, title, description, category_id, property_type_id, purpose,
        price, price_negotiable, area, area_unit_id, carpet_area,
        bedrooms, bathrooms, balconies, parking,
        facing_id, furnishing_id, ownership_id, construction_status_id,
        floor_number, total_floors, age_years,
        listed_by_type, listed_by_user_id,
        country_id, state_id, city_id, locality_id,
        address_line, landmark, pincode, latitude, longitude,
        status, meta_title, meta_description, meta_keywords, plot_amenities,
        created_by, published_at, submission_count
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )`,
      [
        uuid,
        slug,
        payload.title,
        payload.description,
        categoryId,
        propertyTypeId,
        payload.purpose,
        payload.price,
        payload.priceNegotiable ? 1 : 0,
        payload.area,
        payload.areaUnitId,
        payload.carpetArea ?? null,
        payload.bedrooms ?? null,
        payload.bathrooms ?? null,
        payload.balconies ?? null,
        payload.parking ?? null,
        payload.facingId ?? null,
        payload.furnishingId ?? null,
        payload.ownershipId ?? null,
        payload.constructionStatusId ?? null,
        payload.floorNumber ?? null,
        payload.totalFloors ?? null,
        payload.ageYears ?? null,
        listedByType,
        user.id,
        loc.countryId,
        loc.stateId,
        loc.cityId,
        loc.localityId,
        payload.addressLine,
        payload.landmark ?? null,
        payload.pincode ?? null,
        payload.latitude ?? null,
        payload.longitude ?? null,
        status,
        payload.metaTitle ?? payload.title,
        payload.metaDescription ?? null,
        payload.metaKeywords ?? null,
        normalizePlotAmenities(payload),
        user.id,
        status === 'pending' ? new Date() : null,
        submissionCount,
      ]
    );

    const id = result.insertId;
    for (const amenityId of amenityIds) {
      await conn.execute(
        `INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)`,
        [id, amenityId]
      );
    }

    if (Array.isArray(payload.nearbyPlaces)) {
      for (const place of payload.nearbyPlaces) {
        await conn.execute(
          `INSERT INTO property_nearby_places (property_id, place_type, name, distance_km)
           VALUES (?, ?, ?, ?)`,
          [id, place.placeType, place.name, place.distanceKm ?? null]
        );
      }
    }

    return id;
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'properties.create',
    entityType: 'property',
    entityId: propertyId,
    newValues: { uuid, slug, status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  await writeActivityLog({
    userId: user.id,
    activityType: 'property.created',
    description: `Property created: ${payload.title}`,
    ipAddress: req.ip,
  });

  if (status === 'pending') {
    await propertyReviewService.createReviewSession(uuid);
  }

  return getPropertyByUuid(uuid, { includePrivate: true });
}

export async function updateProperty(uuid, payload, user, req) {
  const property = await getRawProperty(uuid);
  assertCanEdit(property, user);

  if (['sold', 'rented', 'archived'].includes(property.status)) {
    throw new ApiError(400, 'Cannot edit property in current status');
  }

  const loc = await locationService.resolveLocationIds({
    countryId: payload.countryId,
    stateId: payload.stateId,
    cityId: payload.cityId,
    localityId: payload.localityId,
  });
  const { categoryId, propertyTypeId } = await categoryService.resolveCategoryAndType(
    payload.categoryId,
    payload.propertyTypeId
  );
  const amenityIds = await amenityService.resolveAmenityIds(payload.amenityIds || []);

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  let nextStatus = property.status;
  const canResubmit =
    !isAdmin &&
    payload.submit &&
    ['draft', 'rejected', 'approved'].includes(property.status);
  const incrementSubmission = canResubmit;
  if (canResubmit) {
    await subscriptionService.assertCanPublishListing(user);
    nextStatus = 'pending';
  }
  if (payload.isFeatured && !property.is_featured) {
    await subscriptionService.assertCanFeatureListing(user);
  }

  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE properties SET
        title = ?, description = ?, category_id = ?, property_type_id = ?, purpose = ?,
        price = ?, price_negotiable = ?, area = ?, area_unit_id = ?, carpet_area = ?,
        bedrooms = ?, bathrooms = ?, balconies = ?, parking = ?,
        facing_id = ?, furnishing_id = ?, ownership_id = ?, construction_status_id = ?,
        floor_number = ?, total_floors = ?, age_years = ?,
        country_id = ?, state_id = ?, city_id = ?, locality_id = ?,
        address_line = ?, landmark = ?, pincode = ?, latitude = ?, longitude = ?,
        status = ?, meta_title = ?, meta_description = ?, meta_keywords = ?, plot_amenities = ?,
        submission_count = ?,
        updated_by = ?,
        published_at = CASE WHEN ? = 'pending' AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = ?`,
      [
        payload.title,
        payload.description,
        categoryId,
        propertyTypeId,
        payload.purpose,
        payload.price,
        payload.priceNegotiable ? 1 : 0,
        payload.area,
        payload.areaUnitId,
        payload.carpetArea ?? null,
        payload.bedrooms ?? null,
        payload.bathrooms ?? null,
        payload.balconies ?? null,
        payload.parking ?? null,
        payload.facingId ?? null,
        payload.furnishingId ?? null,
        payload.ownershipId ?? null,
        payload.constructionStatusId ?? null,
        payload.floorNumber ?? null,
        payload.totalFloors ?? null,
        payload.ageYears ?? null,
        loc.countryId,
        loc.stateId,
        loc.cityId,
        loc.localityId,
        payload.addressLine,
        payload.landmark ?? null,
        payload.pincode ?? null,
        payload.latitude ?? null,
        payload.longitude ?? null,
        nextStatus,
        payload.metaTitle ?? payload.title,
        payload.metaDescription ?? null,
        payload.metaKeywords ?? null,
        normalizePlotAmenities(payload),
        Number(property.submission_count || 0) + (incrementSubmission ? 1 : 0),
        user.id,
        nextStatus,
        property.id,
      ]
    );

    await conn.execute(`DELETE FROM property_amenities WHERE property_id = ?`, [property.id]);
    for (const amenityId of amenityIds) {
      await conn.execute(
        `INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)`,
        [property.id, amenityId]
      );
    }

    if (Array.isArray(payload.nearbyPlaces)) {
      await conn.execute(
        `UPDATE property_nearby_places SET deleted_at = NOW()
         WHERE property_id = ? AND deleted_at IS NULL`,
        [property.id]
      );
      for (const place of payload.nearbyPlaces) {
        await conn.execute(
          `INSERT INTO property_nearby_places (property_id, place_type, name, distance_km)
           VALUES (?, ?, ?, ?)`,
          [property.id, place.placeType, place.name, place.distanceKm ?? null]
        );
      }
    }
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'properties.update',
    entityType: 'property',
    entityId: property.id,
    newValues: { status: nextStatus },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (nextStatus === 'pending' && !isAdmin) {
    await propertyReviewService.createReviewSession(uuid);
  }

  return getPropertyByUuid(uuid, { includePrivate: true });
}

async function getRawProperty(uuid) {
  const [rows] = await query(
    `SELECT * FROM properties WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Property not found');
  return rows[0];
}

function assertCanEdit(property, user) {
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (!isAdmin && property.listed_by_user_id !== user.id) {
    throw new ApiError(403, 'You can only manage your own properties');
  }
}

export async function getPropertyByUuid(uuid, { includePrivate = false, incrementView = false } = {}) {
  const [rows] = await query(
    `SELECT ${listSelect}
     FROM properties p
     INNER JOIN property_categories pc ON pc.id = p.category_id
     INNER JOIN property_types pt ON pt.id = p.property_type_id
     INNER JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     INNER JOIN area_units au ON au.id = p.area_unit_id
     LEFT JOIN facing_types ft ON ft.id = p.facing_id
     LEFT JOIN furnishing_types fu ON fu.id = p.furnishing_id
     LEFT JOIN ownership_types ow ON ow.id = p.ownership_id
     LEFT JOIN construction_statuses cs ON cs.id = p.construction_status_id
     INNER JOIN users u ON u.id = p.listed_by_user_id
     WHERE p.uuid = :uuid AND p.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Property not found');

  const row = rows[0];
  if (!includePrivate && row.status !== 'approved') {
    throw new ApiError(404, 'Property not found');
  }

  if (incrementView && row.status === 'approved') {
    await query(`UPDATE properties SET views_count = views_count + 1 WHERE id = :id`, {
      id: row.id,
    });
    row.views_count += 1;
  }

  const [amenities] = await query(
    `SELECT a.uuid, a.code, a.name, a.icon, a.category
     FROM amenities a
     INNER JOIN property_amenities pa ON pa.amenity_id = a.id
     WHERE pa.property_id = :propertyId AND a.deleted_at IS NULL`,
    { propertyId: row.id }
  );

  const [nearby] = await query(
    `SELECT place_type AS placeType, name, distance_km AS distanceKm
     FROM property_nearby_places
     WHERE property_id = :propertyId AND deleted_at IS NULL`,
    { propertyId: row.id }
  );

  const [media] = await query(
    `SELECT uuid, media_type AS mediaType, file_path AS filePath, file_name AS fileName,
            mime_type AS mimeType, file_size AS fileSize, sort_order AS sortOrder,
            is_primary AS isPrimary, title
     FROM property_media
     WHERE property_id = :propertyId AND deleted_at IS NULL
     ORDER BY is_primary DESC, sort_order ASC`,
    { propertyId: row.id }
  );

  const [country] = await query(
    `SELECT uuid, name FROM countries WHERE id = :id`,
    { id: (await getRawProperty(uuid)).country_id }
  );
  const [state] = await query(
    `SELECT uuid, name FROM states WHERE id = :id`,
    { id: (await getRawProperty(uuid)).state_id }
  );

  const [allAmenities] = await query(
    `SELECT a.uuid, a.code, a.name, a.icon, a.category,
            CASE WHEN pa.amenity_id IS NOT NULL THEN 1 ELSE 0 END AS is_selected
     FROM amenities a
     LEFT JOIN property_amenities pa ON pa.amenity_id = a.id AND pa.property_id = :propertyId
     WHERE a.deleted_at IS NULL AND a.is_active = 1
     ORDER BY a.sort_order, a.name`,
    { propertyId: row.id }
  );

  const mapped = mapPropertyRow(row);
  const result = {
    ...mapped,
    primaryImageUrl: mediaUrl(row.primary_image),
    country: country[0] ? { id: country[0].uuid, name: country[0].name } : null,
    state: state[0] ? { id: state[0].uuid, name: state[0].name } : null,
    amenities: amenities.map((a) => ({
      id: a.uuid,
      code: a.code,
      name: a.name,
      icon: a.icon,
      category: a.category,
    })),
    allAmenities: allAmenities.map((a) => ({
      id: a.uuid,
      code: a.code,
      name: a.name,
      icon: a.icon,
      category: a.category,
      isSelected: Boolean(a.is_selected),
    })),
    nearbyPlaces: nearby,
    media: media.map((m) => ({
      id: m.uuid,
      mediaType: m.mediaType,
      filePath: m.filePath,
      fileName: m.fileName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      sortOrder: m.sortOrder,
      isPrimary: Boolean(m.isPrimary),
      title: m.title,
      url: mediaUrl(m.filePath),
    })),
  };

  if (includePrivate) {
    result.review = await propertyReviewService.getPropertyReview(uuid);
    if (!result.review && row.status === 'pending') {
      result.review = await propertyReviewService.createReviewSession(uuid);
    }
  }

  return result;
}

export async function getPropertyBySlug(slug) {
  const [rows] = await query(
    `SELECT uuid FROM properties WHERE slug = :slug AND deleted_at IS NULL LIMIT 1`,
    { slug }
  );
  if (!rows.length) throw new ApiError(404, 'Property not found');
  return getPropertyByUuid(rows[0].uuid, { includePrivate: false, incrementView: true });
}

export async function searchProperties(filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 50);
  const offset = (page - 1) * limit;

  const where = ['p.deleted_at IS NULL'];
  const params = {};

  const isAdminSearch = filters.admin === true;
  if (!isAdminSearch && !filters.mineUserId) {
    where.push(`p.status = 'approved'`);
  }
  if (filters.mineUserId) {
    where.push('p.listed_by_user_id = :mineUserId');
    params.mineUserId = filters.mineUserId;
  }
  if (filters.status) {
    where.push('p.status = :status');
    params.status = filters.status;
  }
  if (filters.purpose) {
    where.push('p.purpose = :purpose');
    params.purpose = filters.purpose;
  }
  if (filters.cityId) {
    where.push('ci.uuid = :cityId');
    params.cityId = filters.cityId;
  }
  if (filters.localityId) {
    where.push('lo.uuid = :localityId');
    params.localityId = filters.localityId;
  }
  if (filters.categoryId) {
    where.push('pc.uuid = :categoryId');
    params.categoryId = filters.categoryId;
  }
  if (filters.propertyTypeId) {
    where.push('pt.uuid = :propertyTypeId');
    params.propertyTypeId = filters.propertyTypeId;
  }
  if (filters.excludePropertyTypeId) {
    where.push('pt.uuid <> :excludePropertyTypeId');
    params.excludePropertyTypeId = filters.excludePropertyTypeId;
  }
  if (filters.kind === 'plot') {
    where.push(`(pt.code = 'plot' OR pc.code = 'land')`);
  } else if (filters.kind === 'property') {
    where.push(`NOT (pt.code = 'plot' OR pc.code = 'land')`);
  }
  if (filters.minPrice) {
    where.push('p.price >= :minPrice');
    params.minPrice = filters.minPrice;
  }
  if (filters.maxPrice) {
    where.push('p.price <= :maxPrice');
    params.maxPrice = filters.maxPrice;
  }
  if (filters.minArea) {
    where.push('p.area >= :minArea');
    params.minArea = filters.minArea;
  }
  if (filters.maxArea) {
    where.push('p.area <= :maxArea');
    params.maxArea = filters.maxArea;
  }
  if (filters.bedrooms) {
    where.push('p.bedrooms >= :bedrooms');
    params.bedrooms = filters.bedrooms;
  }
  if (filters.bathrooms) {
    where.push('p.bathrooms >= :bathrooms');
    params.bathrooms = filters.bathrooms;
  }
  if (filters.parking) {
    where.push('p.parking >= :parking');
    params.parking = filters.parking;
  }
  if (filters.furnishingId) {
    where.push('p.furnishing_id = :furnishingId');
    params.furnishingId = filters.furnishingId;
  }
  if (filters.constructionStatusId) {
    where.push('p.construction_status_id = :constructionStatusId');
    params.constructionStatusId = filters.constructionStatusId;
  }
  if (filters.q) {
    where.push('(MATCH(p.title, p.description) AGAINST (:q IN BOOLEAN MODE) OR p.title LIKE :qLike)');
    params.q = `${filters.q}*`;
    params.qLike = `%${filters.q}%`;
  }

  if (filters.amenityIds) {
    const ids = String(filters.amenityIds)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map((_, i) => `:am${i}`).join(', ');
      ids.forEach((id, i) => {
        params[`am${i}`] = id;
      });
      where.push(`p.id IN (
        SELECT pa.property_id FROM property_amenities pa
        INNER JOIN amenities a ON a.id = pa.amenity_id
        WHERE a.uuid IN (${placeholders})
        GROUP BY pa.property_id
        HAVING COUNT(DISTINCT a.id) = ${ids.length}
      )`);
    }
  }

  if (filters.minReviewRating) {
    where.push('p.review_average_rating >= :minReviewRating');
    params.minReviewRating = Number(filters.minReviewRating);
  }

  let orderBy = 'p.created_at DESC';
  if (filters.sort === 'price_asc') orderBy = 'p.price ASC';
  if (filters.sort === 'price_desc') orderBy = 'p.price DESC';
  if (filters.sort === 'newest') orderBy = 'p.created_at DESC';
  if (filters.sort === 'rating_desc') orderBy = 'p.review_average_rating DESC, p.created_at DESC';
  if (filters.sort === 'rating_asc') orderBy = 'p.review_average_rating ASC, p.created_at DESC';

  const whereSql = where.join(' AND ');

  const [countRows] = await query(
    `SELECT COUNT(*) AS total
     FROM properties p
     INNER JOIN property_categories pc ON pc.id = p.category_id
     INNER JOIN property_types pt ON pt.id = p.property_type_id
     INNER JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     WHERE ${whereSql}`,
    params
  );

  const [rows] = await query(
    `SELECT ${listSelect}
     FROM properties p
     INNER JOIN property_categories pc ON pc.id = p.category_id
     INNER JOIN property_types pt ON pt.id = p.property_type_id
     INNER JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     INNER JOIN area_units au ON au.id = p.area_unit_id
     LEFT JOIN facing_types ft ON ft.id = p.facing_id
     LEFT JOIN furnishing_types fu ON fu.id = p.furnishing_id
     LEFT JOIN ownership_types ow ON ow.id = p.ownership_id
     LEFT JOIN construction_statuses cs ON cs.id = p.construction_status_id
     INNER JOIN users u ON u.id = p.listed_by_user_id
     WHERE ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map((r) => ({
      ...mapPropertyRow(r),
      primaryImageUrl: mediaUrl(r.primary_image),
    })),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function updatePropertyStatus(uuid, { status, rejectionReason }, user, req) {
  const property = await getRawProperty(uuid);
  const allowedAdmin = ['SUPER_ADMIN', 'ADMIN'];
  if (!allowedAdmin.includes(user.roleCode) && property.listed_by_user_id !== user.id) {
    throw new ApiError(403, 'Forbidden');
  }

  const listerTransitions = {
    draft: ['pending', 'archived'],
    pending: ['draft', 'archived'],
    approved: ['sold', 'rented', 'archived'],
    rejected: ['draft', 'pending', 'archived'],
  };
  const adminTransitions = {
    pending: ['approved', 'rejected'],
    approved: ['archived'],
    rejected: ['pending'],
  };

  const map = allowedAdmin.includes(user.roleCode) ? adminTransitions : listerTransitions;
  const allowed = map[property.status] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Cannot change status from ${property.status} to ${status}`);
  }

  if (
    status === 'pending' &&
    property.status !== 'pending' &&
    !allowedAdmin.includes(user.roleCode)
  ) {
    await subscriptionService.assertCanPublishListing(user);
  }

  const nextApprovedAt = status === 'approved' ? new Date() : property.approved_at;
  const nextApprovedBy = status === 'approved' ? user.id : property.approved_by;

  await query(
    `UPDATE properties SET
      status = :status,
      rejection_reason = :rejectionReason,
      approved_at = :approvedAt,
      approved_by = :approvedBy,
      updated_by = :actorId
     WHERE id = :id`,
    {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason || 'Rejected' : null,
      approvedAt: nextApprovedAt,
      approvedBy: nextApprovedBy,
      actorId: user.id,
      id: property.id,
    }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'properties.status',
    entityType: 'property',
    entityId: property.id,
    oldValues: { status: property.status },
    newValues: { status, rejectionReason },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (['approved', 'rejected'].includes(status) && allowedAdmin.includes(user.roleCode)) {
    const lister = await userService.findUserById(property.listed_by_user_id);
    if (lister) {
      await notifyUser(lister.id, {
        type: `property.${status}`,
        title: `Property ${status}`,
        body:
          status === 'approved'
            ? `Your listing "${property.title}" is now live.`
            : `Your listing "${property.title}" was rejected. ${rejectionReason || ''}`.trim(),
        data: { propertyId: property.uuid, status },
        email: lister.email,
      });
    }
  }

  return getPropertyByUuid(uuid, { includePrivate: true });
}

export async function softDeleteProperty(uuid, user, req) {
  const property = await getRawProperty(uuid);
  assertCanEdit(property, user);

  await query(
    `UPDATE properties SET
      deleted_at = NOW(),
      slug = CONCAT(slug, '__del__', id),
      updated_by = :actorId
     WHERE id = :id`,
    { id: property.id, actorId: user.id }
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: 'properties.delete',
    entityType: 'property',
    entityId: property.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return { message: 'Property deleted' };
}

export async function addPropertyMedia(uuid, files, { mediaType = 'image', isPrimary = false }, user, req) {
  const property = await getRawProperty(uuid);
  assertCanEdit(property, user);

  if (!files?.length) throw new ApiError(400, 'No files uploaded');

  const saved = [];
  for (const [index, file] of files.entries()) {
    const stored = await storeUpload(file, {
      folder: `properties/${property.uuid}`,
      mediaType,
    });

    const mediaUuid = generateUuid();
    const makePrimary = Boolean(isPrimary) && index === 0 && mediaType === 'image';

    if (makePrimary) {
      await query(
        `UPDATE property_media SET is_primary = 0
         WHERE property_id = :propertyId AND media_type = 'image' AND deleted_at IS NULL`,
        { propertyId: property.id }
      );
    }

    await query(
      `INSERT INTO property_media
        (uuid, property_id, media_type, file_path, file_name, mime_type, file_size, sort_order, is_primary, created_by)
       VALUES
        (:uuid, :propertyId, :mediaType, :filePath, :fileName, :mimeType, :fileSize, :sortOrder, :isPrimary, :createdBy)`,
      {
        uuid: mediaUuid,
        propertyId: property.id,
        mediaType,
        filePath: stored.filePath,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        sortOrder: index,
        isPrimary: makePrimary ? 1 : 0,
        createdBy: user.id,
      }
    );

    saved.push({
      id: mediaUuid,
      mediaType,
      url: stored.url,
      filePath: stored.filePath,
      isPrimary: makePrimary,
    });
  }

  await writeActivityLog({
    userId: user.id,
    activityType: 'property.media_uploaded',
    description: `Uploaded ${saved.length} media file(s)`,
    meta: { propertyId: property.id },
    ipAddress: req.ip,
  });

  return saved;
}

export async function deletePropertyMedia(uuid, mediaUuid, user, req) {
  const property = await getRawProperty(uuid);
  assertCanEdit(property, user);

  const [rows] = await query(
    `SELECT id, file_path AS filePath FROM property_media
     WHERE uuid = :mediaUuid AND property_id = :propertyId AND deleted_at IS NULL LIMIT 1`,
    { mediaUuid, propertyId: property.id }
  );
  if (!rows.length) throw new ApiError(404, 'Media not found');

  await query(
    `UPDATE property_media SET deleted_at = NOW() WHERE id = :id`,
    { id: rows[0].id }
  );
  await deleteStoredFile(rows[0].filePath);

  await writeAuditLog({
    actorUserId: user.id,
    action: 'properties.media.delete',
    entityType: 'property_media',
    entityId: rows[0].id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return { message: 'Media deleted' };
}

export async function toggleWishlist(userId, propertyUuid) {
  const [props] = await query(
    `SELECT id FROM properties WHERE uuid = :uuid AND deleted_at IS NULL AND status = 'approved' LIMIT 1`,
    { uuid: propertyUuid }
  );
  if (!props.length) throw new ApiError(404, 'Property not found');

  const [existing] = await query(
    `SELECT id FROM wishlists WHERE user_id = :userId AND property_id = :propertyId LIMIT 1`,
    { userId, propertyId: props[0].id }
  );

  if (existing.length) {
    await query(`DELETE FROM wishlists WHERE id = :id`, { id: existing[0].id });
    return { saved: false };
  }

  await query(
    `INSERT INTO wishlists (user_id, property_id) VALUES (:userId, :propertyId)`,
    { userId, propertyId: props[0].id }
  );
  return { saved: true };
}

export async function listWishlist(userId, { sort = 'saved', kind } = {}) {
  const orderBy = sort === 'rating_desc'
    ? 'p.review_average_rating DESC, w.created_at DESC'
    : sort === 'rating_asc'
      ? 'p.review_average_rating ASC, w.created_at DESC'
      : 'w.created_at DESC';

  let kindFilter = '';
  if (kind === 'plot') {
    kindFilter = ` AND (pt.code = 'plot' OR pc.code = 'land')`;
  } else if (kind === 'property') {
    kindFilter = ` AND NOT (pt.code = 'plot' OR pc.code = 'land')`;
  }

  const [rows] = await query(
    `SELECT p.uuid
     FROM wishlists w
     INNER JOIN properties p ON p.id = w.property_id
     INNER JOIN property_categories pc ON pc.id = p.category_id
     INNER JOIN property_types pt ON pt.id = p.property_type_id
     WHERE w.user_id = :userId AND p.deleted_at IS NULL AND p.status = 'approved'${kindFilter}
     ORDER BY ${orderBy}`,
    { userId }
  );
  const items = [];
  for (const row of rows) {
    items.push(await getPropertyByUuid(row.uuid, { includePrivate: false }));
  }
  return { items, meta: { total: items.length } };
}

const MAX_COMPARE = 4;

export async function toggleCompare(userId, propertyUuid) {
  const [props] = await query(
    `SELECT id FROM properties WHERE uuid = :uuid AND deleted_at IS NULL AND status = 'approved' LIMIT 1`,
    { uuid: propertyUuid }
  );
  if (!props.length) throw new ApiError(404, 'Property not found');

  const [existing] = await query(
    `SELECT id FROM property_compares WHERE user_id = :userId AND property_id = :propertyId LIMIT 1`,
    { userId, propertyId: props[0].id }
  );
  if (existing.length) {
    await query(`DELETE FROM property_compares WHERE id = :id`, { id: existing[0].id });
    return { compared: false, ...(await listCompare(userId)) };
  }

  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM property_compares WHERE user_id = :userId`,
    { userId }
  );
  if (Number(countRows[0].total) >= MAX_COMPARE) {
    throw new ApiError(400, `You can compare up to ${MAX_COMPARE} properties. Remove one first.`);
  }

  await query(
    `INSERT INTO property_compares (user_id, property_id) VALUES (:userId, :propertyId)`,
    { userId, propertyId: props[0].id }
  );
  return { compared: true, ...(await listCompare(userId)) };
}

export async function removeCompare(userId, propertyUuid) {
  const [props] = await query(
    `SELECT id FROM properties WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: propertyUuid }
  );
  if (!props.length) throw new ApiError(404, 'Property not found');
  await query(
    `DELETE FROM property_compares WHERE user_id = :userId AND property_id = :propertyId`,
    { userId, propertyId: props[0].id }
  );
  return listCompare(userId);
}

export async function clearCompare(userId) {
  await query(`DELETE FROM property_compares WHERE user_id = :userId`, { userId });
  return { items: [], meta: { total: 0, max: MAX_COMPARE } };
}

export async function listCompare(userId) {
  const [rows] = await query(
    `SELECT p.uuid
     FROM property_compares c
     INNER JOIN properties p ON p.id = c.property_id
     WHERE c.user_id = :userId AND p.deleted_at IS NULL AND p.status = 'approved'
     ORDER BY c.created_at ASC`,
    { userId }
  );
  const items = [];
  for (const row of rows) {
    items.push(await getPropertyByUuid(row.uuid, { includePrivate: false }));
  }
  return { items, meta: { total: items.length, max: MAX_COMPARE } };
}

export async function getMyPropertyStats(userId) {
  const [rows] = await query(
    `SELECT status, COUNT(*) AS count
     FROM properties
     WHERE listed_by_user_id = :userId AND deleted_at IS NULL
     GROUP BY status`,
    { userId }
  );
  const counts = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  return {
    total,
    draft: counts.draft || 0,
    pending: counts.pending || 0,
    approved: counts.approved || 0,
    rejected: counts.rejected || 0,
    sold: counts.sold || 0,
    rented: counts.rented || 0,
    archived: counts.archived || 0,
  };
}

