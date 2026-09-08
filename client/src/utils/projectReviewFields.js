import { formatPriceRange } from '../components/projects/projectUtils';
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
  project: 'Project details',
  building: 'Buildings',
  tower: 'Towers',
  unit: 'Units',
  amenity: 'Amenities',
  gallery: 'Gallery',
  document: 'Documents',
};

export const REVIEW_GROUP_ORDER = [
  'project',
  'building',
  'tower',
  'unit',
  'amenity',
  'gallery',
  'document',
];

function matchEntityId(left, right) {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

export function findProjectAmenity(project, entityUuid) {
  const fromSelected = (project?.amenities || []).find((row) => matchEntityId(row.id, entityUuid));
  const fromAll = (project?.allAmenities || []).find((row) => matchEntityId(row.id, entityUuid));
  if (!fromSelected && !fromAll) return null;
  return {
    ...(fromAll || {}),
    ...(fromSelected || {}),
    projectImageUrl: fromSelected?.projectImageUrl || fromAll?.projectImageUrl || null,
    imageUrl: fromSelected?.projectImageUrl || fromAll?.projectImageUrl
      || fromSelected?.imageUrl || fromAll?.imageUrl || null,
    isSelected: Boolean(fromSelected) || Boolean(fromAll?.isSelected),
  };
}

export function isProjectAmenitySelected(project, entityUuid) {
  if ((project?.amenities || []).some((row) => matchEntityId(row.id, entityUuid))) return true;
  const row = (project?.allAmenities || []).find((r) => matchEntityId(r.id, entityUuid));
  if (row && typeof row.isSelected === 'boolean') return row.isSelected;
  return false;
}

export function isAmenityReviewSkipped(project, item) {
  if (item?.sectionKey !== 'amenity' || !item.entityUuid) return false;
  return !isProjectAmenitySelected(project, item.entityUuid);
}

export function findGalleryImage(project, entityUuid) {
  return project?.media?.find(
    (row) => matchEntityId(row.id, entityUuid) && row.mediaType === 'image'
  ) || null;
}

export function isGalleryReviewSkipped(project, item) {
  if (item?.sectionKey !== 'gallery') return false;
  if (item.fieldKey === 'empty') {
    const count = project?.media?.filter((row) => row.mediaType === 'image').length ?? 0;
    return count === 0;
  }
  if (!item.entityUuid && (item.fieldKey === 'images' || item.fieldKey === 'captions')) {
    const count = project?.media?.filter((row) => row.mediaType === 'image').length ?? 0;
    return count === 0;
  }
  return false;
}

export function isDocumentReviewSkipped(project, item) {
  if (item?.sectionKey !== 'document') return false;
  if (item.fieldKey === 'files' || !item.entityUuid) {
    const count = project?.media?.filter((row) => row.mediaType === 'document').length ?? 0;
    return count === 0;
  }
  return false;
}

export function isReviewAutoSkipped(project, item) {
  return isAmenityReviewSkipped(project, item)
    || isGalleryReviewSkipped(project, item)
    || isDocumentReviewSkipped(project, item);
}

/** Missing / not provided by builder — auto rating 0 */
export function isReviewFieldMissing(project, item) {
  if (!project || !item) return true;
  if (isReviewAutoSkipped(project, item)) return true;

  if (getReviewFieldValue(project, item) === EMPTY_REVIEW_VALUE) return true;

  if (item.sectionKey === 'amenity' && item.entityUuid && isProjectAmenitySelected(project, item.entityUuid)) {
    if (['selection', 'image', 'selected'].includes(item.fieldKey)) {
      const amenity = findProjectAmenity(project, item.entityUuid);
      if (!amenity?.projectImageUrl) return true;
    }
  }

  if (item.sectionKey === 'gallery' && item.entityUuid) {
    const image = findGalleryImage(project, item.entityUuid);
    if (!image) return true;
    if (['item', 'caption'].includes(item.fieldKey) && !image.caption?.trim()) return true;
  }

  return false;
}

export function findReviewItem(review, sectionKey, fieldKey, entityUuid = null) {
  if (!review?.items?.length) return null;
  return review.items.find((item) => {
    if (item.sectionKey !== sectionKey || item.fieldKey !== fieldKey) return false;
    if (entityUuid == null) return !item.entityUuid;
    return matchEntityId(item.entityUuid, entityUuid);
  }) || null;
}

export function getFieldReviewRating(project, review, sectionKey, fieldKey, entityUuid = null) {
  const item = findReviewItem(review, sectionKey, fieldKey, entityUuid);
  if (!item) return null;
  return {
    rating: getReviewItemRating(project, item),
    status: item.status,
    title: item.title,
  };
}

export function getReviewItemRating(project, item) {
  if (!item) return 8;
  if (item.status === 'rejected') return 0;
  if (isReviewFieldMissing(project, item)) return 0;
  return item.rating ?? 8;
}

export function getReviewFieldValue(project, item) {
  if (!project || !item) return EMPTY_REVIEW_VALUE;

  const { sectionKey, fieldKey, entityUuid } = item;

  if (sectionKey === 'project') {
    const values = {
      name: project.name,
      description: project.description,
      category: project.category?.name,
      reraId: project.reraId,
      minPrice: project.minPrice != null ? `₹${Number(project.minPrice).toLocaleString('en-IN')}` : null,
      maxPrice: project.maxPrice != null ? `₹${Number(project.maxPrice).toLocaleString('en-IN')}` : null,
      launchDate: project.launchDate,
      possessionDate: project.possessionDate,
      addressLine: project.addressLine,
      country: project.country?.name,
      state: project.state?.name,
      city: project.city?.name,
      locality: project.locality?.name,
    };
    return formatReviewValue(values[fieldKey]);
  }

  if (sectionKey === 'building') {
    const building = project.buildings?.find((row) => matchEntityId(row.id, entityUuid));
    if (!building) return EMPTY_REVIEW_VALUE;
    if (fieldKey === 'name') return formatReviewValue(building.name);
    if (fieldKey === 'isActive') {
      return building.isActive === false ? EMPTY_REVIEW_VALUE : '1';
    }
  }

  if (sectionKey === 'tower') {
    const tower = project.towers?.find((row) => matchEntityId(row.id, entityUuid))
      || project.unassignedTowers?.find((row) => matchEntityId(row.id, entityUuid));
    if (!tower) return EMPTY_REVIEW_VALUE;
    if (fieldKey === 'name') return formatReviewValue(tower.name);
    if (fieldKey === 'building') return formatReviewValue(tower.building?.name);
    if (fieldKey === 'totalFloors') return formatReviewValue(tower.totalFloors, { numeric: true });
    if (fieldKey === 'totalUnits') return formatReviewValue(tower.totalUnits, { numeric: true });
    if (fieldKey === 'isActive') {
      return tower.isActive === false ? EMPTY_REVIEW_VALUE : '1';
    }
  }

  if (sectionKey === 'unit') {
    const unit = project.units?.find((row) => matchEntityId(row.id, entityUuid));
    if (!unit) return EMPTY_REVIEW_VALUE;
    const values = {
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      floorNumber: unit.floorNumber,
      area: unit.area != null ? `${unit.area} sq.ft` : null,
      carpetArea: unit.carpetArea != null ? `${unit.carpetArea} sq.ft` : null,
      price: unit.price != null ? `₹${Number(unit.price).toLocaleString('en-IN')}` : null,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      balconies: unit.balconies,
      parking: unit.parking,
      furnishing: unit.furnishing?.name,
      facing: unit.facing?.name,
      isReadyToMove: unit.isReadyToMove ? '1' : EMPTY_REVIEW_VALUE,
      deliveryDate: unit.deliveryDate,
    };
    if (['bedrooms', 'bathrooms', 'balconies', 'parking', 'floorNumber'].includes(fieldKey)) {
      return formatReviewValue(values[fieldKey], { numeric: true });
    }
    return formatReviewValue(values[fieldKey]);
  }

  if (sectionKey === 'amenity') {
    const amenity = findProjectAmenity(project, entityUuid);
    const selected = isProjectAmenitySelected(project, entityUuid);
    if (fieldKey === 'selection') {
      if (!selected) return EMPTY_REVIEW_VALUE;
      const hasPhoto = Boolean(amenity?.projectImageUrl);
      return hasPhoto ? 'Selected with photo' : 'Selected without photo';
    }
    if (fieldKey === 'selected') {
      return amenity ? '1' : EMPTY_REVIEW_VALUE;
    }
    if (fieldKey === 'image') {
      const hasPhoto = Boolean(amenity?.projectImageUrl);
      return hasPhoto ? '1' : EMPTY_REVIEW_VALUE;
    }
    if (fieldKey === 'selection') {
      return formatReviewValue(project.amenities?.length ?? 0, { numeric: true });
    }
    if (fieldKey === 'photos') {
      const withPhoto = (project.amenities || []).filter((row) => row.projectImageUrl).length;
      return formatReviewValue(withPhoto, { numeric: true });
    }
    if (fieldKey === 'name') {
      return amenity ? formatReviewValue(amenity.name) : EMPTY_REVIEW_VALUE;
    }
  }

  if (sectionKey === 'gallery') {
    if (fieldKey === 'empty') {
      const count = project.media?.filter((row) => row.mediaType === 'image').length ?? 0;
      return formatReviewValue(count, { numeric: true });
    }
    if (fieldKey === 'images') {
      const count = project.media?.filter((row) => row.mediaType === 'image').length ?? 0;
      return formatReviewValue(count, { numeric: true });
    }
    if (fieldKey === 'captions') {
      const withCaption = project.media?.filter(
        (row) => row.mediaType === 'image' && row.caption?.trim()
      ).length ?? 0;
      return formatReviewValue(withCaption, { numeric: true });
    }
    const image = findGalleryImage(project, entityUuid);
    if (!image) return EMPTY_REVIEW_VALUE;
    if (fieldKey === 'item') return formatReviewValue(image.fileName || image.url);
    if (fieldKey === 'image') return formatReviewValue(image.fileName || image.url);
    if (fieldKey === 'caption') return formatReviewValue(image.caption);
  }

  if (sectionKey === 'document') {
    if (fieldKey === 'files') {
      const count = project.media?.filter((row) => row.mediaType === 'document').length ?? 0;
      return formatReviewValue(count, { numeric: true });
    }
    const doc = project.media?.find(
      (row) => matchEntityId(row.id, entityUuid) && row.mediaType === 'document'
    );
    if (!doc) return EMPTY_REVIEW_VALUE;
    if (fieldKey === 'file') return formatReviewValue(doc.fileName);
  }

  return EMPTY_REVIEW_VALUE;
}

export function isReviewFieldUnfilled(project, item) {
  return isReviewFieldMissing(project, item);
}

export function getReviewDisplayValue(project, item) {
  if (!project || !item) return EMPTY_REVIEW_VALUE;

  if (item.sectionKey === 'amenity' && item.entityUuid) {
    const selected = isProjectAmenitySelected(project, item.entityUuid);
    if (!selected) return 'Not selected by builder';

    if (item.fieldKey === 'selection') {
      const amenity = findProjectAmenity(project, item.entityUuid);
      const hasPhoto = Boolean(amenity?.projectImageUrl);
      return hasPhoto ? 'Selected · Builder photo uploaded' : 'Selected · No builder photo';
    }
    if (item.fieldKey === 'selected') return 'Selected';
    if (item.fieldKey === 'image') {
      const amenity = findProjectAmenity(project, item.entityUuid);
      const hasPhoto = Boolean(amenity?.projectImageUrl);
      return hasPhoto ? 'Builder photo uploaded' : 'No builder photo';
    }
  }

  if (item.sectionKey === 'gallery' && item.entityUuid) {
    const image = findGalleryImage(project, item.entityUuid);
    if (!image) return 'Image not found';
    if (item.fieldKey === 'item') {
      const caption = image.caption?.trim();
      return caption ? `Image uploaded · ${caption}` : 'Image uploaded · No caption';
    }
    if (item.fieldKey === 'image') return image.fileName || 'Image uploaded';
    if (item.fieldKey === 'caption') {
      return image.caption?.trim() ? image.caption.trim() : 'No caption';
    }
  }

  if (item.sectionKey === 'gallery' && item.fieldKey === 'empty') {
    return 'No gallery images uploaded';
  }

  return getReviewFieldValue(project, item);
}

export function summarizeReviewValue(project, item) {
  const value = getReviewFieldValue(project, item);
  if (value.length > 120) return `${value.slice(0, 117)}…`;
  return value;
}

export function formatReviewPriceRange(project) {
  return formatPriceRange(project?.minPrice, project?.maxPrice);
}

export function galleryPreviewUrl(project, entityUuid) {
  const image = findGalleryImage(project, entityUuid);
  return image?.url ? mediaUrl(image.url) : null;
}

export function amenityPreviewUrl(project, entityUuid) {
  return amenityProjectPhotoUrl(project, entityUuid);
}

export function amenityProjectPhotoUrl(project, entityUuid) {
  const amenity = findProjectAmenity(project, entityUuid);
  if (!amenity?.projectImageUrl) return null;
  return mediaUrl(amenity.projectImageUrl);
}

export function hasBuilderAmenityPhoto(project, entityUuid) {
  const amenity = findProjectAmenity(project, entityUuid);
  return Boolean(amenity?.projectImageUrl);
}
