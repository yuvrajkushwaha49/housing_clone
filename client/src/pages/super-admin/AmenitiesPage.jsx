import { useEffect, useMemo, useState } from 'react';
import { mastersService } from '../../services';
import { useToast } from '../../hooks/useToast';

const EMPTY_FORM = {
  code: '',
  name: '',
  icon: 'bi-star',
  category: 'internal',
  sortOrder: 0,
};

function amenityIconClass(icon) {
  const value = (icon || 'bi-star').trim();
  if (!value) return 'bi bi-star';
  return value.startsWith('bi ') ? value : `bi ${value}`;
}

export default function AmenitiesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await mastersService.listAmenities();
      setItems(data.data);
    } catch (err) {
      toast.apiError(err, 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setForm(EMPTY_FORM);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await mastersService.createAmenity(form);
      const created = data.data;
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success('Amenity created');
      closeAddModal();
    } catch (err) {
      toast.apiError(err, 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this amenity?')) return;
    try {
      await mastersService.deleteAmenity(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success('Amenity deleted');
    } catch (err) {
      toast.apiError(err, 'Delete failed');
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">Amenities</h1>
          <p className="text-secondary small mb-0">
            Master amenity catalog used in projects and property forms.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-1" />
          Add amenity
        </button>
      </div>

      <div className="panel-card">
        <div className="row g-2 align-items-center mb-3">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text"><i className="bi bi-search" /></span>
              <input
                type="search"
                className="form-control"
                placeholder="Search by name, code, category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-7 text-md-end">
            <small className="text-secondary">{filteredItems.length} of {items.length} amenities</small>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-stars d-block mb-2" style={{ fontSize: '1.75rem' }} />
            {items.length === 0 ? 'No amenities yet.' : 'No amenities match your search.'}
            {items.length === 0 && (
              <div className="mt-2">
                <button type="button" className="btn btn-sm btn-primary" onClick={openAddModal}>
                  Add first amenity
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="amenity-icon-cell">
                        <i className={amenityIconClass(a.icon)} />
                      </span>
                    </td>
                    <td className="fw-medium">{a.name}</td>
                    <td><code>{a.code}</code></td>
                    <td className="text-capitalize">{a.category}</td>
                    <td>
                      <span className={`badge ${a.isActive ? 'text-bg-success' : 'text-bg-light border'}`}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(a.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <>
          <div className="modal-backdrop fade show" onClick={closeAddModal} aria-hidden />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="addAmenityModalLabel"
            onClick={closeAddModal}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5" id="addAmenityModalLabel">
                    Add amenity
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeAddModal}
                    disabled={saving}
                  />
                </div>
                <form onSubmit={onSubmit}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Code</label>
                      <input
                        className="form-control"
                        required
                        autoFocus
                        placeholder="swimming_pool"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        className="form-control"
                        required
                        placeholder="Swimming pool"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                        <option value="nearby">Nearby</option>
                      </select>
                    </div>
                    <div className="mb-0">
                      <label className="form-label">Icon class</label>
                      <div className="d-flex align-items-center gap-2">
                        <span className="amenity-icon-cell flex-shrink-0">
                          <i className={amenityIconClass(form.icon)} />
                        </span>
                        <input
                          className="form-control"
                          value={form.icon}
                          placeholder="bi-water"
                          onChange={(e) => setForm({ ...form, icon: e.target.value })}
                        />
                      </div>
                      <div className="form-text">
                        Bootstrap icon, e.g. <code>bi-wifi</code>, <code>bi-car-front</code>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeAddModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save amenity'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
