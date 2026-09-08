import { formatPropertyPrice, isPlotProperty } from '../components/properties/propertyUtils';
import { mediaUrl } from '../services';

export const EMPTY_REVIEW_VALUE = '0';

export function isReviewValueEmpty(value) {
  return value === null || value === undefined || value === '';
}

export function formatReviewValue(value, { numeric = false } = {}) {
  if (isReviewValueEmpty(value)) return EMPTY_REVIEW_VALUE;
  if (numeric && Number(value) === 0) return EMPTY_REVIEW_VALUE;
  if (typeof value === 'boolean') return value ? '1' : EMPTY_REVIEW_VALUE;
  return String(value);
}

export const REVIEW_GROUP_LABELS = {
  property: 'Basic details',
  pricing: 'Pricing',
  size: 'Size & layout',
  features: 'Features',
  location: 'Location',
  amenity: 'Amenities',
  plotAmenity: 'Plot amenities',
  gallery: 'Photos',
  seo: 'SEO',
};

export const REVIEW_GROUP_ORDER = [
  'property',
  'pricing',
  'size',
  'features',
  'location',
  'amenity',
  'gallery',
  'seo',
];

function matchEntityId(left, right) {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

export function isPlotAmenityReviewItem(item) {
  return item?.sectionKey === 'amenity' && item?.fieldKey === 'plotAmenity' && Boolean(item?.entityUuid);
}

export function getPlotAmenityValue(property, entityUuid) {
  return property?.plotAmenities?.[entityUuid] || '';
}

export function isPlotAmenityFilled(property, entityUuid) {
  return Boolean(String(getPlotAmenityValue(property, entityUuid)).trim());
}

const PLOT_EXCLUDED_SIZE_FIELDS = new Set([
  'carpetArea',
  'bedrooms',
  'bathrooms',
  'balconies',
  'parking',
  'floorNumber',
  'totalFloors',
  'ageYears',
]);

const PLOT_EXCLUDED_FEATURE_FIELDS = new Set(['furnishing', 'constructionStatus']);

export function isPlotReviewItemExcluded(property, item) {
  if (!isPlotProperty(property) || !item) return false;
  if (item.sectionKey === 'size' && PLOT_EXCLUDED_SIZE_FIELDS.has(item.fieldKey)) return true;
  if (item.sectionKey === 'features' && PLOT_EXCLUDED_FEATURE_FIELDS.has(item.fieldKey)) return true;
  if (isPlotAmenityReviewItem(item) && !isPlotAmenityFilled(property, item.entityUuid)) return true;
  return false;
}

export function getReviewableItems(property, items = []) {
  if (!isPlotProperty(property)) return items;
  return items.filter((item) => !isPlotReviewItemExcluded(property, item));
}

export function findPropertyAmenity(property, entityUuid) {
  const fromSelected = (property?.amenities || []).find((row) => matchEntityId(row.id, entityUuid));
  const fromAll = (property?.allAmenities || []).find((row) => matchEntityId(row.id, entityUuid));
  if (!fromSelected && !fromAll) return null;
  return {
    ...(fromAll || {}),
    ...(fromSelected || {}),
    isSelected: Boolean(fromSelected) || Boolean(fromAll?.isSelected),
  };
}

export function isPropertyAmenitySelected(property, entityUuid) {
  if ((property?.amenities || []).some((row) => matchEntityId(row.id, entityUuid))) return true;
  const row = (property?.allAmenities || []).find((r) => matchEntityId(r.id, entityUuid));
  if (row && typeof row.isSelected === 'boolean') return row.isSelected;
  return false;
}

export function isAmenityReviewSkipped(property, item) {
  if (isPlotAmenityReviewItem(item)) {
    return !isPlotAmenityFilled(property, item.entityUuid);
  }
  if (item?.sectionKey !== 'amenity' || !item.entityUuid) return false;
  return !isPropertyAmenitySelected(property, item.entityUuid);
}

export function findGalleryImage(property, entityUuid) {
  return property?.media?.find(
    (row) => matchEntityId(row.id, entityUuid) && row.mediaType === 'image'
  ) || null;
}

export function isGalleryReviewSkipped(property, item) {
  if (item?.sectionKey !== 'gallery') return false;
  if (item.fieldKey === 'empty') {
    const count = property?.media?.filter((row) => row.mediaType === 'image').length ?? 0;
    return count === 0;
  }
  return false;
}

export function isReviewAutoSkipped(property, item) {
  return isAmenityReviewSkipped(property, item) || isGalleryReviewSkipped(property, item);
}

export function isReviewFieldMissing(property, item) {
  if (!property || !item) return true;
  if (isReviewAutoSkipped(property, item)) return true;
  return getReviewFieldValue(property, item) === EMPTY_REVIEW_VALUE;
}

export function findReviewItem(review, sectionKey, fieldKey, entityUuid = null) {
  if (!review?.items?.length) return null;
  return review.items.find((item) => {
    if (item.sectionKey !== sectionKey || item.fieldKey !== fieldKey) return false;
    if (entityUuid == null) return !item.entityUuid;
    return matchEntityId(item.entityUuid, entityUuid);
  }) || null;
}

export function getFieldReviewRating(property, review, sectionKey, fieldKey, entityUuid = null) {
  const item = findReviewItem(review, sectionKey, fieldKey, entityUuid);
  if (!item) return null;
  return {
    rating: getReviewItemRating(property, item),
    status: item.status,
    title: item.title,
  };
}

export function getReviewItemRating(property, item) {
  if (!item) return 8;
  if (item.status === 'rejected') return 0;
  if (isReviewFieldMissing(property, item)) return 0;
  return item.rating ?? 8;
}

export function getReviewFieldValue(property, item) {
  if (!property || !item) return EMPTY_REVIEW_VALUE;

  const { sectionKey, fieldKey } = item;

  if (sectionKey === 'property') {
    const values = {
      title: property.title,
      description: property.description,
      category: property.category?.name,
      propertyType: property.propertyType?.name,
      purpose: property.purpose,
    };
    return formatReviewValue(values[fieldKey]);
  }

  if (sectionKey === 'pricing') {
    if (fieldKey === 'price') return formatReviewValue(formatPropertyPrice(property.price));
    if (fieldKey === 'priceNegotiable') {
      return property.priceNegotiable ? '1' : EMPTY_REVIEW_VALUE;
    }
  }

  if (sectionKey === 'size') {
    const values = {
      area: property.area != null ? `${property.area} ${property.areaUnit?.name || ''}`.trim() : null,
      carpetArea: property.carpetArea != null ? `${property.carpetArea} sq.ft` : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      balconies: property.balconies,
      parking: property.parking,
      floorNumber: property.floorNumber,
      totalFloors: property.totalFloors,
      ageYears: property.ageYears,
    };
    if (['bedrooms', 'bathrooms', 'balconies', 'parking', 'floorNumber', 'totalFloors', 'ageYears'].includes(fieldKey)) {
      return formatReviewValue(values[fieldKey], { numeric: true });
    }
    return formatReviewValue(values[fieldKey]);
  }

  if (sectionKey === 'features') {
    const values = {
      facing: property.facing?.name,
      furnishing: property.furnishing?.name,
      ownership: property.ownership?.name,
      constructionStatus: property.constructionStatus?.name,
    };
    return formatReviewValue(values[fieldKey]);
  }

  if (sectionKey === 'location') {
    const values = {
      addressLine: property.addressLine,
      landmark: property.landmark,
      pincode: property.pincode,
      country: property.country?.name,
      state: property.state?.name,
      city: property.city?.name,
      locality: property.locality?.name,
    };
    return formatReviewValue(values[fieldKey]);
  }

  if (sectionKey === 'amenity') {
    if (fieldKey === 'plotAmenity' && item.entityUuid) {
      return formatReviewValue(getPlotAmenityValue(property, item.entityUuid));
    }
    const selected = isPropertyAmenitySelected(property, item.entityUuid);
    if (fieldKey === 'selection') return selected ? 'Selected' : EMPTY_REVIEW_VALUE;
  }

  if (sectionKey === 'gallery') {
    if (fieldKey === 'empty') {
      const count = property.media?.filter((row) => row.mediaType === 'image').length ?? 0;
      return formatReviewValue(count, { numeric: true });
    }
    const image = findGalleryImage(property, item.entityUuid);
    if (!image) return EMPTY_REVIEW_VALUE;
    if (fieldKey === 'item') return formatReviewValue(image.fileName || image.title || image.url);
  }

  if (sectionKey === 'seo') {
    const values = {
      metaTitle: property.metaTitle,
      metaDescription: property.metaDescription,
    };
    return formatReviewValue(values[fieldKey]);
  }

  return EMPTY_REVIEW_VALUE;
}

export function isReviewFieldUnfilled(property, item) {
  return isReviewFieldMissing(property, item);
}

export function getReviewDisplayValue(property, item) {
  if (!property || !item) return EMPTY_REVIEW_VALUE;

  if (item.sectionKey === 'amenity' && isPlotAmenityReviewItem(item)) {
    const value = getPlotAmenityValue(property, item.entityUuid);
    if (!String(value).trim()) return 'Not provided by lister';
    return value;
  }

  if (item.sectionKey === 'amenity' && item.entityUuid) {
    const selected = isPropertyAmenitySelected(property, item.entityUuid);
    if (!selected) return 'Not selected by lister';
    if (item.fieldKey === 'selection') return 'Selected';
  }

  if (item.sectionKey === 'gallery' && item.entityUuid) {
    const image = findGalleryImage(property, item.entityUuid);
    if (!image) return 'Image not found';
    if (item.fieldKey === 'item') {
      const title = image.title?.trim();
      return title ? `Image uploaded · ${title}` : 'Image uploaded';
    }
  }

  if (item.sectionKey === 'gallery' && item.fieldKey === 'empty') {
    return 'No photos uploaded';
  }

  if (item.sectionKey === 'property' && item.fieldKey === 'purpose') {
    const purpose = property.purpose;
    if (!purpose) return EMPTY_REVIEW_VALUE;
    return purpose.charAt(0).toUpperCase() + purpose.slice(1);
  }

  return getReviewFieldValue(property, item);
}

export function galleryPreviewUrl(property, entityUuid) {
  const image = findGalleryImage(property, entityUuid);
  return image?.url ? mediaUrl(image.url) : null;
}

export function getReviewFieldIssues(property, review, { lowThreshold = 6 } = {}) {
  if (!property || !review?.items?.length) {
    return { rejected: [], lowRated: [], all: [] };
  }

  const issues = review.items
    .map((item) => ({
      ...item,
      rating: getReviewItemRating(property, item),
      displayValue: getReviewDisplayValue(property, item),
    }))
    .filter((item) => {
      if (item.status === 'rejected') return true;
      if (item.rating > 0 && item.rating < lowThreshold) return true;
      return false;
    })
    .sort((a, b) => a.rating - b.rating);

  return {
    rejected: issues.filter((i) => i.status === 'rejected'),
    lowRated: issues.filter((i) => i.status !== 'rejected' && i.rating > 0 && i.rating < lowThreshold),
    all: issues,
  };
}
