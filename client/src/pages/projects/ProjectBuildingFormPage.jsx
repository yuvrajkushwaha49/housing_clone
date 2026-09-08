import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mastersService, projectService } from '../../services';
import ImageUploadWithCaption from '../../components/ImageUploadWithCaption';
import AmenitySelector from '../../components/AmenitySelector';
import UnitDetailsFields from '../../components/projects/UnitDetailsFields';
import { appendImagesToFormData } from '../../utils/imageUpload';
import { uploadPendingAmenityImages } from '../../utils/amenityImages';
import { EMPTY_TOWER_ROW } from '../../utils/projectStructureUtils';
import { EMPTY_UNIT_ROW, mapUnitPayload, validateUnitsPriceRange } from '../../utils/unitUtils';
import { useToast } from '../../hooks/useToast';

export default function ProjectBuildingFormPage() {
  const toast = useToast();
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [lookups, setLookups] = useState({ furnishingTypes: [], facingTypes: [] });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [pendingAmenityImages, setPendingAmenityImages] = useState({});
  const [imageItems, setImageItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ name: '', isActive: true });
  const [towers, setTowers] = useState([]);

  useEffect(() => {
    Promise.all([
      projectService.get(uuid),
      mastersService.listAmenities({ activeOnly: true }),
      mastersService.getLookups(),
    ])
      .then(([projectRes, amenitiesRes, lookupsRes]) => {
        const data = projectRes.data.data;
        setProject(data);
        setAmenities(amenitiesRes.data.data);
        setLookups(lookupsRes.data.data);
        setSelectedAmenities(data.amenities?.map((a) => a.id) || []);
      })
      .catch((err) => {
        toast.apiError(err, 'Failed to load project');
        setLoadFailed(true);
      });
  }, [uuid, toast]);

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) => {
      if (prev.includes(id)) {
        setPendingAmenityImages((images) => {
          const next = { ...images };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const handlePendingAmenityImage = (amenityId, file) => {
    setPendingAmenityImages((prev) => {
      const next = { ...prev };
      if (file) next[amenityId] = file;
      else delete next[amenityId];
      return next;
    });
  };

  const addTower = () => {
    const row = EMPTY_TOWER_ROW();
    row.units = [EMPTY_UNIT_ROW()];
    setTowers((prev) => [...prev, row]);
  };

  const updateTower = (id, patch) => {
    setTowers((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeTower = (id) => setTowers((prev) => prev.filter((row) => row.id !== id));

  const updateTowerUnit = (towerId, unitId, field, value) => {
    setTowers((prev) => prev.map((tower) => {
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
    setTowers((prev) => prev.map((tower) => (
      tower.id === towerId
        ? { ...tower, units: [...tower.units, EMPTY_UNIT_ROW()] }
        : tower
    )));
  };

  const removeTowerUnit = (towerId, unitId) => {
    setTowers((prev) => prev.map((tower) => {
      if (tower.id !== towerId) return tower;
      return {
        ...tower,
        units: tower.units.length === 1
          ? tower.units
          : tower.units.filter((unit) => unit.id !== unitId),
      };
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: buildingRes } = await projectService.addBuilding(uuid, {
        name: buildingForm.name.trim(),
        isActive: buildingForm.isActive,
      });
      const projectData = buildingRes.data;
      const building = projectData.buildings?.find(
        (row) => row.name === buildingForm.name.trim()
      );
      const buildingId = building?.id;

      for (const tower of towers.filter((row) => row.name?.trim())) {
        const validUnits = (tower.units || [])
          .filter((unit) => unit.unitNumber?.trim())
          .map((unit) => mapUnitPayload(unit));

        const priceError = validateUnitsPriceRange(tower.units || [], project?.minPrice, project?.maxPrice);
        if (priceError) {
          toast.error(priceError);
          setSaving(false);
          return;
        }

        await projectService.addTower(uuid, {
          name: tower.name.trim(),
          buildingId,
          totalFloors: tower.totalFloors !== '' ? Number(tower.totalFloors) : undefined,
          totalUnits: tower.totalUnits !== ''
            ? Number(tower.totalUnits)
            : (validUnits.length || undefined),
          isActive: tower.isActive !== false,
          units: validUnits.length ? validUnits : undefined,
        });
      }

      const existingAmenityIds = project?.amenities?.map((a) => a.id) || [];
      const amenitiesChanged = selectedAmenities.length !== existingAmenityIds.length
        || selectedAmenities.some((id) => !existingAmenityIds.includes(id));
      if (amenitiesChanged) {
        await projectService.update(uuid, { amenityIds: selectedAmenities });
      }

      await uploadPendingAmenityImages(uuid, pendingAmenityImages);

      if (imageItems.length) {
        const fd = appendImagesToFormData(new FormData(), imageItems, {
          mediaType: 'image',
          isPrimary: true,
        });
        await projectService.uploadMedia(uuid, fd);
      }

      navigate('..');
    } catch (err) {
      toast.apiError(err, 'Failed to save building');
    } finally {
      setSaving(false);
    }
  };

  if (!project && !loadFailed) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return (
      <div>
        <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Back to project</Link>
        <p className="text-secondary">Could not load project.</p>
      </div>
    );
  }

  return (
    <div>
      <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Back to project</Link>

      <form className="panel-card" onSubmit={onSubmit}>
        <h1 className="h5 mb-1">New building / block</h1>
        {project && <p className="text-secondary small mb-4">Project: {project.name}</p>}

        <div className="row g-3 mb-4">
          <div className="col-md-8">
            <label className="form-label">Building name</label>
            <input
              className="form-control"
              placeholder="e.g. Block A, Wing 1, Building 1"
              required
              value={buildingForm.name}
              onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <label className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={buildingForm.isActive}
                onChange={(e) => setBuildingForm({ ...buildingForm, isActive: e.target.checked })}
              />
              <span className="form-check-label">Active building</span>
            </label>
          </div>
        </div>

        <div className="border rounded p-3 bg-light mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h6 mb-0">Towers in this building</h2>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addTower}>
              + Add tower
            </button>
          </div>
          <p className="small text-secondary mb-3">
            Optional — add towers and units now, or add them later from the project page.
          </p>

          {towers.length === 0 && (
            <div className="small text-secondary">No towers added yet.</div>
          )}

          {towers.map((tower, towerIndex) => (
            <div key={tower.id} className="border rounded bg-white p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold">Tower {towerIndex + 1}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeTower(tower.id)}
                >
                  Remove
                </button>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <label className="form-label small mb-1">Tower name</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="e.g. Tower A"
                    value={tower.name}
                    onChange={(e) => updateTower(tower.id, { name: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-1">Total floors</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={tower.totalFloors}
                    onChange={(e) => updateTower(tower.id, { totalFloors: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-1">Total units</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={tower.totalUnits}
                    onChange={(e) => updateTower(tower.id, { totalUnits: e.target.value })}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold">Unit details</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => addTowerUnit(tower.id)}
                >
                  + Add unit
                </button>
              </div>
              {tower.units.map((unit, unitIndex) => (
                <div key={unit.id} className="border rounded p-2 mb-2 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">Unit {unitIndex + 1}</span>
                    {tower.units.length > 1 && (
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
                    minPrice={project?.minPrice}
                    maxPrice={project?.maxPrice}
                    onChange={(field, value) => updateTowerUnit(tower.id, unit.id, field, value)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h2 className="h6 mb-2">Amenities</h2>
          <p className="small text-secondary mb-3">Select amenities and add project photos if needed.</p>
          <AmenitySelector
            amenities={amenities}
            selectedIds={selectedAmenities}
            onToggle={toggleAmenity}
            projectAmenities={project?.amenities || []}
            pendingImages={pendingAmenityImages}
            onPendingImageChange={handlePendingAmenityImage}
          />
        </div>

        <div className="mt-4">
          <ImageUploadWithCaption
            items={imageItems}
            onChange={setImageItems}
            label="Images"
            hint="Upload photos with descriptions for the project gallery."
          />
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save building'}
          </button>
          <Link to=".." className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
