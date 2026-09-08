import { query } from '../config/db.js';
import { isPlotListing, parsePlotAmenities, PLOT_AMENITY_FIELDS } from './plotAmenityFields.helper.js';

function push(items, sectionKey, fieldKey, title, entityUuid = null) {
  items.push({ sectionKey, fieldKey, entityUuid, title });
}

export async function buildReviewItemsForProperty(propertyId) {
  const items = [];

  const [[propertyMeta]] = await query(
    `SELECT p.plot_amenities, pt.code AS type_code, pc.code AS category_code
     FROM properties p
     INNER JOIN property_types pt ON pt.id = p.property_type_id
     INNER JOIN property_categories pc ON pc.id = p.category_id
     WHERE p.id = :propertyId
     LIMIT 1`,
    { propertyId }
  );
  const isPlot = isPlotListing(propertyMeta?.type_code, propertyMeta?.category_code);
  const plotAmenities = parsePlotAmenities(propertyMeta?.plot_amenities);

  push(items, 'property', 'title', 'Listing title');
  push(items, 'property', 'description', 'Description');
  push(items, 'property', 'category', 'Category');
  push(items, 'property', 'propertyType', 'Property type');
  push(items, 'property', 'purpose', 'Purpose');

  push(items, 'pricing', 'price', 'Price');
  push(items, 'pricing', 'priceNegotiable', 'Price negotiable');

  push(items, 'size', 'area', 'Area');
  if (!isPlot) {
    push(items, 'size', 'carpetArea', 'Carpet area');
    push(items, 'size', 'bedrooms', 'Bedrooms');
    push(items, 'size', 'bathrooms', 'Bathrooms');
    push(items, 'size', 'balconies', 'Balconies');
    push(items, 'size', 'parking', 'Parking');
    push(items, 'size', 'floorNumber', 'Floor number');
    push(items, 'size', 'totalFloors', 'Total floors');
    push(items, 'size', 'ageYears', 'Property age');
  }

  push(items, 'features', 'facing', 'Facing');
  push(items, 'features', 'ownership', 'Ownership');
  if (!isPlot) {
    push(items, 'features', 'furnishing', 'Furnishing');
    push(items, 'features', 'constructionStatus', 'Construction status');
  }

  push(items, 'location', 'addressLine', 'Street address');
  push(items, 'location', 'landmark', 'Landmark');
  push(items, 'location', 'pincode', 'Pincode');
  push(items, 'location', 'country', 'Country');
  push(items, 'location', 'state', 'State');
  push(items, 'location', 'city', 'City');
  push(items, 'location', 'locality', 'Locality');

  if (isPlot) {
    for (const field of PLOT_AMENITY_FIELDS) {
      const value = String(plotAmenities[field.key] || '').trim();
      if (!value) continue;
      push(items, 'amenity', 'plotAmenity', `Plot amenity — ${field.label}`, field.key);
    }
  } else {
    const [allAmenities] = await query(
      `SELECT a.uuid, a.name, pa.amenity_id AS selectedId
       FROM amenities a
       LEFT JOIN property_amenities pa ON pa.amenity_id = a.id AND pa.property_id = :propertyId
       WHERE a.deleted_at IS NULL AND a.is_active = 1
       ORDER BY a.sort_order, a.name`,
      { propertyId }
    );
    for (const amenity of allAmenities) {
      push(items, 'amenity', 'selection', `Amenity — ${amenity.name}`, amenity.uuid);
    }
  }

  const [images] = await query(
    `SELECT uuid, file_name AS fileName, title
     FROM property_media
     WHERE property_id = :propertyId AND deleted_at IS NULL AND media_type = 'image'
     ORDER BY is_primary DESC, sort_order, id`,
    { propertyId }
  );
  images.forEach((image, index) => {
    const label = image.title?.trim() || image.fileName || `Image ${index + 1}`;
    push(items, 'gallery', 'item', `Gallery — ${label}`, image.uuid);
  });

  if (images.length === 0) {
    push(items, 'gallery', 'empty', 'Gallery — No images uploaded');
  }

  push(items, 'seo', 'metaTitle', 'SEO title');
  push(items, 'seo', 'metaDescription', 'SEO description');

  return items;
}
