export const EMPTY_UNIT_ROW = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  unitNumber: '',
  unitType: '2BHK',
  bedrooms: '2',
  bathrooms: '2',
  balconies: '',
  parking: '',
  floorNumber: '',
  area: '',
  carpetArea: '',
  price: '',
  furnishingId: '',
  facingId: '',
  isReadyToMove: false,
  deliveryDate: '',
});

export const EMPTY_UNIT_FORM = {
  unitNumber: '',
  unitType: '2BHK',
  bedrooms: '2',
  bathrooms: '2',
  balconies: '',
  parking: '',
  price: '',
  area: '',
  carpetArea: '',
  floorNumber: '',
  towerId: '',
  furnishingId: '',
  facingId: '',
  isReadyToMove: false,
  deliveryDate: '',
};

export function mapUnitPayload(unit) {
  const toNumber = (value) => (value !== '' && value != null ? Number(value) : undefined);

  return {
    unitNumber: unit.unitNumber?.trim(),
    unitType: unit.unitType || undefined,
    bedrooms: toNumber(unit.bedrooms),
    bathrooms: toNumber(unit.bathrooms),
    balconies: toNumber(unit.balconies),
    parking: toNumber(unit.parking),
    floorNumber: toNumber(unit.floorNumber),
    area: toNumber(unit.area),
    carpetArea: toNumber(unit.carpetArea),
    price: toNumber(unit.price),
    furnishingId: toNumber(unit.furnishingId),
    facingId: toNumber(unit.facingId),
    isReadyToMove: Boolean(unit.isReadyToMove),
    deliveryDate: unit.deliveryDate || undefined,
  };
}

export function validateProjectPriceRange(minPrice, maxPrice) {
  const min = minPrice !== '' && minPrice != null ? Number(minPrice) : null;
  const max = maxPrice !== '' && maxPrice != null ? Number(maxPrice) : null;
  if (min == null || max == null) return null;
  if (Number.isNaN(min) || Number.isNaN(max)) return 'Invalid project price';
  if (max <= min) return 'Max price must be greater than min price';
  return null;
}

export function validateUnitPrice(price, minPrice, maxPrice) {
  if (price === '' || price == null) return null;

  const unitPrice = Number(price);
  if (Number.isNaN(unitPrice)) return 'Invalid unit price';

  const min = minPrice !== '' && minPrice != null ? Number(minPrice) : null;
  const max = maxPrice !== '' && maxPrice != null ? Number(maxPrice) : null;

  if (min == null || max == null) {
    return 'Set project minimum and maximum price before adding unit prices';
  }
  const rangeError = validateProjectPriceRange(min, max);
  if (rangeError) return rangeError;
  if (unitPrice < min || unitPrice > max) {
    return `Unit price must be between ₹${min.toLocaleString('en-IN')} and ₹${max.toLocaleString('en-IN')}`;
  }
  return null;
}

export function validateUnitsPriceRange(units, minPrice, maxPrice) {
  for (const unit of units) {
    if (!unit.unitNumber?.trim()) continue;
    if (unit.price === '' || unit.price == null) continue;
    const err = validateUnitPrice(unit.price, minPrice, maxPrice);
    if (err) {
      return `Unit ${unit.unitNumber.trim()}: ${err}`;
    }
  }
  return null;
}

export function formatUnitSummary(unit) {
  const parts = [];
  if (unit.bedrooms != null) parts.push(`${unit.bedrooms} bed`);
  if (unit.bathrooms != null) parts.push(`${unit.bathrooms} bath`);
  if (unit.balconies != null) parts.push(`${unit.balconies} balcony`);
  if (unit.furnishing?.name) parts.push(unit.furnishing.name);
  if (unit.isReadyToMove) parts.push('Ready to move');
  else if (unit.deliveryDate) parts.push(`Delivery: ${unit.deliveryDate}`);
  return parts.join(' · ') || '—';
}
