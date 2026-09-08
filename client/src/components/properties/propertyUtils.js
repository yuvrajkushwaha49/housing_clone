export const PROPERTY_STATUS_BADGE = {
  draft: 'text-bg-secondary',
  pending: 'text-bg-warning',
  approved: 'text-bg-success',
  rejected: 'text-bg-danger',
  sold: 'text-bg-info',
  rented: 'text-bg-primary',
  archived: 'text-bg-light border',
};

export const PROPERTY_STATUS_LABEL = {
  draft: 'Draft',
  pending: 'Pending approval',
  approved: 'Live',
  rejected: 'Rejected',
  sold: 'Sold',
  rented: 'Rented',
  archived: 'Archived',
};

export const PROPERTY_PURPOSE_LABEL = {
  sale: 'For sale',
  rent: 'For rent',
  lease: 'For lease',
  pg: 'PG',
};

export function formatPropertyStatus(status) {
  return PROPERTY_STATUS_LABEL[status] || status;
}

export function formatPropertyPurpose(purpose) {
  return PROPERTY_PURPOSE_LABEL[purpose] || purpose;
}

export function formatPropertyPrice(price) {
  if (price == null) return '—';
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

export function isPlotProperty(property) {
  if (!property) return false;
  return property.propertyType?.code === 'plot' || property.category?.code === 'land';
}

export function isPlotCategory(category) {
  return category?.code === 'land';
}

export function isPlotType(propertyType) {
  return propertyType?.code === 'plot';
}

export const PLOT_AMENITY_FIELDS = [
  { key: 'roadWidth', label: 'Road width', placeholder: 'e.g. 30 ft', icon: 'bi-signpost-split' },
  { key: 'plotDimensions', label: 'Plot dimensions', placeholder: 'e.g. 40 x 60 ft', icon: 'bi-bounding-box' },
  { key: 'waterSupply', label: 'Water supply', placeholder: 'Municipal, borewell, etc.', icon: 'bi-droplet' },
  { key: 'electricity', label: 'Electricity', placeholder: 'Available / Not available', icon: 'bi-lightning' },
  { key: 'sewage', label: 'Sewage / drainage', placeholder: 'Connected / Not connected', icon: 'bi-moisture' },
  { key: 'boundaryWall', label: 'Boundary wall', placeholder: 'Yes / Partial / No', icon: 'bi-bricks' },
  { key: 'gatedCommunity', label: 'Gated community', placeholder: 'Yes / No', icon: 'bi-shield-lock' },
  { key: 'cornerPlot', label: 'Corner plot', placeholder: 'Yes / No', icon: 'bi-intersect' },
  { key: 'openSides', label: 'Open sides', placeholder: 'e.g. 2', icon: 'bi-box' },
  { key: 'approvalAuthority', label: 'Approval authority', placeholder: 'DTCP, HMDA, RERA, etc.', icon: 'bi-patch-check' },
];

export const EMPTY_PLOT_AMENITIES = Object.fromEntries(
  PLOT_AMENITY_FIELDS.map((field) => [field.key, ''])
);

export function formatPlotAmenityLabel(key) {
  return PLOT_AMENITY_FIELDS.find((field) => field.key === key)?.label || key;
}

export function formatReviewAverageRating(rating) {
  if (rating == null) return null;
  return Number(rating).toFixed(1);
}

export function reviewRatingTone(rating) {
  if (rating == null) return 'is-muted';
  const value = Number(rating);
  if (value >= 8) return 'is-success';
  if (value >= 5) return 'is-warning';
  return 'is-danger';
}
