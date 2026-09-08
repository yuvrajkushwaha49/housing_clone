import { query } from '../config/db.js';

function push(items, sectionKey, fieldKey, title, entityUuid = null) {
  items.push({ sectionKey, fieldKey, entityUuid, title });
}

export async function buildReviewItemsForProject(projectId) {
  const items = [];

  push(items, 'project', 'name', 'Project name');
  push(items, 'project', 'description', 'Description');
  push(items, 'project', 'category', 'Category');
  push(items, 'project', 'reraId', 'RERA ID');
  push(items, 'project', 'minPrice', 'Minimum price');
  push(items, 'project', 'maxPrice', 'Maximum price');
  push(items, 'project', 'launchDate', 'Launch date');
  push(items, 'project', 'possessionDate', 'Possession date');
  push(items, 'project', 'addressLine', 'Street address');
  push(items, 'project', 'country', 'Country');
  push(items, 'project', 'state', 'State');
  push(items, 'project', 'city', 'City');
  push(items, 'project', 'locality', 'Locality');

  const [buildings] = await query(
    `SELECT uuid, name, is_active AS isActive
     FROM project_buildings
     WHERE project_id = :projectId AND deleted_at IS NULL
     ORDER BY sort_order, id`,
    { projectId }
  );
  for (const building of buildings) {
    const label = building.name || 'Building';
    push(items, 'building', 'name', `${label} — Name`, building.uuid);
    push(items, 'building', 'isActive', `${label} — Active status`, building.uuid);
  }

  const [towers] = await query(
    `SELECT t.uuid, t.name, t.total_floors AS totalFloors, t.total_units AS totalUnits,
            t.is_active AS isActive, b.name AS buildingName
     FROM project_towers t
     LEFT JOIN project_buildings b ON b.id = t.building_id AND b.deleted_at IS NULL
     WHERE t.project_id = :projectId AND t.deleted_at IS NULL
     ORDER BY t.sort_order, t.id`,
    { projectId }
  );
  for (const tower of towers) {
    const label = tower.name || 'Tower';
    push(items, 'tower', 'name', `${label} — Tower name`, tower.uuid);
    push(items, 'tower', 'building', `${label} — Building link`, tower.uuid);
    push(items, 'tower', 'totalFloors', `${label} — Total floors`, tower.uuid);
    push(items, 'tower', 'totalUnits', `${label} — Total units`, tower.uuid);
    push(items, 'tower', 'isActive', `${label} — Active status`, tower.uuid);
  }

  const [units] = await query(
    `SELECT u.uuid, u.unit_number AS unitNumber, u.unit_type AS unitType,
            u.bedrooms, u.bathrooms, u.balconies, u.parking, u.area, u.carpet_area AS carpetArea,
            u.price, u.floor_number AS floorNumber, u.is_ready_to_move AS isReadyToMove,
            u.delivery_date AS deliveryDate, t.name AS towerName,
            fu.name AS furnishingName, fa.name AS facingName
     FROM project_units u
     LEFT JOIN project_towers t ON t.id = u.tower_id
     LEFT JOIN furnishing_types fu ON fu.id = u.furnishing_id
     LEFT JOIN facing_types fa ON fa.id = u.facing_id
     WHERE u.project_id = :projectId AND u.deleted_at IS NULL
     ORDER BY u.unit_number`,
    { projectId }
  );
  const unitFields = [
    ['unitNumber', 'Unit number'],
    ['unitType', 'Unit type'],
    ['floorNumber', 'Floor'],
    ['area', 'Super area'],
    ['carpetArea', 'Carpet area'],
    ['price', 'Price'],
    ['bedrooms', 'Bedrooms'],
    ['bathrooms', 'Bathrooms'],
    ['balconies', 'Balconies'],
    ['parking', 'Parking'],
    ['furnishing', 'Furnishing'],
    ['facing', 'Facing'],
    ['isReadyToMove', 'Ready to move'],
    ['deliveryDate', 'Delivery date'],
  ];
  for (const unit of units) {
    const prefix = `Unit ${unit.unitNumber}${unit.towerName ? ` (${unit.towerName})` : ''}`;
    for (const [fieldKey, fieldLabel] of unitFields) {
      push(items, 'unit', fieldKey, `${prefix} — ${fieldLabel}`, unit.uuid);
    }
  }

  const [allAmenities] = await query(
    `SELECT a.uuid, a.name, pa.image_path AS projectImagePath
     FROM amenities a
     LEFT JOIN project_amenities pa ON pa.amenity_id = a.id AND pa.project_id = :projectId
     WHERE a.deleted_at IS NULL AND a.is_active = 1
     ORDER BY a.sort_order, a.name`,
    { projectId }
  );
  for (const amenity of allAmenities) {
    push(items, 'amenity', 'selection', `Amenity — ${amenity.name}`, amenity.uuid);
  }

  const [images] = await query(
    `SELECT uuid, file_name AS fileName, caption
     FROM project_media
     WHERE project_id = :projectId AND deleted_at IS NULL AND media_type = 'image'
     ORDER BY is_primary DESC, sort_order, id`,
    { projectId }
  );
  images.forEach((image, index) => {
    const label = image.caption?.trim() || image.fileName || `Image ${index + 1}`;
    push(items, 'gallery', 'item', `Gallery — ${label}`, image.uuid);
  });

  const [documents] = await query(
    `SELECT uuid, file_name AS fileName
     FROM project_media
     WHERE project_id = :projectId AND deleted_at IS NULL AND media_type = 'document'
     ORDER BY sort_order, id`,
    { projectId }
  );
  documents.forEach((doc, index) => {
    const label = doc.fileName || `Document ${index + 1}`;
    push(items, 'document', 'file', `Document — ${label}`, doc.uuid);
  });

  if (images.length === 0) {
    push(items, 'gallery', 'empty', 'Gallery — No images uploaded');
  }

  if (documents.length === 0) {
    push(items, 'document', 'files', 'Documents — Uploaded files');
  }

  return items;
}
