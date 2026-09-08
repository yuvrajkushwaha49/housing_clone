import UnitDetailsFields from './UnitDetailsFields';
import { EMPTY_BUILDING_ROW, EMPTY_TOWER_ROW } from '../../utils/projectStructureUtils';
import { EMPTY_UNIT_ROW } from '../../utils/unitUtils';

export default function ProjectCreateStructureForm({
  buildings,
  onBuildingsChange,
  towers,
  onTowersChange,
  lookups = {},
  required = false,
  minPrice,
  maxPrice,
}) {
  const defaultBuildingId = () => {
    const named = buildings.filter((b) => b.name.trim());
    if (named.length === 1) return named[0].id;
    if (buildings.length === 1) return buildings[0].id;
    return '';
  };

  const addBuilding = () => onBuildingsChange([...buildings, EMPTY_BUILDING_ROW()]);

  const updateBuilding = (id, patch) => {
    onBuildingsChange(buildings.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeBuilding = (id) => {
    if (required && buildings.length <= 1) return;
    onBuildingsChange(buildings.filter((row) => row.id !== id));
    onTowersChange(towers.map((tower) => (
      tower.buildingId === id ? { ...tower, buildingId: '' } : tower
    )));
  };

  const addTower = () => {
    const row = EMPTY_TOWER_ROW();
    row.buildingId = defaultBuildingId();
    row.units = [EMPTY_UNIT_ROW()];
    onTowersChange([...towers, row]);
  };

  const updateTower = (id, patch) => {
    onTowersChange(towers.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeTower = (id) => {
    if (required && towers.length <= 1) return;
    onTowersChange(towers.filter((row) => row.id !== id));
  };

  const updateTowerUnit = (towerId, unitId, field, value) => {
    onTowersChange(towers.map((tower) => {
      if (tower.id !== towerId) return tower;
      return {
        ...tower,
        units: tower.units.map((unit) => (
          unit.id === unitId ? { ...unit, [field]: value } : unit
        )),
      };
    }));
  };

  const addTowerUnit = (towerId) => {
    onTowersChange(towers.map((tower) => (
      tower.id === towerId
        ? { ...tower, units: [...tower.units, EMPTY_UNIT_ROW()] }
        : tower
    )));
  };

  const countUnitRows = () =>
    towers.reduce((sum, tower) => sum + (tower.units?.length || 0), 0);

  const removeTowerUnit = (towerId, unitId) => {
    if (required && countUnitRows() <= 1) return;
    onTowersChange(towers.map((tower) => {
      if (tower.id !== towerId) return tower;
      return {
        ...tower,
        units: tower.units.filter((unit) => unit.id !== unitId),
      };
    }));
  };

  const namedBuildings = buildings.filter((b) => b.name.trim());

  return (
    <div className="panel-card" id="project-structure-section">
      <h2 className="form-section-title">
        Buildings, towers & units
        {required && <span className="text-danger ms-1">*</span>}
      </h2>
      <p className="form-section-hint mb-0">
        {required
          ? 'Add at least 1 building, 1 tower, and 1 unit with a unit number.'
          : 'Optional — add structure now or later from the project page.'}
      </p>
      <div className="structure-step mt-3">
        <div className="structure-step-header">
          <div className="d-flex align-items-center gap-2">
            <span className="structure-step-badge">1</span>
            <div>
              <strong className="small d-block">Buildings / blocks</strong>
              <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                Name each wing or block in the project
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={addBuilding}>
            + Add building
          </button>
        </div>

        {buildings.length === 0 && (
          <div className="small text-secondary">No buildings added yet.</div>
        )}
        {buildings.map((building, index) => (
          <div key={building.id} className="structure-item-card">
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label small mb-1">
                  Building name {required && index === 0 && <span className="text-danger">*</span>}
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. Block A, Wing 1"
                  required={required}
                  value={building.name}
                  onChange={(e) => updateBuilding(building.id, { name: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={building.isActive}
                    onChange={(e) => updateBuilding(building.id, { isActive: e.target.checked })}
                  />
                  <span className="form-check-label small">Active building</span>
                </label>
              </div>
              <div className="col-md-2 text-md-end">
                {!(required && buildings.length <= 1) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeBuilding(building.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="structure-step">
        <div className="structure-step-header">
          <div className="d-flex align-items-center gap-2">
            <span className="structure-step-badge">2</span>
            <div>
              <strong className="small d-block">Towers & units</strong>
              <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                Link each tower to a building and add unit details
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={addTower}>
            + Add tower
          </button>
        </div>

        {towers.length === 0 && (
          <div className="small text-secondary">No towers added yet.</div>
        )}
        {towers.map((tower, towerIndex) => (
          <div key={tower.id} className="structure-item-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <strong className="small">
                Tower {towerIndex + 1}
                {required && towerIndex === 0 && <span className="text-danger ms-1">*</span>}
              </strong>
              {!(required && towers.length <= 1) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeTower(tower.id)}
                >
                  Remove tower
                </button>
              )}
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label small mb-1">
                  Tower name {required && towerIndex === 0 && <span className="text-danger">*</span>}
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. Tower A"
                  required={required && towerIndex === 0}
                  value={tower.name}
                  onChange={(e) => updateTower(tower.id, { name: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small mb-1">Building</label>
                <select
                  className="form-select"
                  value={tower.buildingId}
                  onChange={(e) => updateTower(tower.id, { buildingId: e.target.value })}
                >
                  <option value="">Select building</option>
                  {namedBuildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Floors</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 12"
                  value={tower.totalFloors}
                  onChange={(e) => updateTower(tower.id, { totalFloors: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Units</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="Auto"
                  value={tower.totalUnits}
                  onChange={(e) => updateTower(tower.id, { totalUnits: e.target.value })}
                />
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
              <span className="small fw-semibold text-secondary">Units in this tower</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => addTowerUnit(tower.id)}
              >
                + Add unit
              </button>
            </div>

            {tower.units.map((unit, unitIndex) => (
              <div key={unit.id} className="structure-unit-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-semibold">
                    Unit {unitIndex + 1}
                    {required && unitIndex === 0 && towerIndex === 0 && (
                      <span className="text-danger ms-1">*</span>
                    )}
                  </span>
                  {!(required && countUnitRows() <= 1) && tower.units.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeTowerUnit(tower.id, unit.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <UnitDetailsFields
                  values={unit}
                  lookups={lookups}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onChange={(field, value) => updateTowerUnit(tower.id, unit.id, field, value)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
