import { useEffect, useState } from 'react';
import { rbacService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function PermissionsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    rbacService
      .listPermissions()
      .then((res) => setItems(res.data.data))
      .catch((err) => {
        toast.apiError(err, 'Failed to load');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = items.filter(
    (p) =>
      !filter ||
      p.code.toLowerCase().includes(filter.toLowerCase()) ||
      p.module.toLowerCase().includes(filter.toLowerCase()) ||
      p.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="panel-card">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h2 className="h6 mb-0">Permissions ({filtered.length})</h2>
        <input
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Search permissions"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : loadFailed ? (
        <p className="text-secondary text-center py-5 mb-0">Could not load permissions.</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Module</th>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><span className="badge text-bg-light border">{p.module}</span></td>
                  <td><code>{p.code}</code></td>
                  <td>{p.name}</td>
                  <td className="text-secondary small">{p.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
