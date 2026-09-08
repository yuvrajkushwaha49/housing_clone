import { projectService } from '../services';
import { EMPTY_UNIT_ROW, mapUnitPayload, validateUnitsPriceRange } from './unitUtils';

export const EMPTY_BUILDING_ROW = () => ({
  id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  isActive: true,
});

export const EMPTY_TOWER_ROW = () => ({
  id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  buildingId: '',
  totalFloors: '',
  totalUnits: '',
  isActive: true,
  units: [],
});

export function createDefaultProjectStructure() {
  const building = EMPTY_BUILDING_ROW();
  const tower = EMPTY_TOWER_ROW();
  tower.buildingId = building.id;
  tower.units = [EMPTY_UNIT_ROW()];
  return {
    buildings: [building],
    towers: [tower],
  };
}

export function countValidUnits(towers = []) {
  return towers.flatMap((tower) =>
    (tower.units || []).filter((unit) => unit.unitNumber?.trim())
  ).length;
}

export function validateProjectStructure({ buildings = [], towers = [] }, { minPrice, maxPrice } = {}) {
  const validBuildings = buildings.filter((row) => row.name?.trim());
  if (validBuildings.length < 1) {
    return 'Add at least 1 building / block with a name.';
  }

  const validTowers = towers.filter((row) => row.name?.trim());
  if (validTowers.length < 1) {
    return 'Add at least 1 tower with a name.';
  }

  if (countValidUnits(towers) < 1) {
    return 'Add at least 1 unit with a unit number inside a tower.';
  }

  const allUnits = towers.flatMap((tower) => tower.units || []);
  const priceError = validateUnitsPriceRange(allUnits, minPrice, maxPrice);
  if (priceError) return priceError;

  return null;
}

export async function saveProjectStructure(projectId, { buildings = [], towers = [] }) {
  const buildingIdMap = {};

  for (const building of buildings.filter((row) => row.name?.trim())) {
    const { data } = await projectService.addBuilding(projectId, {
      name: building.name.trim(),
      isActive: building.isActive !== false,
    });
    const created = data.data.buildings?.find((row) => row.name === building.name.trim());
    if (created) buildingIdMap[building.id] = created.id;
  }

  for (const tower of towers.filter((row) => row.name?.trim())) {
    const validUnits = (tower.units || [])
      .filter((unit) => unit.unitNumber?.trim())
      .map((unit) => mapUnitPayload(unit));

    await projectService.addTower(projectId, {
      name: tower.name.trim(),
      buildingId: tower.buildingId ? buildingIdMap[tower.buildingId] : undefined,
      totalFloors: tower.totalFloors !== '' ? Number(tower.totalFloors) : undefined,
      totalUnits: tower.totalUnits !== ''
        ? Number(tower.totalUnits)
        : (validUnits.length || undefined),
      isActive: tower.isActive !== false,
      units: validUnits.length ? validUnits : undefined,
    });
  }
}
