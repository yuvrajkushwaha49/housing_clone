import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateUuid } from '../helpers/crypto.helper.js';
import { deleteStoredFile, isProjectImageFile, slugify, storeUpload } from '../helpers/storage.helper.js';
import { writeAuditLog } from '../helpers/audit.helper.js';
import { notifyUser } from '../helpers/notification.helper.js';
import * as builderService from './builder.service.js';
import * as amenityService from './amenity.service.js';
import * as locationService from './location.service.js';
import * as userService from './user.service.js';
import * as projectReviewService from './projectReview.service.js';

async function uniqueProjectSlug(name, excludeId = null) {
  let slug = slugify(name) || 'project';
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const [rows] = await query(
      `SELECT id FROM projects WHERE slug = :slug AND deleted_at IS NULL
       ${excludeId ? 'AND id <> :excludeId' : ''} LIMIT 1`,
      { slug: candidate, excludeId }
    );
    if (!rows.length) return candidate;
    n += 1;
  }
}

function assertProjectPriceRange(minPrice, maxPrice) {
  if (minPrice == null || maxPrice == null) return;
  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) {
    throw new ApiError(400, 'Invalid project price');
  }
  if (max <= min) {
    throw new ApiError(400, 'Max price must be greater than min price');
  }
}

function unitDeliveryValues(payload = {}) {
  return {
    isReadyToMove: payload.isReadyToMove ? 1 : 0,
    deliveryDate: payload.deliveryDate || null,
  };
}

function assertUnitPriceInProjectRange(price, project, unitLabel = 'Unit') {
  if (price == null || price === '') return;

  const unitPrice = Number(price);
  if (Number.isNaN(unitPrice)) {
    throw new ApiError(400, 'Invalid unit price');
  }

  const min = project.min_price != null ? Number(project.min_price) : null;
  const max = project.max_price != null ? Number(project.max_price) : null;

  if (min == null || max == null) {
    throw new ApiError(400, 'Set project minimum and maximum price before adding unit prices');
  }
  assertProjectPriceRange(min, max);
  if (unitPrice < min || unitPrice > max) {
    throw new ApiError(
      400,
      `${unitLabel} price must be between ₹${min.toLocaleString('en-IN')} and ₹${max.toLocaleString('en-IN')}`
    );
  }
}

async function assertExistingUnitsFitPriceRange(projectId, minPrice, maxPrice) {
  const min = minPrice != null ? Number(minPrice) : null;
  const max = maxPrice != null ? Number(maxPrice) : null;
  if (min == null || max == null) return;

  const [units] = await query(
    `SELECT unit_number AS unitNumber, price
     FROM project_units
     WHERE project_id = :projectId AND deleted_at IS NULL AND price IS NOT NULL`,
    { projectId }
  );

  for (const unit of units) {
    assertUnitPriceInProjectRange(
      unit.price,
      { min_price: min, max_price: max },
      unit.unitNumber ? `Unit ${unit.unitNumber}` : 'Unit'
    );
  }
}

function isProjectPubliclyVisible(row) {
  return row.status === 'published'
    || (row.status === 'pending' && row.published_at != null);
}

const PUBLIC_PROJECT_SQL = `(p.status = 'published' OR (p.status = 'pending' AND p.published_at IS NOT NULL))`;

function mapProject(r) {
  return {
    id: r.uuid,
    slug: r.slug,
    name: r.name,
    description: r.description,
    status: r.status,
    publiclyVisible: isProjectPubliclyVisible(r),
    verificationStatus: r.verification_status,
    reraId: r.rera_id,
    launchDate: r.launch_date,
    possessionDate: r.possession_date,
    minPrice: r.min_price != null ? Number(r.min_price) : null,
    maxPrice: r.max_price != null ? Number(r.max_price) : null,
    addressLine: r.address_line,
    latitude: r.latitude,
    longitude: r.longitude,
    brochureUrl: r.brochure_path ? `/uploads/${r.brochure_path}` : null,
    viewsCount: r.views_count,
    publishedAt: r.published_at,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    rejectionReason: r.rejection_reason,
    resubmitNote: r.resubmit_note,
    submissionCount: Number(r.submission_count || 0),
    category: r.category_uuid
      ? { id: r.category_uuid, name: r.category_name }
      : null,
    city: r.city_uuid ? { id: r.city_uuid, name: r.city_name, slug: r.city_slug } : null,
    state: r.state_uuid ? { id: r.state_uuid, name: r.state_name } : null,
    country: r.country_uuid ? { id: r.country_uuid, name: r.country_name } : null,
    locality: r.locality_uuid
      ? { id: r.locality_uuid, name: r.locality_name }
      : null,
    builder: r.builder_uuid
      ? {
          id: r.builder_uuid,
          companyName: r.company_name,
          reraNumber: r.builder_rera,
        }
      : null,
    primaryImage: r.primary_image ? `/uploads/${r.primary_image}` : null,
  };
}

const projectSelect = `
  p.id, p.uuid, p.slug, p.name, p.description, p.status, p.verification_status,
  p.rera_id, p.launch_date, p.possession_date, p.min_price, p.max_price,
  p.address_line, p.latitude, p.longitude, p.brochure_path, p.views_count,
  p.published_at, p.meta_title, p.meta_description, p.rejection_reason, p.resubmit_note, p.submission_count,
  pc.uuid AS category_uuid, pc.name AS category_name,
  co.uuid AS country_uuid, co.name AS country_name,
  st.uuid AS state_uuid, st.name AS state_name,
  ci.uuid AS city_uuid, ci.name AS city_name, ci.slug AS city_slug,
  lo.uuid AS locality_uuid, lo.name AS locality_name,
  bp.uuid AS builder_uuid, bp.company_name, bp.rera_number AS builder_rera,
  (SELECT pm.file_path FROM project_media pm
    WHERE pm.project_id = p.id AND pm.deleted_at IS NULL AND pm.media_type = 'image'
    ORDER BY pm.is_primary DESC, pm.sort_order ASC, pm.id ASC LIMIT 1) AS primary_image
`;

