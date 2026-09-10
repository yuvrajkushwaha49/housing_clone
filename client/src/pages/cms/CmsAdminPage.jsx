import { useEffect, useMemo, useState } from 'react';
import { cmsService, mediaUrl } from '../../services';
import { useToast } from '../../hooks/useToast';

const TABS = [
  {
    id: 'pages',
    label: 'Pages',
    icon: 'bi-file-earmark-text',
    hint: 'Static pages like About, Privacy, Terms',
    singular: 'page',
  },
  {
    id: 'blogs',
    label: 'Blogs / Guides',
    icon: 'bi-journal-richtext',
    hint: 'Home “News & Guides” and /blog articles',
    singular: 'blog',
  },
  {
    id: 'news',
    label: 'News',
    icon: 'bi-newspaper',
    hint: 'Market news and announcements',
    singular: 'news item',
  },
  {
    id: 'banners',
    label: 'Banners',
    icon: 'bi-image',
    hint: 'Promotional banners and placements',
    singular: 'banner',
  },
];

const EMPTY_FORM = {
  title: '',
  slug: '',
  body: '',
  excerpt: '',
  status: 'published',
  pageType: 'static',
  position: 'home_top',
  linkUrl: '',
};

function statusTone(item) {
  if (item.status === 'published' || item.isActive) return 'success';
  if (item.status === 'draft') return 'warning';
  return 'secondary';
}

