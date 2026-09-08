import { useEffect, useState } from 'react';
import { cmsService } from '../../services';
import { useToast } from '../../hooks/useToast';

const TABS = ['pages', 'blogs', 'news', 'banners'];

export default function CmsAdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('pages');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    body: '',
    excerpt: '',
    status: 'published',
    pageType: 'static',
    position: 'home_top',
    linkUrl: '',
  });

  const load = async () => {
    let res;
    if (tab === 'pages') res = await cmsService.adminListPages();
    else if (tab === 'blogs') res = await cmsService.adminListBlogs();
    else if (tab === 'news') res = await cmsService.adminListNews();
    else res = await cmsService.adminListBanners();
    setItems(res.data.data);
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load'));
  }, [tab, toast]);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (tab === 'pages') {
        await cmsService.adminSavePage({
          title: form.title,
          slug: form.slug || undefined,
          body: form.body,
          status: form.status,
          pageType: form.pageType,
        });
      } else if (tab === 'blogs') {
        await cmsService.adminSaveBlog({
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt,
          body: form.body,
          status: form.status,
        });
      } else if (tab === 'news') {
        await cmsService.adminSaveNews({
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt,
          body: form.body,
          status: form.status,
        });
      } else {
        await cmsService.adminSaveBanner({
          title: form.title,
          linkUrl: form.linkUrl,
          position: form.position,
          isActive: true,
        });
      }
      setForm({
        title: '',
        slug: '',
        body: '',
        excerpt: '',
        status: 'published',
        pageType: 'static',
        position: 'home_top',
        linkUrl: '',
      });
      toast.success('Saved');
      await load();
    } catch (err) {
      toast.apiError(err, 'Save failed');
    }
  };

  return (
    <div>
      <ul className="nav nav-pills mb-3 gap-1">
        {TABS.map((t) => (
          <li className="nav-item" key={t}>
            <button
              type="button"
              className={`nav-link text-capitalize ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>
      <div className="row g-3">
        <div className="col-lg-5">
          <form className="panel-card" onSubmit={save}>
            <h2 className="h6 mb-3">New {tab.slice(0, -1)}</h2>
            <input className="form-control mb-2" placeholder="Title" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {tab !== 'banners' && (
              <>
                <input className="form-control mb-2" placeholder="Slug (optional)" value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                {tab === 'pages' && (
                  <select className="form-select mb-2" value={form.pageType}
                    onChange={(e) => setForm({ ...form, pageType: e.target.value })}>
                    <option value="static">Static</option>
                    <option value="city">City</option>
                    <option value="custom">Custom</option>
                  </select>
                )}
                {(tab === 'blogs' || tab === 'news') && (
                  <input className="form-control mb-2" placeholder="Excerpt" value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                )}
                <textarea className="form-control mb-2" rows={6} placeholder="Body (HTML allowed)" required
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                <select className="form-select mb-2" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </>
            )}
            {tab === 'banners' && (
              <>
                <input className="form-control mb-2" placeholder="Link URL" value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
                <input className="form-control mb-2" placeholder="Position" value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </>
            )}
            <button className="btn btn-primary w-100" type="submit">Save</button>
          </form>
        </div>
        <div className="col-lg-7">
          <div className="panel-card">
            <h2 className="h6 mb-3 text-capitalize">{tab}</h2>
            {items.map((item) => (
              <div key={item.id} className="border-bottom py-2">
                <strong>{item.title}</strong>
                <div className="small text-secondary">
                  {item.slug || item.position} · {item.status || (item.isActive ? 'active' : 'off')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
