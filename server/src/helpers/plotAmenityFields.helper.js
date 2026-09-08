export const PLOT_AMENITY_FIELDS = [
  { key: 'roadWidth', label: 'Road width' },
  { key: 'plotDimensions', label: 'Plot dimensions' },
  { key: 'waterSupply', label: 'Water supply' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'sewage', label: 'Sewage / drainage' },
  { key: 'boundaryWall', label: 'Boundary wall' },
  { key: 'gatedCommunity', label: 'Gated community' },
  { key: 'cornerPlot', label: 'Corner plot' },
  { key: 'openSides', label: 'Open sides' },
  { key: 'approvalAuthority', label: 'Approval authority' },
];

export function parsePlotAmenities(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function isPlotListing(typeCode, categoryCode) {
  return typeCode === 'plot' || categoryCode === 'land';
}