function statusLabel(item) {
  if (item.status) return item.status;
  return item.isActive ? 'active' : 'off';
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CmsAdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('blogs');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [removeCover, setRemoveCover] = useState(false);

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];
  const supportsCover = tab === 'blogs' || tab === 'news';
  const isEditing = Boolean(editingId);

  const clearCoverSelection = () => {
    setCoverFile(null);
    setCoverPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return '';
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setRemoveCover(false);
    clearCoverSelection();
  };

  const load = async (nextTab = tab) => {
    setLoading(true);
    try {
      let res;
      if (nextTab === 'pages') res = await cmsService.adminListPages();
      else if (nextTab === 'blogs') res = await cmsService.adminListBlogs();
      else if (nextTab === 'news') res = await cmsService.adminListNews();
      else res = await cmsService.adminListBanners();
      setItems(res.data.data || []);
    } catch (err) {
      setItems([]);
      toast.apiError(err, 'Failed to load CMS content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    resetForm();
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => () => {
    if (coverPreview && coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview);
    }
  }, [coverPreview]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.slug,
        item.excerpt,
        item.position,
        item.linkUrl,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const counts = useMemo(() => {
    const published = items.filter((i) => i.status === 'published' || i.isActive).length;
    const drafts = items.filter((i) => i.status === 'draft').length;
    return { total: items.length, published, drafts };
  }, [items]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const onCoverChange = (e) => {
    const file = e.target.files?.[0] || null;
    setRemoveCover(false);
    setCoverPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : '';
    });
    setCoverFile(file);
  };

  const clearCover = () => {
    clearCoverSelection();
    if (isEditing) setRemoveCover(true);
    else setRemoveCover(false);
  };

  const startEdit = (item) => {
    if (!supportsCover) return;
    setEditingId(item.id);
    setRemoveCover(false);
    setCoverFile(null);
    setCoverPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return item.coverImage ? mediaUrl(item.coverImage) : '';
    });
    setForm({
      ...EMPTY_FORM,
      title: item.title || '',
      slug: item.slug || '',
      excerpt: item.excerpt || '',
      body: item.body || '',
      status: item.status || 'draft',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (tab === 'pages') {
        await cmsService.adminSavePage({
          title: form.title,
          slug: form.slug || undefined,
          body: form.body,
          status: form.status,
          pageType: form.pageType,
        });
      } else if (tab === 'blogs' || tab === 'news') {
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.slug) fd.append('slug', form.slug);
        fd.append('excerpt', form.excerpt || '');
        fd.append('body', form.body);
        fd.append('status', form.status);
        if (coverFile) fd.append('coverImage', coverFile);
        else if (removeCover) fd.append('removeCover', '1');
        if (tab === 'blogs') await cmsService.adminSaveBlog(fd, editingId || undefined);
        else await cmsService.adminSaveNews(fd, editingId || undefined);
      } else {
        await cmsService.adminSaveBanner({
          title: form.title,
          linkUrl: form.linkUrl,
          position: form.position,
          isActive: true,
        });
      }
      const label = `${activeTab.singular[0].toUpperCase()}${activeTab.singular.slice(1)}`;
      toast.success(isEditing ? `${label} updated` : `${label} saved`);
      resetForm();
      await load(tab);
    } catch (err) {
      toast.apiError(err, isEditing ? 'Update failed' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    if (!supportsCover || deletingId) return;
    const ok = window.confirm(`Delete “${item.title}”? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(item.id);
    try {
      if (tab === 'blogs') await cmsService.adminDeleteBlog(item.id);
      else await cmsService.adminDeleteNews(item.id);
      if (editingId === item.id) resetForm();
      toast.success('Deleted');
      await load(tab);
    } catch (err) {
      toast.apiError(err, 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="cms-admin">
      <div className="cms-admin-header">
        <div>
          <h1 className="cms-admin-title">CMS</h1>
          <p className="cms-admin-subtitle mb-0">
            Manage pages, News &amp; Guides, news posts, and banners for the public site.
          </p>
        </div>
        <div className="cms-admin-stats">
          <div className="cms-admin-stat">
            <span className="cms-admin-stat-value">{counts.total}</span>
            <span className="cms-admin-stat-label">Total</span>
          </div>
          <div className="cms-admin-stat">
            <span className="cms-admin-stat-value">{counts.published}</span>
            <span className="cms-admin-stat-label">Live</span>
          </div>
          <div className="cms-admin-stat">
            <span className="cms-admin-stat-value">{counts.drafts}</span>
            <span className="cms-admin-stat-label">Drafts</span>
          </div>
        </div>
      </div>

      <div className="cms-admin-tabs" role="tablist" aria-label="CMS sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`cms-admin-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <i className={`bi ${item.icon}`} aria-hidden />
            <span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="row g-3 align-items-start">
        <div className="col-xl-5">
          <form className="panel-card cms-admin-form" onSubmit={save}>
            <div className="cms-admin-panel-head">
              <div>
                <h2 className="h6 mb-1">
                  {isEditing ? `Edit ${activeTab.singular}` : `Add ${activeTab.singular}`}
                </h2>
                <p className="small text-secondary mb-0">{activeTab.hint}</p>
              </div>
              <span className="cms-admin-panel-badge">
                <i className={`bi ${activeTab.icon}`} aria-hidden />
                {activeTab.label}
              </span>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="cms-title">Title</label>
              <input
                id="cms-title"
                className="form-control"
                placeholder={`Enter ${activeTab.singular} title`}
                required
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
              />
            </div>

            {tab !== 'banners' ? (
              <>
                <div className="mb-3">
                  <label className="form-label" htmlFor="cms-slug">Slug</label>
                  <input
                    id="cms-slug"
                    className="form-control"
                    placeholder="optional-url-slug"
                    value={form.slug}
                    onChange={(e) => updateForm({ slug: e.target.value })}
                  />
                  <div className="form-text">Leave blank to auto-generate from title.</div>
                </div>

                {tab === 'pages' && (
                  <div className="mb-3">
                    <label className="form-label" htmlFor="cms-page-type">Page type</label>
                    <select
                      id="cms-page-type"
                      className="form-select"
                      value={form.pageType}
                      onChange={(e) => updateForm({ pageType: e.target.value })}
                    >
                      <option value="static">Static</option>
                      <option value="city">City</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                )}

                {supportsCover && (
                  <>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="cms-excerpt">Excerpt</label>
                      <textarea
                        id="cms-excerpt"
                        className="form-control"
                        rows={2}
                        placeholder="Short summary shown in lists and cards"
                        value={form.excerpt}
                        onChange={(e) => updateForm({ excerpt: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="cms-cover">Cover image</label>
                      <input
                        id="cms-cover"
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
                        className="form-control"
                        onChange={onCoverChange}
                      />
                      <div className="form-text">
                        {isEditing
                          ? 'Upload a new image to replace the current cover, or remove it.'
                          : 'Shown on home News & Guides, /blog cards, and the article page. JPEG or PNG.'}
                      </div>
                      {coverPreview && (
                        <div className="cms-admin-cover-preview">
                          <img src={coverPreview} alt="Cover preview" />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={clearCover}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="form-label" htmlFor="cms-body">Body</label>
                  <textarea
                    id="cms-body"
                    className="form-control cms-admin-body"
                    rows={8}
                    placeholder="Write content here. HTML is allowed."
                    required
                    value={form.body}
                    onChange={(e) => updateForm({ body: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="cms-status">Status</label>
                  <select
                    id="cms-status"
                    className="form-select"
                    value={form.status}
                    onChange={(e) => updateForm({ status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <div className="form-text">
                    Only published items appear on the public website.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="form-label" htmlFor="cms-link">Link URL</label>
                  <input
                    id="cms-link"
                    className="form-control"
                    placeholder="https://..."
                    value={form.linkUrl}
                    onChange={(e) => updateForm({ linkUrl: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="cms-position">Position</label>
                  <input
                    id="cms-position"
                    className="form-control"
                    placeholder="home_top"
                    value={form.position}
                    onChange={(e) => updateForm({ position: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-primary flex-grow-1" type="submit" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : isEditing
                    ? `Update ${activeTab.singular}`
                    : `Save ${activeTab.singular}`}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={saving}
                onClick={resetForm}
              >
                {isEditing ? 'Cancel' : 'Clear'}
              </button>
            </div>
          </form>
        </div>

        <div className="col-xl-7">
          <div className="panel-card cms-admin-list">
            <div className="cms-admin-list-head">
              <div>
                <h2 className="h6 mb-1">{activeTab.label}</h2>
                <p className="small text-secondary mb-0">
                  {loading ? 'Loading…' : `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="cms-admin-search">
                <i className="bi bi-search" aria-hidden />
                <input
                  type="search"
                  className="form-control"
                  placeholder={`Search ${activeTab.label.toLowerCase()}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="cms-admin-empty">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading…</span>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="cms-admin-empty">
                <i className={`bi ${activeTab.icon}`} aria-hidden />
                <h3 className="h6 mb-1">No {activeTab.label.toLowerCase()} yet</h3>
                <p className="small text-secondary mb-0">
                  {search.trim()
                    ? 'No results match your search.'
                    : `Use the form to add your first ${activeTab.singular}.`}
                </p>
              </div>
            ) : (
              <div className="cms-admin-items">
                {filteredItems.map((item) => {
                  const thumb = item.coverImage || item.imageUrl;
                  return (
                    <article
                      key={item.id}
                      className={`cms-admin-item${editingId === item.id ? ' is-editing' : ''}`}
                    >
                      <div className="cms-admin-item-main">
                        {thumb ? (
                          <img
                            className="cms-admin-item-thumb"
                            src={mediaUrl(thumb)}
                            alt=""
                          />
                        ) : (
                          <div className="cms-admin-item-icon" aria-hidden>
                            <i className={`bi ${activeTab.icon}`} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="cms-admin-item-title">{item.title}</h3>
                          <p className="cms-admin-item-meta mb-0">
                            {item.slug || item.position || item.linkUrl || '—'}
                            {item.publishedAt || item.createdAt
                              ? ` · ${formatDate(item.publishedAt || item.createdAt)}`
                              : ''}
                          </p>
                          {item.excerpt && (
                            <p className="cms-admin-item-excerpt mb-0">{item.excerpt}</p>
                          )}
                        </div>
                      </div>
                      <div className="cms-admin-item-side">
                        <span className={`cms-admin-status is-${statusTone(item)}`}>
                          {statusLabel(item)}
                        </span>
                        {supportsCover && (
                          <div className="cms-admin-item-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => startEdit(item)}
                              disabled={saving || deletingId === item.id}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem(item)}
                              disabled={saving || deletingId === item.id}
                            >
                              {deletingId === item.id ? '…' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