async function getRawProject(uuid) {
  const [rows] = await query(
    `SELECT * FROM projects WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Project not found');
  return rows[0];
}

async function assertProjectOwner(project, user) {
  if (['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode)) return;
  const profile = await builderService.getRawProfileByUserId(user.id);
  if (!profile || profile.id !== project.builder_id) {
    throw new ApiError(403, 'Forbidden');
  }
}

export async function createProject(payload, user, req) {
  const profile = await builderService.getOrCreateProfileForUser(user);
  const rawProfile = await builderService.getRawProfileByUserId(user.id);

  let loc = {};
  if (payload.cityId) {
    loc = await locationService.resolveLocationIds({
      countryId: payload.countryId,
      stateId: payload.stateId,
      cityId: payload.cityId,
      localityId: payload.localityId,
    });
  }

  let categoryId = null;
  if (payload.categoryId) {
    const [cats] = await query(
      `SELECT id FROM property_categories WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.categoryId }
    );
    if (!cats.length) throw new ApiError(400, 'Invalid category');
    categoryId = cats[0].id;
  }

  const uuid = generateUuid();
  const slug = await uniqueProjectSlug(payload.name);
  const status = payload.submit ? 'pending' : 'draft';
  const submissionCount = payload.submit ? 1 : 0;

  if (payload.minPrice != null && payload.maxPrice != null) {
    assertProjectPriceRange(payload.minPrice, payload.maxPrice);
  }

  await query(
    `INSERT INTO projects
      (uuid, slug, builder_id, name, description, category_id,
       country_id, state_id, city_id, locality_id, address_line, latitude, longitude,
       rera_id, launch_date, possession_date, min_price, max_price,
       status, meta_title, meta_description, meta_keywords, created_by,
       published_at, submission_count)
     VALUES
      (:uuid, :slug, :builderId, :name, :description, :categoryId,
       :countryId, :stateId, :cityId, :localityId, :addressLine, :latitude, :longitude,
       :reraId, :launchDate, :possessionDate, :minPrice, :maxPrice,
       :status, :metaTitle, :metaDescription, :metaKeywords, :createdBy,
       NULL, :submissionCount)`,
    {
      uuid,
      slug,
      builderId: rawProfile.id,
      name: payload.name,
      description: payload.description,
      categoryId,
      countryId: loc.countryId || null,
      stateId: loc.stateId || null,
      cityId: loc.cityId || null,
      localityId: loc.localityId || null,
      addressLine: payload.addressLine || null,
      latitude: payload.latitude || null,
      longitude: payload.longitude || null,
      reraId: payload.reraId || null,
      launchDate: payload.launchDate || null,
      possessionDate: payload.possessionDate || null,
      minPrice: payload.minPrice ?? null,
      maxPrice: payload.maxPrice ?? null,
      status,
      metaTitle: payload.metaTitle || payload.name,
      metaDescription: payload.metaDescription || null,
      metaKeywords: payload.metaKeywords || null,
      createdBy: user.id,
      submissionCount,
    }
  );

  if (payload.amenityIds?.length) {
    const amenityIds = await amenityService.resolveAmenityIds(payload.amenityIds);
    const project = await getRawProject(uuid);
    for (const amenityId of amenityIds) {
      await query(
        `INSERT IGNORE INTO project_amenities (project_id, amenity_id) VALUES (:projectId, :amenityId)`,
        { projectId: project.id, amenityId }
      );
    }
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'projects.create',
    entityType: 'project',
    entityId: uuid,
    newValues: { name: payload.name, status },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getProjectByUuid(uuid, { includePrivate: true });
}

