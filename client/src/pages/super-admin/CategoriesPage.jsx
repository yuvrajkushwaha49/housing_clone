import { useEffect, useMemo, useState } from 'react';
import { mastersService } from '../../services';
import { useToast } from '../../hooks/useToast';

const EMPTY_CAT_FORM = { code: '', name: '', description: '' };
const EMPTY_TYPE_FORM = { code: '', name: '' };

const CATEGORY_ICONS = {
  residential: 'bi-house-door',
  commercial: 'bi-building',
  land: 'bi-geo-alt',
  industrial: 'bi-gear-wide-connected',
};

function categoryIcon(code) {
  const key = (code || '').toLowerCase();
  return CATEGORY_ICONS[key] || 'bi-tag';
}

function Modal({ title, children, onClose, saving }) {
  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} aria-hidden />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5">{title}</h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
                disabled={saving}
              />
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [catForm, setCatForm] = useState(EMPTY_CAT_FORM);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, tps] = await Promise.all([
        mastersService.listCategories(),
        mastersService.listTypes(),
      ]);
      setCategories(cats.data.data);
      setTypes(tps.data.data);
    } catch (err) {
      toast.apiError(err, 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeCountByCategory = useMemo(() => {
    const map = {};
    types.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + 1;
    });
    return map;
  }, [types]);

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  }, [categories, catSearch]);

  const selectedCategoryMeta = categories.find((c) => c.id === selectedCategory);

  const filteredTypes = useMemo(() => {
    let list = selectedCategory
      ? types.filter((t) => t.categoryId === selectedCategory)
      : types;
    const q = typeSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.categoryName || '').toLowerCase().includes(q)
    );
  }, [types, selectedCategory, typeSearch]);

  const openCatModal = () => {
    setCatForm(EMPTY_CAT_FORM);
    setShowCatModal(true);
  };

  const openTypeModal = () => {
    if (!selectedCategory) {
      toast.error('Select a category first');
      return;
    }
    setTypeForm(EMPTY_TYPE_FORM);
    setShowTypeModal(true);
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    setSavingCat(true);
    try {
      await mastersService.createCategory(catForm);
      toast.success('Category created');
      setShowCatModal(false);
      setCatForm(EMPTY_CAT_FORM);
      await load();
    } catch (err) {
      toast.apiError(err, 'Failed to create category');
    } finally {
      setSavingCat(false);
    }
  };

  const submitType = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      toast.error('Select a category first');
      return;
    }
    setSavingType(true);
    try {
      await mastersService.createType({ ...typeForm, categoryId: selectedCategory });
      toast.success('Property type created');
      setShowTypeModal(false);
      setTypeForm(EMPTY_TYPE_FORM);
      await load();
    } catch (err) {
      toast.apiError(err, 'Failed to create property type');
    } finally {
      setSavingType(false);
    }
  };

  return (
    <div className="masters-categories-page">
      <header className="masters-page-hero">
        <div className="masters-page-hero-body">
          <div className="masters-page-hero-icon" aria-hidden>
            <i className="bi bi-tags" />
          </div>
          <div>
            <h1 className="masters-page-title">Categories & property types</h1>
            <p className="masters-page-subtitle mb-0">
              Organize listing taxonomy — categories group property types used across the platform.
            </p>
          </div>
        </div>
        <div className="masters-page-stats">
          <div className="masters-stat-chip">
            <span className="masters-stat-value">{categories.length}</span>
            <span className="masters-stat-label">Categories</span>
          </div>
          <div className="masters-stat-chip">
            <span className="masters-stat-value">{types.length}</span>
            <span className="masters-stat-label">Property types</span>
          </div>
        </div>
      </header>

      <div className="row g-3">
        <div className="col-lg-4 col-xl-3">
          <section className="panel-card masters-categories-sidebar h-100">
            <div className="masters-section-head">
              <div>
                <h2 className="h6 mb-0">Categories</h2>
                <p className="small text-secondary mb-0">Select to manage types</p>
              </div>
              <button type="button" className="btn btn-sm btn-primary" onClick={openCatModal}>
                <i className="bi bi-plus-lg" aria-hidden />
              </button>
            </div>

            <div className="input-group input-group-sm mb-3">
              <span className="input-group-text"><i className="bi bi-search" aria-hidden /></span>
              <input
                type="search"
                className="form-control"
                placeholder="Search categories…"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></div>
            ) : (
              <div className="masters-category-list">
                <button
                  type="button"
                  className={`masters-category-item ${!selectedCategory ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory('')}
                >
                  <span className="masters-category-icon" aria-hidden>
                    <i className="bi bi-grid" />
                  </span>
                  <span className="masters-category-body">
                    <span className="masters-category-name">All categories</span>
                    <span className="masters-category-meta">{types.length} types</span>
                  </span>
                </button>

                {filteredCategories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`masters-category-item ${selectedCategory === c.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategory(c.id)}
                  >
                    <span className="masters-category-icon" aria-hidden>
                      <i className={`bi ${categoryIcon(c.code)}`} />
                    </span>
                    <span className="masters-category-body">
                      <span className="masters-category-name">{c.name}</span>
                      <span className="masters-category-meta">
                        <code>{c.code}</code>
                        <span>· {typeCountByCategory[c.id] || 0} types</span>
                      </span>
                    </span>
                    {!c.isActive && (
                      <span className="badge text-bg-light border masters-category-badge">Inactive</span>
                    )}
                  </button>
                ))}

                {!filteredCategories.length && (
                  <div className="masters-empty-inline">
                    {categories.length ? 'No categories match your search.' : 'No categories yet.'}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="col-lg-8 col-xl-9">
          <section className="panel-card">
            <div className="masters-section-head mb-3">
              <div>
                <h2 className="h6 mb-1">
                  {selectedCategoryMeta ? (
                    <>
                      <i className={`bi ${categoryIcon(selectedCategoryMeta.code)} me-2 text-primary`} aria-hidden />
                      {selectedCategoryMeta.name}
                    </>
                  ) : (
                    'All property types'
                  )}
                </h2>
                <p className="small text-secondary mb-0">
                  {selectedCategoryMeta?.description || 'Types shown in property and project forms.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={openTypeModal}
                disabled={!selectedCategory}
                title={!selectedCategory ? 'Select a category first' : 'Add property type'}
              >
                <i className="bi bi-plus-lg me-1" aria-hidden />
                Add type
              </button>
            </div>

            <div className="row g-2 align-items-center mb-3">
              <div className="col-md-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><i className="bi bi-search" aria-hidden /></span>
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search types by name or code…"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-6 text-md-end">
                <small className="text-secondary">
                  {filteredTypes.length} of {selectedCategory ? (typeCountByCategory[selectedCategory] || 0) : types.length} types
                </small>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : filteredTypes.length === 0 ? (
              <div className="masters-empty-state">
                <i className="bi bi-layers" aria-hidden />
                <p className="mb-1 fw-semibold">
                  {types.length === 0 ? 'No property types yet' : 'No types match your filters'}
                </p>
                <p className="small text-secondary mb-3">
                  {selectedCategory
                    ? 'Add types under this category for builders and agents to use.'
                    : 'Select a category on the left, then add property types.'}
                </p>
                {selectedCategory && (
                  <button type="button" className="btn btn-sm btn-primary" onClick={openTypeModal}>
                    Add first type
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 masters-types-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Code</th>
                      {!selectedCategory && <th>Category</th>}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTypes.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="masters-type-icon" aria-hidden>
                              <i className="bi bi-house" />
                            </span>
                            <span className="fw-medium">{t.name}</span>
                          </div>
                        </td>
                        <td><code className="masters-code">{t.code}</code></td>
                        {!selectedCategory && (
                          <td>
                            <span className="badge text-bg-light border">{t.categoryName}</span>
                          </td>
                        )}
                        <td>
                          <span className={`badge ${t.isActive !== false ? 'text-bg-success' : 'text-bg-light border'}`}>
                            {t.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {showCatModal && (
        <Modal title="Add category" onClose={() => !savingCat && setShowCatModal(false)} saving={savingCat}>
          <form onSubmit={submitCategory}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="cat-code">Code</label>
                <input
                  id="cat-code"
                  className="form-control"
                  required
                  autoFocus
                  placeholder="residential"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                />
                <div className="form-text">Lowercase identifier, e.g. <code>commercial</code></div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="cat-name">Name</label>
                <input
                  id="cat-name"
                  className="form-control"
                  required
                  placeholder="Residential"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                />
              </div>
              <div className="mb-0">
                <label className="form-label" htmlFor="cat-desc">Description <span className="text-secondary fw-normal">(optional)</span></label>
                <textarea
                  id="cat-desc"
                  className="form-control"
                  rows={2}
                  placeholder="Homes, apartments, villas…"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCatModal(false)} disabled={savingCat}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingCat}>
                {savingCat ? 'Saving…' : 'Save category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showTypeModal && (
        <Modal title={`Add type — ${selectedCategoryMeta?.name || 'Category'}`} onClose={() => !savingType && setShowTypeModal(false)} saving={savingType}>
          <form onSubmit={submitType}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="type-code">Code</label>
                <input
                  id="type-code"
                  className="form-control"
                  required
                  autoFocus
                  placeholder="apartment"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                />
              </div>
              <div className="mb-0">
                <label className="form-label" htmlFor="type-name">Name</label>
                <input
                  id="type-name"
                  className="form-control"
                  required
                  placeholder="Apartment"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowTypeModal(false)} disabled={savingType}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingType}>
                {savingType ? 'Saving…' : 'Save type'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
