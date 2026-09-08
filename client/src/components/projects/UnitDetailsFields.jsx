import { getTodayDateString } from '../../utils/dateInput';
import { validateUnitPrice } from '../../utils/unitUtils';
import { useToast } from '../../hooks/useToast';

export default function UnitDetailsFields({
  values,
  onChange,
  lookups = {},
  size = 'sm',
  showTower = false,
  towers = [],
  minPrice,
  maxPrice,
}) {
  const toast = useToast();
  const inputClass = size === 'sm' ? 'form-control form-control-sm' : 'form-control';
  const selectClass = size === 'sm' ? 'form-select form-select-sm' : 'form-select';
  const labelClass = 'form-label small text-secondary mb-1';

  const set = (field, value) => onChange(field, value);
  const priceMin = minPrice !== '' && minPrice != null ? Number(minPrice) : undefined;
  const priceMax = maxPrice !== '' && maxPrice != null ? Number(maxPrice) : undefined;
  const showPriceRange = priceMin != null && priceMax != null && !Number.isNaN(priceMin) && !Number.isNaN(priceMax);

  const handlePriceBlur = () => {
    if (values.price === '' || values.price == null) return;
    const err = validateUnitPrice(values.price, minPrice, maxPrice);
    if (err) toast.error(err);
  };

  return (
    <>
      <div className="row g-2">
        <div className="col-md-2">
          <label className={labelClass}>Unit #</label>
          <input
            className={inputClass}
            placeholder="e.g. 101"
            required={size !== 'sm'}
            value={values.unitNumber}
            onChange={(e) => set('unitNumber', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Type</label>
          <input
            className={inputClass}
            placeholder="e.g. 2BHK"
            value={values.unitType}
            onChange={(e) => set('unitType', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Floor</label>
          <input
            type="number"
            className={inputClass}
            placeholder="Floor"
            value={values.floorNumber}
            onChange={(e) => set('floorNumber', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Super area</label>
          <input
            type="number"
            className={inputClass}
            placeholder="sq.ft"
            value={values.area}
            onChange={(e) => set('area', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Carpet area</label>
          <input
            type="number"
            className={inputClass}
            placeholder="sq.ft"
            value={values.carpetArea}
            onChange={(e) => set('carpetArea', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Price (₹)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="Price"
            min={showPriceRange ? priceMin : 0}
            max={showPriceRange ? priceMax : undefined}
            value={values.price}
            onChange={(e) => set('price', e.target.value)}
            onBlur={handlePriceBlur}
          />
          {showPriceRange && (
            <div className="form-text" style={{ fontSize: '0.7rem' }}>
              ₹{priceMin.toLocaleString('en-IN')} – ₹{priceMax.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </div>

      <div className="row g-2 mt-1">
        <div className="col-md-2">
          <label className={labelClass}>Bedrooms</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={values.bedrooms}
            onChange={(e) => set('bedrooms', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Bathrooms</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={values.bathrooms}
            onChange={(e) => set('bathrooms', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Balconies</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={values.balconies}
            onChange={(e) => set('balconies', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Parking</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={values.parking}
            onChange={(e) => set('parking', e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Furnishing</label>
          <select
            className={selectClass}
            value={values.furnishingId}
            onChange={(e) => set('furnishingId', e.target.value)}
          >
            <option value="">Select</option>
            {lookups.furnishingTypes?.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className={labelClass}>Facing</label>
          <select
            className={selectClass}
            value={values.facingId}
            onChange={(e) => set('facingId', e.target.value)}
          >
            <option value="">Select</option>
            {lookups.facingTypes?.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showTower && (
        <div className="row g-2 mt-1">
          <div className="col-md-4">
            <label className={labelClass}>Tower</label>
            <select
              className={selectClass}
              value={values.towerId}
              onChange={(e) => set('towerId', e.target.value)}
            >
              <option value="">No tower</option>
              {towers.map((tower) => (
                <option key={tower.id} value={tower.id}>{tower.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="row g-2 mt-1 align-items-end">
        <div className="col-md-4">
          <label className="form-check mb-0">
            <input
              type="checkbox"
              className="form-check-input"
              checked={Boolean(values.isReadyToMove)}
              onChange={(e) => set('isReadyToMove', e.target.checked)}
            />
            <span className="form-check-label small">Ready to move in</span>
          </label>
        </div>
        <div className="col-md-4">
          <label className={labelClass}>
            {values.isReadyToMove ? 'Available / handed over from' : 'Expected delivery date'}
          </label>
          <input
            type="date"
            className={inputClass}
            min={getTodayDateString()}
            value={values.deliveryDate || ''}
            onChange={(e) => set('deliveryDate', e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