export async function updateProject(uuid, payload, user, req) {
  const project = await getRawProject(uuid);
  await assertProjectOwner(project, user);

  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode) && project.status === 'pending') {
    throw new ApiError(400, 'Cannot edit project while pending approval');
  }

  let loc = {
    countryId: project.country_id,
    stateId: project.state_id,
    cityId: project.city_id,
    localityId: project.locality_id,
  };
  if (payload.cityId) {
    loc = await locationService.resolveLocationIds({
      countryId: payload.countryId,
      stateId: payload.stateId,
      cityId: payload.cityId,
      localityId: payload.localityId,
    });
  }

  let categoryId = project.category_id;
  if (payload.categoryId) {
    const [cats] = await query(
      `SELECT id FROM property_categories WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.categoryId }
    );
    if (!cats.length) throw new ApiError(400, 'Invalid category');
    categoryId = cats[0].id;
  }

  const nextMinPrice = payload.minPrice !== undefined ? payload.minPrice : project.min_price;
  const nextMaxPrice = payload.maxPrice !== undefined ? payload.maxPrice : project.max_price;
  if (nextMinPrice != null && nextMaxPrice != null) {
    assertProjectPriceRange(nextMinPrice, nextMaxPrice);
  }
  if (payload.minPrice !== undefined || payload.maxPrice !== undefined) {
    await assertExistingUnitsFitPriceRange(project.id, nextMinPrice, nextMaxPrice);
  }

  await query(
    `UPDATE projects SET
      name = COALESCE(:name, name),
      description = COALESCE(:description, description),
      category_id = :categoryId,
      country_id = :countryId,
      state_id = :stateId,
      city_id = :cityId,
      locality_id = :localityId,
      address_line = COALESCE(:addressLine, address_line),
      latitude = COALESCE(:latitude, latitude),
      longitude = COALESCE(:longitude, longitude),
      rera_id = COALESCE(:reraId, rera_id),
      launch_date = COALESCE(:launchDate, launch_date),
      possession_date = COALESCE(:possessionDate, possession_date),
      min_price = COALESCE(:minPrice, min_price),
      max_price = COALESCE(:maxPrice, max_price),
      meta_title = COALESCE(:metaTitle, meta_title),
      meta_description = COALESCE(:metaDescription, meta_description),
      updated_by = :actorId
     WHERE id = :id`,
    {
      id: project.id,
      name: payload.name || null,
      description: payload.description || null,
      categoryId,
      countryId: loc.countryId,
      stateId: loc.stateId,
      cityId: loc.cityId,
      localityId: loc.localityId,
      addressLine: payload.addressLine ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      reraId: payload.reraId ?? null,
      launchDate: payload.launchDate ?? null,
      possessionDate: payload.possessionDate ?? null,
      minPrice: payload.minPrice ?? null,
      maxPrice: payload.maxPrice ?? null,
      metaTitle: payload.metaTitle ?? null,
      metaDescription: payload.metaDescription ?? null,
      actorId: user.id,
    }
  );

  if (payload.amenityIds) {
    const amenityIds = await amenityService.resolveAmenityIds(payload.amenityIds);
    const [existing] = await query(
      `SELECT amenity_id AS amenityId, image_path AS imagePath
       FROM project_amenities WHERE project_id = :id`,
      { id: project.id }
    );
    const imageByAmenityId = Object.fromEntries(
      existing.map((row) => [row.amenityId, row.imagePath])
    );
    await query(`DELETE FROM project_amenities WHERE project_id = :id`, { id: project.id });
    for (const amenityId of amenityIds) {
      await query(
        `INSERT INTO project_amenities (project_id, amenity_id, image_path)
         VALUES (:projectId, :amenityId, :imagePath)`,
        {
          projectId: project.id,
          amenityId,
          imagePath: imageByAmenityId[amenityId] || null,
        }
      );
    }
  }

  return getProjectByUuid(uuid, { includePrivate: true });
}

export async function updateProjectStatus(uuid, { status, rejectionReason, resubmitNote }, user, req) {
  const project = await getRawProject(uuid);
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);

  if (!isAdmin) {
    await assertProjectOwner(project, user);
    const allowed = {
      draft: ['pending', 'archived'],
      pending: ['draft', 'archived'],
      published: ['archived', 'pending'],
      rejected: ['draft', 'pending', 'archived'],
    };
    if (!(allowed[project.status] || []).includes(status)) {
      throw new ApiError(400, `Cannot change status from ${project.status} to ${status}`);
    }
    if (
      status === 'pending'
      && ['rejected', 'published'].includes(project.status)
      && !resubmitNote?.trim()
    ) {
      throw new ApiError(400, 'Please add a note explaining what you updated before resubmitting for review');
    }
  } else {
    const allowed = {
      pending: ['published', 'rejected'],
      published: ['archived'],
      rejected: ['pending'],
      draft: ['pending'],
    };
    if (!(allowed[project.status] || []).includes(status)) {
      throw new ApiError(400, `Cannot change status from ${project.status} to ${status}`);
    }
    if (status === 'rejected' && !rejectionReason?.trim()) {
      throw new ApiError(400, 'Rejection reason is required');
    }
  }

  const incrementSubmission = !isAdmin && status === 'pending';
  const nextResubmitNote = status === 'published'
    ? null
    : status === 'pending' && resubmitNote?.trim()
      ? resubmitNote.trim()
      : project.resubmit_note;
  const nextPublishedAt = status === 'published'
    ? (project.published_at || new Date())
    : project.published_at;
  const nextApprovedAt = status === 'published' ? new Date() : project.approved_at;
  const nextApprovedBy = status === 'published' ? user.id : project.approved_by;

  await query(
    `UPDATE projects SET
      status = :status,
      rejection_reason = :rejectionReason,
      resubmit_note = :resubmitNote,
      submission_count = :submissionCount,
      published_at = :publishedAt,
      approved_at = :approvedAt,
      approved_by = :approvedBy,
      updated_by = :actorId
     WHERE id = :id`,
    {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason || 'Rejected' : null,
      resubmitNote: nextResubmitNote,
      submissionCount: Number(project.submission_count || 0) + (incrementSubmission ? 1 : 0),
      publishedAt: nextPublishedAt,
      approvedAt: nextApprovedAt,
      approvedBy: nextApprovedBy,
      actorId: user.id,
      id: project.id,
    }
  );

  if (status === 'pending' && !isAdmin) {
    await projectReviewService.createReviewSession(uuid);
  }

  if (['published', 'rejected'].includes(status) && isAdmin) {
    const [builders] = await query(
      `SELECT u.id, u.email FROM builder_profiles bp
       INNER JOIN users u ON u.id = bp.user_id
       WHERE bp.id = :id LIMIT 1`,
      { id: project.builder_id }
    );
    if (builders.length) {
      await notifyUser(builders[0].id, {
        type: `project.${status}`,
        title: `Project ${status}`,
        body:
          status === 'published'
            ? `Your project "${project.name}" is now live.`
            : `Your project "${project.name}" was rejected: ${rejectionReason || 'Rejected'}`,
        data: { projectId: project.uuid, status },
        email: builders[0].email,
      });
    }
  }

  return getProjectByUuid(uuid, { includePrivate: true });
}

export async function softDeleteProject(uuid, user, req) {
  const project = await getRawProject(uuid);
  await assertProjectOwner(project, user);
  await query(
    `UPDATE projects SET deleted_at = NOW(), slug = CONCAT(slug, '__del__', id), updated_by = :actorId
     WHERE id = :id`,
    { id: project.id, actorId: user.id }
  );
  await writeAuditLog({
    actorUserId: user.id,
    action: 'projects.delete',
    entityType: 'project',
    entityId: uuid,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return { message: 'Project deleted' };
}

export async function getProjectByUuid(uuid, { includePrivate = false, incrementView = false, user = null } = {}) {
  const [rows] = await query(
    `SELECT ${projectSelect}
     FROM projects p
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     LEFT JOIN property_categories pc ON pc.id = p.category_id
     LEFT JOIN countries co ON co.id = p.country_id
     LEFT JOIN states st ON st.id = p.state_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     WHERE p.uuid = :uuid AND p.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Project not found');
  if (!isProjectPubliclyVisible(rows[0])) {
    if (!includePrivate) throw new ApiError(404, 'Project not found');
    if (user) {
      const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
      if (!isAdmin) {
        const profile = await builderService.getRawProfileByUserId(user.id);
        if (!profile || profile.id !== rows[0].builder_id) {
          throw new ApiError(404, 'Project not found');
        }
      }
    }
  }

  if (incrementView && isProjectPubliclyVisible(rows[0])) {
    await query(`UPDATE projects SET views_count = views_count + 1 WHERE id = :id`, {
      id: rows[0].id,
    });
  }

  const project = mapProject(rows[0]);
  const [buildings] = await query(
    `SELECT uuid, name, sort_order AS sortOrder, is_active AS isActive
     FROM project_buildings WHERE project_id = :id AND deleted_at IS NULL
     ORDER BY sort_order, id`,
    { id: rows[0].id }
  );
  const [towers] = await query(
    `SELECT t.uuid, t.name, t.total_floors AS totalFloors, t.total_units AS totalUnits,
            t.sort_order AS sortOrder, t.is_active AS isActive,
            b.uuid AS buildingId, b.name AS buildingName
     FROM project_towers t
     LEFT JOIN project_buildings b ON b.id = t.building_id AND b.deleted_at IS NULL
     WHERE t.project_id = :id AND t.deleted_at IS NULL
     ORDER BY b.sort_order, b.id, t.sort_order, t.id`,
    { id: rows[0].id }
  );
  const [units] = await query(
    `SELECT u.uuid, u.unit_number AS unitNumber, u.unit_type AS unitType, u.bedrooms, u.bathrooms,
            u.balconies, u.parking, u.area, u.carpet_area AS carpetArea, u.price,
            u.floor_number AS floorNumber, u.status, u.is_ready_to_move AS isReadyToMove,
            u.delivery_date AS deliveryDate,
            t.uuid AS towerId, t.name AS towerName,
            au.id AS areaUnitId, au.name AS areaUnitName,
            fu.id AS furnishingId, fu.code AS furnishingCode, fu.name AS furnishingName,
            fa.id AS facingId, fa.code AS facingCode, fa.name AS facingName
     FROM project_units u
     LEFT JOIN project_towers t ON t.id = u.tower_id
     LEFT JOIN area_units au ON au.id = u.area_unit_id
     LEFT JOIN furnishing_types fu ON fu.id = u.furnishing_id
     LEFT JOIN facing_types fa ON fa.id = u.facing_id
     WHERE u.project_id = :id AND u.deleted_at IS NULL
     ORDER BY u.unit_number`,
    { id: rows[0].id }
  );
  const [media] = await query(
    `SELECT uuid, media_type AS mediaType, file_path, file_name AS fileName, caption, sort_order AS sortOrder, is_primary AS isPrimary
     FROM project_media WHERE project_id = :id AND deleted_at IS NULL
     ORDER BY is_primary DESC, sort_order, id`,
    { id: rows[0].id }
  );
  const [amenities] = await query(
    `SELECT a.uuid, a.name, a.code, a.icon, a.category,
            pa.image_path AS projectImagePath
     FROM project_amenities pa
     INNER JOIN amenities a ON a.id = pa.amenity_id
     WHERE pa.project_id = :id AND a.deleted_at IS NULL`,
    { id: rows[0].id }
  );

  const mapAmenityRow = (a, isSelected = true) => {
    const projectImagePath = a.projectImagePath?.replace(/^\/+/, '').replace(/^uploads\//, '');
    return {
      id: a.uuid,
      name: a.name,
      code: a.code,
      icon: a.icon,
      category: a.category,
      isSelected,
      imageUrl: projectImagePath ? `/uploads/${projectImagePath}` : null,
      projectImageUrl: projectImagePath ? `/uploads/${projectImagePath}` : null,
    };
  };

  let allAmenities = null;
  if (includePrivate) {
    const [allAmenitiesRows] = await query(
      `SELECT a.uuid, a.name, a.code, a.icon, a.category,
              pa.image_path AS projectImagePath,
              CASE WHEN pa.amenity_id IS NOT NULL THEN 1 ELSE 0 END AS isSelected
       FROM amenities a
       LEFT JOIN project_amenities pa ON pa.amenity_id = a.id AND pa.project_id = :id
       WHERE a.deleted_at IS NULL AND a.is_active = 1
       ORDER BY a.sort_order, a.name`,
      { id: rows[0].id }
    );
    allAmenities = allAmenitiesRows.map((a) => mapAmenityRow(a, Boolean(a.isSelected)));
  }

  const inventory = {
    available: units.filter((u) => u.status === 'available').length,
    held: units.filter((u) => u.status === 'held').length,
    sold: units.filter((u) => u.status === 'sold').length,
    blocked: units.filter((u) => u.status === 'blocked').length,
    total: units.length,
  };

  const mappedTowers = towers.map((t) => ({
    id: t.uuid,
    name: t.name,
    totalFloors: t.totalFloors != null ? Number(t.totalFloors) : null,
    totalUnits: t.totalUnits != null ? Number(t.totalUnits) : null,
    sortOrder: t.sortOrder,
    isActive: Boolean(t.isActive),
    building: t.buildingId ? { id: t.buildingId, name: t.buildingName } : null,
  }));

  const mappedBuildings = buildings.map((b) => ({
    id: b.uuid,
    name: b.name,
    sortOrder: b.sortOrder,
    isActive: Boolean(b.isActive),
    towers: mappedTowers.filter((t) => t.building?.id === b.uuid),
    totalFloors: mappedTowers
      .filter((t) => t.building?.id === b.uuid && t.isActive)
      .reduce((sum, t) => sum + (t.totalFloors || 0), 0),
    towerCount: mappedTowers.filter((t) => t.building?.id === b.uuid).length,
    activeTowerCount: mappedTowers.filter((t) => t.building?.id === b.uuid && t.isActive).length,
  }));

  const unassignedTowers = mappedTowers.filter((t) => !t.building);
  const activeTowers = mappedTowers.filter((t) => t.isActive);

  const result = {
    ...project,
    buildings: mappedBuildings,
    towers: mappedTowers,
    unassignedTowers,
    structure: {
      buildingCount: mappedBuildings.filter((b) => b.isActive).length,
      towerCount: activeTowers.length,
      totalFloors: activeTowers.reduce((sum, t) => sum + (t.totalFloors || 0), 0),
    },
    units: units.map((u) => ({
      id: u.uuid,
      unitNumber: u.unitNumber,
      unitType: u.unitType,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      balconies: u.balconies,
      parking: u.parking,
      area: u.area != null ? Number(u.area) : null,
      carpetArea: u.carpetArea != null ? Number(u.carpetArea) : null,
      areaUnit: u.areaUnitId ? { id: u.areaUnitId, name: u.areaUnitName } : null,
      price: u.price != null ? Number(u.price) : null,
      floorNumber: u.floorNumber,
      status: u.status,
      isReadyToMove: Boolean(u.isReadyToMove),
      deliveryDate: u.deliveryDate,
      furnishing: u.furnishingId
        ? { id: u.furnishingId, code: u.furnishingCode, name: u.furnishingName }
        : null,
      facing: u.facingId
        ? { id: u.facingId, code: u.facingCode, name: u.facingName }
        : null,
      tower: u.towerId ? { id: u.towerId, name: u.towerName } : null,
    })),
    media: media.map((m) => ({
      id: m.uuid,
      mediaType: m.mediaType,
      url: `/uploads/${m.file_path}`,
      fileName: m.fileName,
      caption: m.caption,
      sortOrder: m.sortOrder,
      isPrimary: Boolean(m.isPrimary),
    })),
    amenities: amenities.map((a) => mapAmenityRow(a, true)),
    allAmenities,
    inventory,
  };

  if (includePrivate) {
    result.review = await projectReviewService.getProjectReview(uuid);
    const needsFieldReview = result.review?.items?.length
      && !result.review.items[0].fieldKey;
    if ((!result.review && rows[0].status === 'pending') || needsFieldReview) {
      result.review = await projectReviewService.createReviewSession(uuid);
    }
  }

  return result;
}

export async function getProjectBySlug(slug) {
  const [rows] = await query(
    `SELECT uuid FROM projects WHERE slug = :slug AND deleted_at IS NULL LIMIT 1`,
    { slug }
  );
  if (!rows.length) throw new ApiError(404, 'Project not found');
  return getProjectByUuid(rows[0].uuid, { includePrivate: false, incrementView: true });
}

export async function listProjects(filters = {}, user = null) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 50);
  const offset = (page - 1) * limit;
  const where = ['p.deleted_at IS NULL'];
  const params = {};

  if (filters.mine && user) {
    const profile = await builderService.getRawProfileByUserId(user.id);
    if (!profile) return { items: [], meta: { page, limit, total: 0, totalPages: 1 } };
    where.push('p.builder_id = :builderId');
    params.builderId = profile.id;
  } else if (filters.admin) {
    // all
  } else {
    where.push(PUBLIC_PROJECT_SQL);
  }

  if (filters.status) {
    where.push('p.status = :status');
    params.status = filters.status;
  }
  if (filters.cityId) {
    where.push('ci.uuid = :cityId');
    params.cityId = filters.cityId;
  }
  if (filters.localityId) {
    where.push('lo.uuid = :localityId');
    params.localityId = filters.localityId;
  }
  if (filters.q) {
    where.push('(p.name LIKE :q OR p.description LIKE :q)');
    params.q = `%${filters.q}%`;
  }
  if (filters.builderId) {
    where.push('bp.uuid = :builderUuid');
    params.builderUuid = filters.builderId;
  }

  const [countRows] = await query(
    `SELECT COUNT(*) AS total
     FROM projects p
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     WHERE ${where.join(' AND ')}`,
    params
  );

  const [rows] = await query(
    `SELECT ${projectSelect}
     FROM projects p
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     LEFT JOIN property_categories pc ON pc.id = p.category_id
     LEFT JOIN countries co ON co.id = p.country_id
     LEFT JOIN states st ON st.id = p.state_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN localities lo ON lo.id = p.locality_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map(mapProject),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function getMyProjectStats(user) {
  const profile = await builderService.getRawProfileByUserId(user.id);
  if (!profile) {
    return { draft: 0, pending: 0, published: 0, rejected: 0, archived: 0, total: 0 };
  }
  const [rows] = await query(
    `SELECT status, COUNT(*) AS total
     FROM projects
     WHERE builder_id = :builderId AND deleted_at IS NULL
     GROUP BY status`,
    { builderId: profile.id }
  );
  const counts = { draft: 0, pending: 0, published: 0, rejected: 0, archived: 0 };
  for (const row of rows) {
    counts[row.status] = Number(row.total);
  }
  return {
    ...counts,
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
  };
}

export async function addBuilding(projectUuid, payload, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const uuid = generateUuid();
  const isActive = payload.isActive === false ? 0 : 1;
  await query(
    `INSERT INTO project_buildings (uuid, project_id, name, sort_order, is_active)
     VALUES (:uuid, :projectId, :name, :sortOrder, :isActive)`,
    {
      uuid,
      projectId: project.id,
      name: payload.name,
      sortOrder: Number(payload.sortOrder || 0),
      isActive,
    }
  );
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function updateBuilding(projectUuid, buildingUuid, payload, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const [rows] = await query(
    `SELECT id FROM project_buildings
     WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
    { uuid: buildingUuid, projectId: project.id }
  );
  if (!rows.length) throw new ApiError(404, 'Building not found');

  const nextName = payload.name !== undefined ? payload.name : undefined;
  const nextSortOrder = payload.sortOrder != null ? Number(payload.sortOrder) : undefined;
  const nextIsActive = payload.isActive !== undefined ? (payload.isActive ? 1 : 0) : undefined;

  await query(
    `UPDATE project_buildings SET
      name = COALESCE(:name, name),
      sort_order = COALESCE(:sortOrder, sort_order),
      is_active = COALESCE(:isActive, is_active)
     WHERE id = :id`,
    {
      name: nextName ?? null,
      sortOrder: nextSortOrder ?? null,
      isActive: nextIsActive ?? null,
      id: rows[0].id,
    }
  );
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function deleteBuilding(projectUuid, buildingUuid, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const [rows] = await query(
    `SELECT id FROM project_buildings
     WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
    { uuid: buildingUuid, projectId: project.id }
  );
  if (!rows.length) throw new ApiError(404, 'Building not found');
  await query(`UPDATE project_buildings SET deleted_at = NOW() WHERE id = :id`, { id: rows[0].id });
  await query(
    `UPDATE project_towers SET building_id = NULL WHERE building_id = :buildingId AND deleted_at IS NULL`,
    { buildingId: rows[0].id }
  );
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function addTower(projectUuid, payload, user, req) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);

  let buildingId = null;
  if (payload.buildingId) {
    const [buildings] = await query(
      `SELECT id FROM project_buildings
       WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.buildingId, projectId: project.id }
    );
    if (!buildings.length) throw new ApiError(400, 'Invalid building');
    buildingId = buildings[0].id;
  }

  const uuid = generateUuid();
  const towerIsActive = payload.isActive === false ? 0 : 1;
  await query(
    `INSERT INTO project_towers (uuid, project_id, building_id, name, total_floors, total_units, sort_order, is_active)
     VALUES (:uuid, :projectId, :buildingId, :name, :floors, :units, :sortOrder, :isActive)`,
    {
      uuid,
      projectId: project.id,
      buildingId,
      name: payload.name,
      floors: payload.totalFloors ?? null,
      units: payload.totalUnits ?? null,
      sortOrder: Number(payload.sortOrder || 0),
      isActive: towerIsActive,
    }
  );

  const [towerRows] = await query(
    `SELECT id FROM project_towers WHERE uuid = :uuid AND project_id = :projectId LIMIT 1`,
    { uuid, projectId: project.id }
  );
  const towerInternalId = towerRows[0]?.id;

  const units = Array.isArray(payload.units) ? payload.units : [];
  for (const unit of units) {
    const unitNumber = unit.unitNumber?.trim();
    if (!unitNumber) continue;
    assertUnitPriceInProjectRange(unit.price, project, `Unit ${unitNumber}`);
    const unitUuid = generateUuid();
    const delivery = unitDeliveryValues(unit);
    try {
      await query(
        `INSERT INTO project_units
          (uuid, project_id, tower_id, unit_number, unit_type, bedrooms, bathrooms, balconies, parking,
           area, carpet_area, furnishing_id, facing_id, price, floor_number, status,
           is_ready_to_move, delivery_date)
         VALUES
          (:uuid, :projectId, :towerId, :unitNumber, :unitType, :bedrooms, :bathrooms, :balconies, :parking,
           :area, :carpetArea, :furnishingId, :facingId, :price, :floorNumber, 'available',
           :isReadyToMove, :deliveryDate)`,
        {
          uuid: unitUuid,
          projectId: project.id,
          towerId: towerInternalId,
          unitNumber,
          unitType: unit.unitType || null,
          bedrooms: unit.bedrooms ?? null,
          bathrooms: unit.bathrooms ?? null,
          balconies: unit.balconies ?? null,
          parking: unit.parking ?? null,
          area: unit.area ?? null,
          carpetArea: unit.carpetArea ?? null,
          furnishingId: unit.furnishingId ?? null,
          facingId: unit.facingId ?? null,
          price: unit.price ?? null,
          floorNumber: unit.floorNumber ?? null,
          ...delivery,
        }
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ApiError(409, `Unit number "${unitNumber}" already exists in this project`);
      }
      throw err;
    }
  }

  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function updateTower(projectUuid, towerUuid, payload, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const [towers] = await query(
    `SELECT id FROM project_towers
     WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
    { uuid: towerUuid, projectId: project.id }
  );
  if (!towers.length) throw new ApiError(404, 'Tower not found');

  let buildingId;
  if (payload.buildingId === null || payload.buildingId === '') {
    buildingId = null;
  } else if (payload.buildingId) {
    const [buildings] = await query(
      `SELECT id FROM project_buildings
       WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.buildingId, projectId: project.id }
    );
    if (!buildings.length) throw new ApiError(400, 'Invalid building');
    buildingId = buildings[0].id;
  }

  const nextIsActive = payload.isActive !== undefined ? (payload.isActive ? 1 : 0) : undefined;

  await query(
    `UPDATE project_towers SET
      name = COALESCE(:name, name),
      total_floors = COALESCE(:totalFloors, total_floors),
      total_units = COALESCE(:totalUnits, total_units),
      sort_order = COALESCE(:sortOrder, sort_order),
      is_active = COALESCE(:isActive, is_active),
      building_id = CASE WHEN :buildingIdSet = 1 THEN :buildingId ELSE building_id END
     WHERE id = :id`,
    {
      name: payload.name ?? null,
      totalFloors: payload.totalFloors != null ? Number(payload.totalFloors) : null,
      totalUnits: payload.totalUnits != null ? Number(payload.totalUnits) : null,
      sortOrder: payload.sortOrder != null ? Number(payload.sortOrder) : null,
      isActive: nextIsActive ?? null,
      buildingIdSet: payload.buildingId !== undefined ? 1 : 0,
      buildingId: buildingId ?? null,
      id: towers[0].id,
    }
  );
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function deleteTower(projectUuid, towerUuid, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const [towers] = await query(
    `SELECT id FROM project_towers WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
    { uuid: towerUuid, projectId: project.id }
  );
  if (!towers.length) throw new ApiError(404, 'Tower not found');
  await query(`UPDATE project_towers SET deleted_at = NOW() WHERE id = :id`, { id: towers[0].id });
  await query(
    `UPDATE project_units SET tower_id = NULL WHERE tower_id = :towerId AND deleted_at IS NULL`,
    { towerId: towers[0].id }
  );
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function addUnit(projectUuid, payload, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  assertUnitPriceInProjectRange(
    payload.price,
    project,
    payload.unitNumber ? `Unit ${payload.unitNumber}` : 'Unit'
  );

  let towerId = null;
  if (payload.towerId) {
    const [towers] = await query(
      `SELECT id FROM project_towers WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.towerId, projectId: project.id }
    );
    if (!towers.length) throw new ApiError(400, 'Invalid tower');
    towerId = towers[0].id;
  }

  const uuid = generateUuid();
  const delivery = unitDeliveryValues(payload);
  try {
    await query(
      `INSERT INTO project_units
        (uuid, project_id, tower_id, unit_number, unit_type, bedrooms, bathrooms, balconies, parking,
         area, carpet_area, area_unit_id, furnishing_id, facing_id, price, floor_number, status,
         is_ready_to_move, delivery_date)
       VALUES
        (:uuid, :projectId, :towerId, :unitNumber, :unitType, :bedrooms, :bathrooms, :balconies, :parking,
         :area, :carpetArea, :areaUnitId, :furnishingId, :facingId, :price, :floorNumber, 'available',
         :isReadyToMove, :deliveryDate)`,
      {
        uuid,
        projectId: project.id,
        towerId,
        unitNumber: payload.unitNumber,
        unitType: payload.unitType || null,
        bedrooms: payload.bedrooms ?? null,
        bathrooms: payload.bathrooms ?? null,
        balconies: payload.balconies ?? null,
        parking: payload.parking ?? null,
        area: payload.area ?? null,
        carpetArea: payload.carpetArea ?? null,
        areaUnitId: payload.areaUnitId || null,
        furnishingId: payload.furnishingId ?? null,
        facingId: payload.facingId ?? null,
        price: payload.price ?? null,
        floorNumber: payload.floorNumber ?? null,
        ...delivery,
      }
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Unit number already exists in this project');
    throw err;
  }

  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function updateUnitStatus(unitUuid, status, user) {
  if (!['available', 'held', 'sold', 'blocked'].includes(status)) {
    throw new ApiError(400, 'Invalid unit status');
  }
  const [units] = await query(
    `SELECT u.*, p.uuid AS projectUuid, p.builder_id
     FROM project_units u
     INNER JOIN projects p ON p.id = u.project_id
     WHERE u.uuid = :uuid AND u.deleted_at IS NULL AND p.deleted_at IS NULL
     LIMIT 1`,
    { uuid: unitUuid }
  );
  if (!units.length) throw new ApiError(404, 'Unit not found');
  await assertProjectOwner(
    { builder_id: units[0].builder_id, id: units[0].project_id },
    user
  );
  await query(`UPDATE project_units SET status = :status WHERE id = :id`, {
    status,
    id: units[0].id,
  });
  return getProjectByUuid(units[0].projectUuid, { includePrivate: true });
}

export async function holdUnit(unitUuid, user, { hours = 24 } = {}) {
  await expireHolds();
  const [units] = await query(
    `SELECT u.*, p.uuid AS projectUuid, p.name AS projectName, p.status AS projectStatus,
            p.published_at AS projectPublishedAt,
            bp.user_id AS builderUserId
     FROM project_units u
     INNER JOIN projects p ON p.id = u.project_id
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     WHERE u.uuid = :uuid AND u.deleted_at IS NULL AND p.deleted_at IS NULL
     LIMIT 1`,
    { uuid: unitUuid }
  );
  if (!units.length) throw new ApiError(404, 'Unit not found');
  if (!isProjectPubliclyVisible({
    status: units[0].projectStatus,
    published_at: units[0].projectPublishedAt,
  })) {
    throw new ApiError(400, 'Project is not published');
  }
  if (units[0].status !== 'available') {
    throw new ApiError(409, `Unit is ${units[0].status}`);
  }

  const holdUuid = generateUuid();
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE project_units SET status = 'held' WHERE id = ? AND status = 'available'`,
      [units[0].id]
    );
    await conn.execute(
      `INSERT INTO inventory_holds (uuid, unit_id, held_by_user_id, expires_at, status)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), 'active')`,
      [holdUuid, units[0].id, user.id, Number(hours) || 24]
    );
  });

  const builder = await userService.findUserById(units[0].builderUserId);
  if (builder) {
    await notifyUser(builder.id, {
      type: 'inventory.hold',
      title: 'Unit held',
      body: `Unit ${units[0].unit_number} in ${units[0].projectName} was held`,
      data: { unitId: unitUuid, projectId: units[0].projectUuid },
      email: builder.email,
    });
  }

  return { id: holdUuid, unitId: unitUuid, status: 'held', expiresInHours: hours };
}

export async function releaseHold(unitUuid, user) {
  const [units] = await query(
    `SELECT u.*, p.uuid AS projectUuid, p.builder_id
     FROM project_units u
     INNER JOIN projects p ON p.id = u.project_id
     WHERE u.uuid = :uuid AND u.deleted_at IS NULL LIMIT 1`,
    { uuid: unitUuid }
  );
  if (!units.length) throw new ApiError(404, 'Unit not found');

  const isStaff = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  const profile = await builderService.getRawProfileByUserId(user.id);
  const isBuilder = profile && profile.id === units[0].builder_id;

  const [holds] = await query(
    `SELECT id FROM inventory_holds
     WHERE unit_id = :unitId AND status = 'active' AND deleted_at IS NULL
       AND (held_by_user_id = :userId OR :isOwner = 1)
     ORDER BY id DESC LIMIT 1`,
    { unitId: units[0].id, userId: user.id, isOwner: isStaff || isBuilder ? 1 : 0 }
  );
  if (!holds.length) throw new ApiError(404, 'Active hold not found');

  await query(`UPDATE inventory_holds SET status = 'released' WHERE id = :id`, { id: holds[0].id });
  await query(`UPDATE project_units SET status = 'available' WHERE id = :id AND status = 'held'`, {
    id: units[0].id,
  });
  return { unitId: unitUuid, status: 'available' };
}

async function expireHolds() {
  const [expired] = await query(
    `SELECT h.id, h.unit_id FROM inventory_holds h
     WHERE h.status = 'active' AND h.expires_at < NOW() AND h.deleted_at IS NULL`
  );
  for (const h of expired) {
    await query(`UPDATE inventory_holds SET status = 'expired' WHERE id = :id`, { id: h.id });
    await query(
      `UPDATE project_units SET status = 'available' WHERE id = :id AND status = 'held'`,
      { id: h.unit_id }
    );
  }
}

export async function addProjectMedia(
  projectUuid,
  files,
  { mediaType = 'image', isPrimary = false, captions = [] } = {},
  user
) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  if (!files?.length) throw new ApiError(400, 'No files uploaded');

  const type = ['image', 'video', 'document', 'floor_plan', 'brochure'].includes(mediaType)
    ? mediaType
    : 'image';

  if (type === 'image') {
    const invalid = files.filter((file) => !isProjectImageFile(file));
    if (invalid.length) {
      const names = invalid.map((f) => f.originalname).filter(Boolean).join(', ');
      throw new ApiError(
        400,
        `Invalid gallery image${invalid.length > 1 ? 's' : ''}${names ? `: ${names}` : ''}. Only JPEG, PNG, and JPG are allowed.`
      );
    }
  }

  const storageType = type === 'floor_plan' || type === 'brochure' ? 'document' : type === 'video' ? 'video' : 'image';

  const saved = [];
  for (const [index, file] of files.entries()) {
    const stored = await storeUpload(file, {
      folder: `projects/${project.uuid}`,
      mediaType: storageType === 'document' && file.mimetype?.startsWith('image/') ? 'image' : storageType,
    });
    const mediaUuid = generateUuid();
    const makePrimary = Boolean(isPrimary) && index === 0 && type === 'image';
    if (makePrimary) {
      await query(
        `UPDATE project_media SET is_primary = 0 WHERE project_id = :id AND media_type = 'image' AND deleted_at IS NULL`,
        { id: project.id }
      );
    }
    await query(
      `INSERT INTO project_media
        (uuid, project_id, media_type, file_path, file_name, mime_type, file_size, sort_order, is_primary, caption, created_by)
       VALUES (:uuid, :projectId, :mediaType, :filePath, :fileName, :mimeType, :fileSize, :sortOrder, :isPrimary, :caption, :createdBy)`,
      {
        uuid: mediaUuid,
        projectId: project.id,
        mediaType: type,
        filePath: stored.filePath,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        sortOrder: index,
        isPrimary: makePrimary ? 1 : 0,
        caption: captions[index]?.trim() || null,
        createdBy: user.id,
      }
    );
    if (type === 'brochure') {
      await query(`UPDATE projects SET brochure_path = :path WHERE id = :id`, {
        path: stored.filePath,
        id: project.id,
      });
    }
    saved.push({
      id: mediaUuid,
      url: stored.url,
      mediaType: type,
      caption: captions[index]?.trim() || null,
    });
  }
  return { media: saved, project: await getProjectByUuid(projectUuid, { includePrivate: true }) };
}

export async function uploadProjectAmenityImage(projectUuid, amenityUuid, file, user) {
  if (!file) throw new ApiError(400, 'No file uploaded');
  if (!isProjectImageFile(file)) {
    throw new ApiError(400, 'Invalid image type. Only JPEG, PNG, and JPG are allowed.');
  }
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);

  const [amenityRows] = await query(
    `SELECT id FROM amenities WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1`,
    { uuid: amenityUuid }
  );
  if (!amenityRows.length) throw new ApiError(404, 'Amenity not found');

  const [linkRows] = await query(
    `SELECT image_path AS imagePath FROM project_amenities
     WHERE project_id = :projectId AND amenity_id = :amenityId LIMIT 1`,
    { projectId: project.id, amenityId: amenityRows[0].id }
  );
  if (!linkRows.length) {
    throw new ApiError(400, 'Amenity must be selected for this project before uploading an image');
  }

  const stored = await storeUpload(file, {
    folder: `projects/${project.uuid}/amenities`,
    mediaType: 'image',
  });
  if (linkRows[0].imagePath) await deleteStoredFile(linkRows[0].imagePath);

  await query(
    `UPDATE project_amenities SET image_path = :imagePath
     WHERE project_id = :projectId AND amenity_id = :amenityId`,
    {
      imagePath: stored.filePath,
      projectId: project.id,
      amenityId: amenityRows[0].id,
    }
  );

  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function updateProjectMedia(projectUuid, mediaUuid, { caption }, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const [rows] = await query(
    `SELECT id FROM project_media
     WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
    { uuid: mediaUuid, projectId: project.id }
  );
  if (!rows.length) throw new ApiError(404, 'Media not found');
  await query(
    `UPDATE project_media SET caption = :caption WHERE id = :id`,
    { id: rows[0].id, caption: caption?.trim() || null }
  );
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function deleteProjectMedia(projectUuid, mediaUuid, user) {
  const project = await getRawProject(projectUuid);
  await assertProjectOwner(project, user);
  const [rows] = await query(
    `SELECT id, file_path FROM project_media
     WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
    { uuid: mediaUuid, projectId: project.id }
  );
  if (!rows.length) throw new ApiError(404, 'Media not found');
  await query(`UPDATE project_media SET deleted_at = NOW() WHERE id = :id`, { id: rows[0].id });
  await deleteStoredFile(rows[0].file_path);
  return getProjectByUuid(projectUuid, { includePrivate: true });
}

export async function createBooking(payload, user, req) {
  const project = await getRawProject(payload.projectId);
  if (!isProjectPubliclyVisible(project)) throw new ApiError(400, 'Project is not open for booking');

  let unitId = null;
  if (payload.unitId) {
    const [units] = await query(
      `SELECT id, status FROM project_units
       WHERE uuid = :uuid AND project_id = :projectId AND deleted_at IS NULL LIMIT 1`,
      { uuid: payload.unitId, projectId: project.id }
    );
    if (!units.length) throw new ApiError(400, 'Invalid unit');
    if (!['available', 'held'].includes(units[0].status)) {
      throw new ApiError(409, `Unit is ${units[0].status}`);
    }
    unitId = units[0].id;
  }

  const uuid = generateUuid();
  await query(
    `INSERT INTO booking_requests
      (uuid, project_id, unit_id, buyer_user_id, amount, status, notes)
     VALUES (:uuid, :projectId, :unitId, :buyerId, :amount, 'requested', :notes)`,
    {
      uuid,
      projectId: project.id,
      unitId,
      buyerId: user.id,
      amount: payload.amount ?? null,
      notes: payload.notes || null,
    }
  );

  // Contact Sellers historically wrote bookings only — mirror those into Leads too
  if (payload.notes && /^Contact request/i.test(String(payload.notes))) {
    const [builders] = await query(
      `SELECT u.id, u.email, u.first_name FROM builder_profiles bp
       INNER JOIN users u ON u.id = bp.user_id WHERE bp.id = :id LIMIT 1`,
      { id: project.builder_id }
    );
    const [buyers] = await query(
      `SELECT first_name, last_name, email, phone FROM users WHERE id = :id LIMIT 1`,
      { id: user.id }
    );
    const buyer = buyers[0] || {};
    const notesText = String(payload.notes);
    const pick = (label) => {
      const m = notesText.match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const guestName =
      pick('Name') ||
      `${buyer.first_name || ''}${buyer.last_name ? ` ${buyer.last_name}` : ''}`.trim() ||
      'Buyer';
    const guestEmail = pick('Email') || buyer.email || user.email || '';
    const guestPhone = pick('Phone') || buyer.phone || '';

    const [dup] = await query(
      `SELECT id FROM leads
       WHERE deleted_at IS NULL AND source = 'contact'
         AND project_id = :projectId AND buyer_user_id = :buyerId
         AND created_at >= (NOW() - INTERVAL 2 MINUTE)
       LIMIT 1`,
      { projectId: project.id, buyerId: user.id }
    );
    if (!dup.length && builders.length) {
      const leadUuid = generateUuid();
      await query(
        `INSERT INTO leads
          (uuid, source, project_id, assigned_to_user_id, buyer_user_id,
           guest_name, guest_email, guest_phone, status, notes, created_by)
         VALUES (:uuid, 'contact', :projectId, :assignedTo, :buyerId,
                 :guestName, :guestEmail, :guestPhone, 'new', :notes, :createdBy)`,
        {
          uuid: leadUuid,
          projectId: project.id,
          assignedTo: builders[0].id,
          buyerId: user.id,
          guestName,
          guestEmail,
          guestPhone: guestPhone || null,
          notes: notesText,
          createdBy: user.id,
        }
      );
      await notifyUser(builders[0].id, {
        type: 'lead.contact',
        title: 'New seller contact request',
        body: `${guestName} requested contact details for ${project.name}`,
        data: { projectId: project.uuid, leadId: leadUuid, bookingId: uuid },
        email: builders[0].email,
      });
    }
  }

  const [builders] = await query(
    `SELECT u.id, u.email FROM builder_profiles bp
     INNER JOIN users u ON u.id = bp.user_id WHERE bp.id = :id LIMIT 1`,
    { id: project.builder_id }
  );
  if (builders.length) {
    await notifyUser(builders[0].id, {
      type: 'booking.new',
      title: 'New booking request',
      body: `Booking request for ${project.name}`,
      data: { bookingId: uuid, projectId: project.uuid },
      email: builders[0].email,
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'bookings.create',
    entityType: 'booking_request',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getBooking(uuid, user);
}

export async function getBooking(uuid, user) {
  const [rows] = await query(
    `SELECT b.uuid, b.amount, b.status, b.notes, b.handler_notes AS handlerNotes, b.created_at AS createdAt,
            p.uuid AS projectId, p.name AS projectName, p.slug AS projectSlug,
            u.uuid AS unitId, u.unit_number AS unitNumber,
            buyer.uuid AS buyerId, buyer.email AS buyerEmail, buyer.first_name AS buyerFirstName,
            bp.user_id AS builderUserId
     FROM booking_requests b
     INNER JOIN projects p ON p.id = b.project_id
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     LEFT JOIN project_units u ON u.id = b.unit_id
     INNER JOIN users buyer ON buyer.id = b.buyer_user_id
     WHERE b.uuid = :uuid AND b.deleted_at IS NULL
     LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Booking not found');
  const r = rows[0];
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  const isBuilder = r.builderUserId === user.id;
  const isBuyer = await userOwnsBooking(user.id, { uuid: r.uuid });
  if (!isBuyer && !isBuilder && !isAdmin) {
    throw new ApiError(403, 'Forbidden');
  }
  return {
    id: r.uuid,
    amount: r.amount != null ? Number(r.amount) : null,
    status: r.status,
    notes: r.notes,
    handlerNotes: r.handlerNotes,
    createdAt: r.createdAt,
    project: { id: r.projectId, name: r.projectName, slug: r.projectSlug },
    unit: r.unitId ? { id: r.unitId, unitNumber: r.unitNumber } : null,
    buyer: { id: r.buyerId, email: r.buyerEmail, name: r.buyerFirstName },
  };
}

async function userOwnsBooking(userId, row) {
  const [check] = await query(
    `SELECT id FROM booking_requests WHERE uuid = :uuid AND buyer_user_id = :userId LIMIT 1`,
    { uuid: row.uuid || row.id, userId }
  );
  return check.length > 0;
}

export async function listBookings(user, filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 20), 100);
  const offset = (page - 1) * limit;
  const where = ['b.deleted_at IS NULL'];
  const params = {};

  if (user.roleCode === 'BUYER') {
    where.push('b.buyer_user_id = :userId');
    params.userId = user.id;
  } else if (user.roleCode === 'BUILDER') {
    const profile = await builderService.getRawProfileByUserId(user.id);
    if (!profile) return { items: [], meta: { page, limit, total: 0, totalPages: 1 } };
    where.push('p.builder_id = :builderId');
    params.builderId = profile.id;
  } else if (!['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode)) {
    throw new ApiError(403, 'Forbidden');
  }

  if (filters.status) {
    where.push('b.status = :status');
    params.status = filters.status;
  }
  if (filters.source === 'contact') {
    where.push(`b.notes LIKE 'Contact request%'`);
  } else if (filters.source === 'booking') {
    where.push(`(b.notes IS NULL OR b.notes NOT LIKE 'Contact request%')`);
  }
  if (filters.cityId) {
    where.push('ci.uuid = :cityId');
    params.cityId = filters.cityId;
  }
  if (filters.q) {
    where.push('(p.name LIKE :q OR buyer.first_name LIKE :q OR buyer.email LIKE :q OR b.notes LIKE :q)');
    params.q = `%${filters.q}%`;
  }
  if (filters.projectId) {
    where.push('p.uuid = :projectId');
    params.projectId = filters.projectId;
  }
  if (filters.dateFrom) {
    where.push('b.created_at >= :dateFrom');
    params.dateFrom = `${filters.dateFrom} 00:00:00`;
  }
  if (filters.dateTo) {
    where.push('b.created_at <= :dateTo');
    params.dateTo = `${filters.dateTo} 23:59:59`;
  }

  const fromSql = `FROM booking_requests b
     INNER JOIN projects p ON p.id = b.project_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN project_units u ON u.id = b.unit_id
     INNER JOIN users buyer ON buyer.id = b.buyer_user_id`;

  const [countRows] = await query(
    `SELECT COUNT(*) AS total ${fromSql}
     WHERE ${where.join(' AND ')}`,
    params
  );
  const [rows] = await query(
    `SELECT b.uuid, b.amount, b.status, b.notes, b.created_at AS createdAt,
            p.uuid AS projectId, p.name AS projectName, p.slug AS projectSlug,
            ci.uuid AS cityId, ci.name AS cityName,
            u.uuid AS unitId, u.unit_number AS unitNumber,
            buyer.email AS buyerEmail, buyer.first_name AS buyerFirstName
     ${fromSql}
     WHERE ${where.join(' AND ')}
     ORDER BY b.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map((r) => ({
      id: r.uuid,
      amount: r.amount != null ? Number(r.amount) : null,
      status: r.status,
      notes: r.notes,
      source: r.notes && /^Contact request/i.test(String(r.notes)) ? 'contact' : 'booking',
      createdAt: r.createdAt,
      project: { id: r.projectId, name: r.projectName, slug: r.projectSlug },
      city: r.cityId ? { id: r.cityId, name: r.cityName } : null,
      unit: r.unitId ? { id: r.unitId, unitNumber: r.unitNumber } : null,
      buyer: { email: r.buyerEmail, name: r.buyerFirstName },
    })),
    meta: {
      page,
      limit,
      total: Number(countRows[0].total),
      totalPages: Math.ceil(Number(countRows[0].total) / limit) || 1,
    },
  };
}

export async function updateBooking(uuid, payload, user, req) {
  const [rows] = await query(
    `SELECT b.*, p.builder_id, p.uuid AS projectUuid, bp.user_id AS builderUserId
     FROM booking_requests b
     INNER JOIN projects p ON p.id = b.project_id
     INNER JOIN builder_profiles bp ON bp.id = p.builder_id
     WHERE b.uuid = :uuid AND b.deleted_at IS NULL LIMIT 1`,
    { uuid }
  );
  if (!rows.length) throw new ApiError(404, 'Booking not found');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.roleCode);
  if (rows[0].builderUserId !== user.id && !isAdmin) {
    throw new ApiError(403, 'Forbidden');
  }
  if (!['requested', 'confirmed', 'cancelled', 'completed'].includes(payload.status)) {
    throw new ApiError(400, 'Invalid status');
  }

  await query(
    `UPDATE booking_requests SET status = :status, handler_notes = COALESCE(:notes, handler_notes)
     WHERE id = :id`,
    { status: payload.status, notes: payload.handlerNotes || null, id: rows[0].id }
  );

  if (payload.status === 'confirmed' && rows[0].unit_id) {
    await query(`UPDATE project_units SET status = 'held' WHERE id = :id AND status = 'available'`, {
      id: rows[0].unit_id,
    });
  }
  if (payload.status === 'completed' && rows[0].unit_id) {
    await query(`UPDATE project_units SET status = 'sold' WHERE id = :id`, { id: rows[0].unit_id });
  }
  if (payload.status === 'cancelled' && rows[0].unit_id) {
    await query(`UPDATE project_units SET status = 'available' WHERE id = :id AND status IN ('held')`, {
      id: rows[0].unit_id,
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'bookings.update',
    entityType: 'booking_request',
    entityId: uuid,
    newValues: payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return getBooking(uuid, user);
}

export async function toggleProjectWishlist(userId, projectUuid) {
  const [projects] = await query(
    `SELECT id, status, published_at AS publishedAt
     FROM projects
     WHERE uuid = :uuid AND deleted_at IS NULL
     LIMIT 1`,
    { uuid: projectUuid }
  );
  if (!projects.length || !isProjectPubliclyVisible(projects[0])) {
    throw new ApiError(404, 'Project not found');
  }

  const projectId = projects[0].id;
  const [existing] = await query(
    `SELECT id FROM project_wishlists WHERE user_id = :userId AND project_id = :projectId LIMIT 1`,
    { userId, projectId }
  );

  if (existing.length) {
    await query(`DELETE FROM project_wishlists WHERE id = :id`, { id: existing[0].id });
    return { saved: false };
  }

  await query(
    `INSERT INTO project_wishlists (user_id, project_id) VALUES (:userId, :projectId)`,
    { userId, projectId }
  );
  return { saved: true };
}

export async function listProjectWishlist(userId) {
  const [rows] = await query(
    `SELECT p.uuid
     FROM project_wishlists w
     INNER JOIN projects p ON p.id = w.project_id
     WHERE w.user_id = :userId AND p.deleted_at IS NULL AND ${PUBLIC_PROJECT_SQL}
     ORDER BY w.created_at DESC`,
    { userId }
  );

  const items = [];
  for (const row of rows) {
    items.push(await getProjectByUuid(row.uuid, { includePrivate: false }));
  }
  return { items, meta: { total: items.length } };
}
