import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mastersService, projectService } from '../../services';
import ImageUploadWithCaption from '../../components/ImageUploadWithCaption';
import AmenitySelector from '../../components/AmenitySelector';
import UnitDetailsFields from '../../components/projects/UnitDetailsFields';
import { appendImagesToFormData } from '../../utils/imageUpload';
import { uploadPendingAmenityImages } from '../../utils/amenityImages';
import { EMPTY_UNIT_ROW, mapUnitPayload, validateUnitsPriceRange } from '../../utils/unitUtils';
import { useToast } from '../../hooks/useToast';

export default function ProjectTowerFormPage() {
  const toast = useToast();
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [lookups, setLookups] = useState({ furnishingTypes: [], facingTypes: [] });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [pendingAmenityImages, setPendingAmenityImages] = useState({});
  const [imageItems, setImageItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [towerForm, setTowerForm] = useState({
    name: '',
    buildingId: searchParams.get('buildingId') || '',
    totalFloors: '',
    totalUnits: '',
    isActive: true,
  });
  const [unitRows, setUnitRows] = useState([EMPTY_UNIT_ROW()]);

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

  const updateUnitRow = (rowId, field, value) => {
    setUnitRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };

  const addUnitRow = () => setUnitRows((rows) => [...rows, EMPTY_UNIT_ROW()]);

  const removeUnitRow = (rowId) => {
    setUnitRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)));
  };

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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validUnits = unitRows
        .filter((u) => u.unitNumber.trim())
        .map((u) => mapUnitPayload(u));

      const priceError = validateUnitsPriceRange(unitRows, project?.minPrice, project?.maxPrice);
      if (priceError) {
        toast.error(priceError);
        setSaving(false);
        return;
      }

      await projectService.addTower(uuid, {
        name: towerForm.name,
        buildingId: towerForm.buildingId || undefined,
        totalFloors: towerForm.totalFloors !== '' ? Number(towerForm.totalFloors) : undefined,
        totalUnits: towerForm.totalUnits !== ''
          ? Number(towerForm.totalUnits)
          : (validUnits.length || undefined),
        isActive: towerForm.isActive,
        units: validUnits.length ? validUnits : undefined,
      });

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
      toast.apiError(err, 'Failed to save tower');
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
        <h1 className="h5 mb-1">New tower</h1>
        {project && <p className="text-secondary small mb-4">Project: {project.name}</p>}

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Building (optional)</label>
            <select
              className="form-select"
              value={towerForm.buildingId}
              onChange={(e) => setTowerForm({ ...towerForm, buildingId: e.target.value })}
            >
              <option value="">Standalone tower (no building)</option>
              {project?.buildings?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.isActive === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Tower name</label>
            <input
              className="form-control"
              placeholder="e.g. Tower A, Tower 1"
              required
              value={towerForm.name}
              onChange={(e) => setTowerForm({ ...towerForm, name: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Total floors</label>
            <input
              type="number"
              min="0"
              className="form-control"
              placeholder="e.g. 12"
              value={towerForm.totalFloors}
              onChange={(e) => setTowerForm({ ...towerForm, totalFloors: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Total units</label>
            <input
              type="number"
              min="0"
              className="form-control"
              placeholder="Auto from unit rows"
              value={towerForm.totalUnits}
              onChange={(e) => setTowerForm({ ...towerForm, totalUnits: e.target.value })}
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <label className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={towerForm.isActive}
                onChange={(e) => setTowerForm({ ...towerForm, isActive: e.target.checked })}
              />
              <span className="form-check-label">Active tower</span>
            </label>
          </div>
        </div>

        <div className="border rounded p-3 mt-4 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h6 mb-0">Unit details</h2>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addUnitRow}>
              + Add unit
            </button>
          </div>
          {unitRows.map((row, index) => (
            <div key={row.id} className="border rounded bg-white p-3 mb-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold">Unit {index + 1}</span>
                {unitRows.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeUnitRow(row.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <UnitDetailsFields
                values={row}
                lookups={lookups}
                minPrice={project?.minPrice}
                maxPrice={project?.maxPrice}
                onChange={(field, value) => updateUnitRow(row.id, field, value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h2 className="h6 mb-2">Amenities</h2>
          <p className="small text-secondary mb-3">Select amenities and add a project photo for each one.</p>
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
            hint="Upload photos and describe each one (e.g. tower view, lobby, parking)."
          />
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save tower'}
          </button>
          <Link to=".." className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
