import { useEffect, useState } from 'react';
import { rbacService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function RolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState({ code: '', name: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rbacService.listRoles(),
        rbacService.listPermissions(),
      ]);
      setRoles(rolesRes.data.data);
      setAllPermissions(permsRes.data.data);
    } catch (err) {
      toast.apiError(err, 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRole = async (role) => {
    setSelected(role);
    try {
      const { data } = await rbacService.getRolePermissions(role.id);
      setSelectedCodes(data.data.permissions.map((p) => p.code));
    } catch (err) {
      toast.apiError(err, 'Failed to load permissions');
    }
  };

  const togglePermission = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const savePermissions = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await rbacService.setRolePermissions(selected.id, selectedCodes);
      toast.success('Permissions updated');
      await load();
    } catch (err) {
      toast.apiError(err, 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async (e) => {
    e.preventDefault();
    try {
      await rbacService.createRole(newRole);
      setNewRole({ code: '', name: '', description: '' });
      toast.success('Role created');
      await load();
    } catch (err) {
      toast.apiError(err, 'Create failed');
    }
  };

  const grouped = allPermissions.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="panel-card mb-3">
          <h2 className="h6 mb-3">Roles</h2>
          <div className="list-group list-group-flush">
            {roles.map((role) => (
              <button
                type="button"
                key={role.id}
                className={`list-group-item list-group-item-action ${selected?.id === role.id ? 'active' : ''}`}
                onClick={() => openRole(role)}
              >
                <div className="fw-semibold">{role.name}</div>
                <small className={selected?.id === role.id ? '' : 'text-secondary'}>
                  {role.code} · {role.permissionCount} permissions · {role.userCount} users
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <h2 className="h6 mb-3">Create role</h2>
          <form onSubmit={createRole}>
            <div className="mb-2">
              <input
                className="form-control"
                placeholder="Code (e.g. CITY_MANAGER)"
                value={newRole.code}
                onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
                required
              />
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                placeholder="Name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                placeholder="Description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-outline-primary w-100">Create</button>
          </form>
        </div>
      </div>

      <div className="col-lg-8">
        {!selected ? (
          <div className="panel-card text-secondary">Select a role to manage permissions.</div>
        ) : (
          <div className="panel-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="h6 mb-0">{selected.name}</h2>
                <small className="text-secondary">{selected.code}</small>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || selectedCodes.length === 0}
                onClick={savePermissions}
              >
                {saving ? 'Saving…' : 'Save permissions'}
              </button>
            </div>
            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module} className="mb-3">
                <h3 className="h6 text-uppercase text-secondary small">{module}</h3>
                <div className="row g-2">
                  {perms.map((p) => (
                    <div className="col-md-6" key={p.id}>
                      <label className="form-check border rounded px-3 py-2 w-100">
                        <input
                          type="checkbox"
                          className="form-check-input me-2"
                          checked={selectedCodes.includes(p.code)}
                          onChange={() => togglePermission(p.code)}
                        />
                        <span className="form-check-label">
                          <strong className="d-block">{p.name}</strong>
                          <code className="small">{p.code}</code>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
