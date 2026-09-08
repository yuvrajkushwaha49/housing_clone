import { useEffect, useState } from 'react';
import { advertisementService, mediaUrl } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function AdvertisementsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    title: '',
    placement: 'search_sidebar',
    linkUrl: '',
    sortOrder: 0,
  });
  const [file, setFile] = useState(null);

  const load = async () => {
    const { data } = await advertisementService.adminList();
    setItems(data.data);
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load ads'));
  }, [toast]);

  const create = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('image', file);
      await advertisementService.create(fd);
      setForm({ title: '', placement: 'search_sidebar', linkUrl: '', sortOrder: 0 });
      setFile(null);
      toast.success('Advertisement created');
      await load();
    } catch (err) {
      toast.apiError(err, 'Create failed');
    }
  };

  const remove = async (id) => {
    await advertisementService.remove(id);
    await load();
  };

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <form className="panel-card" onSubmit={create}>
          <h2 className="h6 mb-3">New advertisement</h2>
          <input className="form-control mb-2" placeholder="Title" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="form-select mb-2" value={form.placement}
            onChange={(e) => setForm({ ...form, placement: e.target.value })}>
            <option value="home_hero">Home hero</option>
            <option value="search_sidebar">Search sidebar</option>
            <option value="property_detail">Property detail</option>
          </select>
          <input className="form-control mb-2" placeholder="Link URL" value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          <input type="file" accept="image/*" className="form-control mb-2"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn btn-primary w-100" type="submit">Create</button>
        </form>
      </div>
      <div className="col-lg-8">
        <div className="panel-card">
          <h2 className="h6 mb-3">Advertisements</h2>
          {items.map((ad) => (
            <div key={ad.id} className="d-flex gap-3 border-bottom py-3 align-items-center">
              {ad.imageUrl && (
                <img src={mediaUrl(ad.imageUrl)} alt="" height={56} style={{ borderRadius: 8 }} />
              )}
              <div className="flex-grow-1">
                <strong>{ad.title}</strong>
                <div className="small text-secondary">{ad.placement} · {ad.isActive ? 'active' : 'off'}</div>
                {ad.linkUrl && <a href={ad.linkUrl} className="small">{ad.linkUrl}</a>}
              </div>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(ad.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
