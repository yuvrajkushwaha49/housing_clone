import { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { FieldReviewRating } from './FieldReviewRating';

const LOCK_MESSAGES = {
  archived: 'This project is archived. Buildings and towers cannot be edited.',
};

function StatusBadge({ isActive }) {
  return (
    <span className={`badge ${isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function ProjectStructureSection({
  project,
  canEdit,
  projectStatus,
  onUpdated,
  review = null,
}) {
  const toast = useToast();
  const [togglingId, setTogglingId] = useState(null);

  const structure = project.structure || {
    buildingCount: project.buildings?.filter((b) => b.isActive !== false).length || 0,
    towerCount: project.towers?.filter((t) => t.isActive !== false).length || 0,
    totalFloors: project.towers?.filter((t) => t.isActive !== false)
      .reduce((sum, t) => sum + (t.totalFloors || 0), 0) || 0,
  };

  const standaloneTowers = project.unassignedTowers?.length
    ? project.unassignedTowers
    : (project.towers || []).filter((t) => !t.building);

  const toggleBuildingActive = async (building) => {
    setTogglingId(building.id);
    try {
      const { data } = await projectService.updateBuilding(project.id, building.id, {
        isActive: !building.isActive,
      });
      onUpdated(data.data);
      toast.success(building.isActive ? 'Building deactivated' : 'Building activated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update building');
    } finally {
      setTogglingId(null);
    }
  };

  const toggleTowerActive = async (tower) => {
    setTogglingId(tower.id);
    try {
      const { data } = await projectService.updateTower(project.id, tower.id, {
        isActive: !tower.isActive,
      });
      onUpdated(data.data);
      toast.success(tower.isActive ? 'Tower deactivated' : 'Tower activated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tower');
    } finally {
      setTogglingId(null);
    }
  };

  const removeBuilding = async (buildingId) => {
    if (!window.confirm('Remove this building? Towers will be unlinked.')) return;
    try {
      const { data } = await projectService.deleteBuilding(project.id, buildingId);
      onUpdated(data.data);
      toast.success('Building removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove building');
    }
  };

  const removeTower = async (towerId) => {
    if (!window.confirm('Remove this tower?')) return;
    try {
      const { data } = await projectService.deleteTower(project.id, towerId);
      onUpdated(data.data);
      toast.success('Tower removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove tower');
    }
  };

  const renderTowerActions = (tower) => (
    <td className="text-end text-nowrap">
      {canEdit && (
        <div className="d-flex gap-1 justify-content-end">
          <button
            type="button"
            className={`btn btn-sm ${tower.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
            disabled={togglingId === tower.id}
            onClick={() => toggleTowerActive(tower)}
          >
            {tower.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => removeTower(tower.id)}
          >
            Remove
          </button>
        </div>
      )}
    </td>
  );

  return (
    <div className="panel-card mb-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="h6 mb-0">Buildings, towers & floors</h2>
        {canEdit && (
          <div className="d-flex gap-2">
            <Link to="buildings/new" className="btn btn-primary btn-sm" relative="path">
              New building / block
            </Link>
            <Link to="towers/new" className="btn btn-outline-primary btn-sm" relative="path">
              New tower
            </Link>
          </div>
        )}
      </div>

      <div className="row g-2 mb-3">
        {[
          ['Active buildings', structure.buildingCount],
          ['Active towers', structure.towerCount],
          ['Total floors', structure.totalFloors],
        ].map(([label, value]) => (
          <div className="col-4" key={label}>
            <div className="border rounded p-2 text-center">
              <div className="small text-secondary">{label}</div>
              <div className="fw-semibold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {!canEdit && (
        <div className="alert alert-secondary py-2 small mb-3">
          {LOCK_MESSAGES[projectStatus] || `Cannot edit structure while project is ${projectStatus}.`}
        </div>
      )}

      {canEdit && !project.buildings?.length && !project.towers?.length && !standaloneTowers.length && (
        <div className="text-center text-secondary small py-3 border rounded mb-3">
          No buildings or towers yet. Use <strong>New building / block</strong> or <strong>New tower</strong> above.
        </div>
      )}

      {project.buildings?.map((building) => (
        <div
          key={building.id}
          className={`border rounded p-3 mb-2 ${building.isActive === false ? 'opacity-75' : ''}`}
        >
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong>{building.name}</strong>
                {review && (
                  <FieldReviewRating
                    project={project}
                    review={review}
                    sectionKey="building"
                    fieldKey="name"
                    entityUuid={building.id}
                  />
                )}
                <StatusBadge isActive={building.isActive !== false} />
              </div>
              <div className="small text-secondary">
                {building.activeTowerCount ?? building.towerCount ?? 0} active tower(s) ·
                {' '}{building.totalFloors || 0} floor(s)
              </div>
            </div>
            {canEdit && (
              <div className="d-flex gap-1 flex-wrap">
                <Link
                  to={`towers/new?buildingId=${building.id}`}
                  className="btn btn-sm btn-outline-primary"
                  relative="path"
                >
                  Add tower
                </Link>
                <button
                  type="button"
                  className={`btn btn-sm ${building.isActive !== false ? 'btn-outline-warning' : 'btn-outline-success'}`}
                  disabled={togglingId === building.id}
                  onClick={() => toggleBuildingActive(building)}
                >
                  {building.isActive !== false ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeBuilding(building.id)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {building.towers?.length ? (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Tower</th>
                    <th>Floors</th>
                    <th>Units</th>
                    <th>Status</th>
                    {canEdit && <th />}
                  </tr>
                </thead>
                <tbody>
                  {building.towers.map((tower) => (
                    <tr key={tower.id} className={tower.isActive === false ? 'text-secondary' : ''}>
                      <td>
                        <span className="d-inline-flex align-items-center gap-2 flex-wrap">
                          {tower.name}
                          {review && (
                            <FieldReviewRating
                              project={project}
                              review={review}
                              sectionKey="tower"
                              fieldKey="name"
                              entityUuid={tower.id}
                            />
                          )}
                        </span>
                      </td>
                      <td>{tower.totalFloors ?? '—'}</td>
                      <td>{tower.totalUnits ?? '—'}</td>
                      <td><StatusBadge isActive={tower.isActive !== false} /></td>
                      {renderTowerActions(tower)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="small text-secondary">No towers in this building yet.</div>
          )}
        </div>
      ))}

      {standaloneTowers.length > 0 && (
        <div className="border rounded p-3">
          <strong className="small">Standalone towers</strong>
          <div className="table-responsive mt-2">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Tower</th>
                  <th>Floors</th>
                  <th>Units</th>
                  <th>Status</th>
                  {canEdit && <th />}
                </tr>
              </thead>
              <tbody>
                {standaloneTowers.map((tower) => (
                  <tr key={tower.id} className={tower.isActive === false ? 'text-secondary' : ''}>
                    <td>
                      <span className="d-inline-flex align-items-center gap-2 flex-wrap">
                        {tower.name}
                        {review && (
                          <FieldReviewRating
                            project={project}
                            review={review}
                            sectionKey="tower"
                            fieldKey="name"
                            entityUuid={tower.id}
                          />
                        )}
                      </span>
                    </td>
                    <td>{tower.totalFloors ?? '—'}</td>
                    <td>{tower.totalUnits ?? '—'}</td>
                    <td><StatusBadge isActive={tower.isActive !== false} /></td>
                    {renderTowerActions(tower)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
