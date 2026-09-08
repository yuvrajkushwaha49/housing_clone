import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mediaUrl, propertyService } from '../../services';
import { useToast } from '../../hooks/useToast';

const FIELDS = [
  { key: 'price', label: 'Price', format: (p) => `₹${Number(p.price).toLocaleString('en-IN')}` },
  { key: 'purpose', label: 'Purpose', format: (p) => p.purpose?.toUpperCase() },
  { key: 'type', label: 'Type', format: (p) => p.propertyType?.name || '—' },
  { key: 'area', label: 'Area', format: (p) => `${p.area} ${p.areaUnit?.name || ''}` },
  { key: 'beds', label: 'Bedrooms', format: (p) => p.bedrooms ?? '—' },
  { key: 'baths', label: 'Bathrooms', format: (p) => p.bathrooms ?? '—' },
  { key: 'parking', label: 'Parking', format: (p) => p.parking ?? '—' },
  { key: 'furnishing', label: 'Furnishing', format: (p) => p.furnishing?.name || '—' },
  { key: 'city', label: 'City', format: (p) => p.city?.name || '—' },
  { key: 'locality', label: 'Locality', format: (p) => p.locality?.name || '—' },
  { key: 'lister', label: 'Listed by', format: (p) => p.listedBy?.name || '—' },
];

export default function ComparePage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, max: 4 });

  const load = async () => {
    const { data } = await propertyService.compareList();
    setItems(data.data);
    setMeta(data.meta || { total: data.data.length, max: 4 });
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load compare list'));
  }, [toast]);

  const remove = async (id) => {
    const { data } = await propertyService.removeCompare(id);
    setItems(data.data);
    setMeta(data.meta || { total: data.data.length, max: 4 });
  };

  const clear = async () => {
    await propertyService.clearCompare();
    setItems([]);
    setMeta({ total: 0, max: 4 });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-secondary small">
          Comparing {meta.total} / {meta.max} properties
        </div>
        {items.length > 0 && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="panel-card">
          <p className="mb-2">No properties in compare yet.</p>
          <Link to="/search" className="btn btn-primary btn-sm">Search properties</Link>
        </div>
      ) : (
        <div className="panel-card overflow-auto">
          <table className="table align-middle mb-0 compare-table">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Feature</th>
                {items.map((p) => (
                  <th key={p.id} style={{ minWidth: 200 }}>
                    <div
                      style={{
                        height: 100,
                        borderRadius: 8,
                        marginBottom: 8,
                        background: p.primaryImageUrl || p.media?.[0]
                          ? `center/cover url(${mediaUrl(p.primaryImageUrl || p.media[0].url)})`
                          : 'linear-gradient(135deg,#2d235f,#5d519b)',
                      }}
                    />
                    <Link to={`/property/${p.slug}`}>{p.title}</Link>
                    <div className="mt-2">
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(p.id)}>
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.key}>
                  <th className="small text-secondary">{f.label}</th>
                  {items.map((p) => (
                    <td key={p.id}>{f.format(p)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className="small text-secondary">Amenities</th>
                {items.map((p) => (
                  <td key={p.id} className="small">
                    {(p.amenities || []).slice(0, 6).map((a) => a.name).join(', ') || '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
