import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rbacService } from '../../services';
import { useToast } from '../../hooks/useToast';

const EMPTY_FILTERS = {
  search: '',
  roleCode: '',
  status: '',
  emailVerified: '',
};

export default function UsersPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  const buildParams = (page = 1) => {
    const params = { page, limit: 20 };
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.roleCode) params.roleCode = filters.roleCode;
    if (filters.status) params.status = filters.status;
    if (filters.emailVerified) params.emailVerified = filters.emailVerified;
    return params;
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await rbacService.listUsers(buildParams(page));
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      toast.apiError(err, 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    rbacService.listRoles().then(({ data }) => setRoles(data.data)).catch(() => {});
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilters = Object.values(filters).some((v) => v);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setLoading(true);
    rbacService
      .listUsers({ page: 1, limit: 20 })
      .then(({ data }) => {
        setItems(data.data);
        setMeta(data.meta);
      })
      .catch((err) => toast.apiError(err, 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <div className="panel-card mb-3">
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => {
            e.preventDefault();
            load(1);
          }}
        >
          <div className="col-md-4 col-lg-3">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Name, email, phone"
            />
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={filters.roleCode}
              onChange={(e) => setFilters((f) => ({ ...f, roleCode: e.target.value }))}
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label">Email verified</label>
            <select
              className="form-select"
              value={filters.emailVerified}
              onChange={(e) => setFilters((f) => ({ ...f, emailVerified: e.target.value }))}
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Not verified</option>
            </select>
          </div>
          <div className="col-md-8 col-lg-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary flex-grow-1">
              Apply filters
            </button>
            {hasActiveFilters && (
              <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="panel-card">
        <div className="d-flex justify-content-between mb-3">
          <h2 className="h6 mb-0">Users ({meta.total})</h2>
        </div>
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-secondary text-center py-4 mb-0">No users match your filters.</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Link to={`/panel/super-admin/users/${u.id}`} className="text-decoration-none fw-medium">
                          {u.firstName} {u.lastName || ''}
                        </Link>
                      </td>
                      <td>{u.email}</td>
                      <td><span className="badge text-bg-secondary">{u.role.name}</span></td>
                      <td><span className="badge text-bg-light border">{u.status}</span></td>
                      <td>{u.emailVerified ? 'Yes' : 'No'}</td>
                      <td className="small text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="text-end">
                        <Link
                          to={`/panel/super-admin/users/${u.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-secondary">Page {meta.page} of {meta.totalPages}</small>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={meta.page <= 1}
                  onClick={() => load(meta.page - 1)}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => load(meta.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
