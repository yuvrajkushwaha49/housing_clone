import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminProjectsList from '../../components/projects/AdminProjectsList';
import { PROJECT_STATUS_BADGE } from '../../components/projects/projectUtils';
import { useHomeLocationsContext } from '../../contexts/HomeLocationsContext';
import { ROLE_CODES } from '../../constants';
import { projectService } from '../../services';
import { useToast } from '../../hooks/useToast';

function filterAdminProjects(items, statusFilter, search) {
  const query = search.trim().toLowerCase();
  return items.filter((project) => {
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;
    const haystack = [
      project.name,
      project.builder?.companyName,
      project.city?.name,
      project.locality?.name,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export default function ProjectsListPage({ mode = 'mine' }) {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const { panelCityId, panelCityName } = useHomeLocationsContext();
  const isBuilder = user?.role?.code === ROLE_CODES.BUILDER;
  const location = useLocation();
  const projectBasePath = location.pathname.replace(/\/$/, '');
  const [items, setItems] = useState([]);
  const [allAdminItems, setAllAdminItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const filteredAdminItems = useMemo(
    () => filterAdminProjects(allAdminItems, statusFilter, search),
    [allAdminItems, statusFilter, search]
  );

  const load = async () => {
    setLoading(true);
    try {
      if (mode === 'mine') {
        const cityFilter = isBuilder && panelCityId ? panelCityId : undefined;
        const [listRes, statsRes] = await Promise.all([
          projectService.mine({ cityId: cityFilter }),
          projectService.mineStats(),
        ]);
        setItems(listRes.data.data);
        setStats(statsRes.data.data);
      } else if (mode === 'admin') {
        const res = await projectService.adminList({ limit: 100 });
        setAllAdminItems(res.data.data || []);
      } else {
        const res = await projectService.list({});
        setItems(res.data.data);
      }
    } catch (err) {
      toast.apiError(err, 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, panelCityId]);

  const locationFilterLabel = useMemo(() => {
    if (!isBuilder || mode !== 'mine') return null;
    return panelCityId ? panelCityName : 'All locations';
  }, [isBuilder, mode, panelCityId, panelCityName]);

  const submit = async (id) => {
    try {
      await projectService.updateStatus(id, { status: 'pending' });
      toast.success('Project submitted for review');
      await load();
    } catch (err) {
      toast.apiError(err, 'Submit failed');
    }
  };

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await projectService.remove(project.id);
      toast.success('Project deleted');
      await load();
    } catch (err) {
      toast.apiError(err, 'Delete failed');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (mode === 'admin') {
    return (
      <AdminProjectsList
        allItems={allAdminItems}
        items={filteredAdminItems}
        statusFilter={statusFilter}
        search={search}
        projectBasePath={projectBasePath}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearch}
      />
    );
  }

  return (
    <div>
      {mode === 'mine' && locationFilterLabel && (
        <div className="panel-location-filter-hint mb-3">
          <i className="bi bi-geo-alt" aria-hidden />
          Showing projects for <strong>{locationFilterLabel}</strong>
        </div>
      )}

      {mode === 'mine' && stats && (
        <div className="row g-3 mb-3">
          {[
            ['Total', stats.total],
            ['Draft', stats.draft],
            ['Pending approval', stats.pending],
            ['Published', stats.published],
            ['Rejected', stats.rejected],
          ].map(([label, value]) => (
            <div className="col-6 col-md" key={label}>
              <div className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'mine' && (
        <div className="mb-3 text-end d-flex flex-wrap gap-2 justify-content-end">
          <Link to="../plots/new" className="btn btn-outline-primary">
            <i className="bi bi-map me-1" aria-hidden />
            Add plot
          </Link>
          <Link to="new" className="btn btn-primary">New project</Link>
        </div>
      )}

      <div className="panel-card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Project</th>
                <th>Builder</th>
                <th>City</th>
                <th>Status</th>
                {mode === 'mine' && <th>Submissions</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="small text-secondary">{p.slug}</div>
                    {p.status === 'rejected' && p.rejectionReason && (
                      <div className="small text-danger mt-1">
                        Rejected: {p.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td>{p.builder?.companyName || '—'}</td>
                  <td>{p.city?.name || '—'}</td>
                  <td>
                    <span className={`badge ${PROJECT_STATUS_BADGE[p.status] || 'text-bg-light border'}`}>
                      {p.status}
                    </span>
                  </td>
                  {mode === 'mine' && (
                    <td>{p.submissionCount ?? 0}</td>
                  )}
                  <td className="text-end text-nowrap">
                    {mode === 'mine' && (
                      <>
                        <Link
                          className="btn btn-sm btn-outline-primary me-1"
                          to={
                            ['rejected', 'published'].includes(p.status)
                              ? `${p.id}/edit?resubmit=1`
                              : p.id
                          }
                        >
                          {p.status === 'rejected'
                            ? 'Edit & send for review again'
                            : p.status === 'published'
                              ? 'Improve rating'
                              : 'Manage'}
                        </Link>
                        {p.status === 'draft' && (
                          <button type="button" className="btn btn-sm btn-primary me-1" onClick={() => submit(p.id)}>
                            Submit
                          </button>
                        )}
                        {p.status === 'published' && (
                          <Link className="btn btn-sm btn-outline-secondary me-1" to={`/project/${p.slug}`} target="_blank">
                            View
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteProject(p)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {mode === 'public' && (
                      <Link className="btn btn-sm btn-outline-primary" to={`/project/${p.slug}`}>Open</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div className="text-secondary p-3">No projects yet</div>}
      </div>
    </div>
  );
}
