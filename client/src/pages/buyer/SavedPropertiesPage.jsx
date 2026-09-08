import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProjectCard from '../../components/public/ProjectCard';
import PropertyQualityBadge from '../../components/properties/PropertyQualityBadge';
import { formatPropertyPrice, isPlotProperty } from '../../components/properties/propertyUtils';
import { mediaUrl, projectService, propertyService } from '../../services';
import { useToast } from '../../hooks/useToast';

const TABS = [
  { id: 'properties', label: 'Properties' },
  { id: 'plots', label: 'Plots' },
  { id: 'projects', label: 'Projects' },
];

const SORT_OPTIONS = [
  { value: 'saved', label: 'Recently saved' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'rating_asc', label: 'Lowest rated' },
];

function SavedPropertyCard({ property }) {
  const location = [property.locality?.name, property.city?.name].filter(Boolean).join(', ');
  const thumb = property.primaryImageUrl || property.media?.[0]?.url;

  return (
    <Link to={`/property/${property.slug}`} className="panel-card d-block text-decoration-none text-reset h-100">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
        <div className="fw-semibold">{property.title}</div>
        <PropertyQualityBadge rating={property.reviewAverageRating} />
      </div>
      <div className="small text-secondary mb-2">
        {location}
        {!isPlotProperty(property) && property.bedrooms ? ` · ${property.bedrooms} BHK` : ''}
        {isPlotProperty(property) && property.area
          ? ` · ${property.area}${property.areaUnit?.name ? ` ${property.areaUnit.name}` : ''}`
          : ''}
      </div>
      <strong>{formatPropertyPrice(property.price)}</strong>
      {thumb && (
        <img
          src={mediaUrl(thumb)}
          alt=""
          className="w-100 mt-2"
          style={{ height: 140, objectFit: 'cover', borderRadius: 8 }}
        />
      )}
    </Link>
  );
}

export default function SavedPropertiesPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'properties';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sort, setSort] = useState('rating_desc');

  const setTab = (nextTab) => {
    setParams(nextTab === 'properties' ? {} : { tab: nextTab }, { replace: true });
  };

  const load = (nextTab = tab, nextSort = sort) => {
    setLoading(true);
    setLoadFailed(false);

    const request = nextTab === 'projects'
      ? projectService.wishlist()
      : propertyService.wishlist({
          kind: nextTab === 'plots' ? 'plot' : 'property',
          sort: nextSort === 'saved' ? undefined : nextSort,
        });

    request
      .then((res) => setItems(res.data.data || []))
      .catch((err) => {
        toast.apiError(err, 'Failed to load');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(tab, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSortChange = (value) => {
    setSort(value);
    if (tab !== 'projects') {
      load(tab, value);
    }
  };

  const emptyMessage = {
    properties: 'No saved properties yet.',
    plots: 'No saved plots yet.',
    projects: 'No saved projects yet.',
  }[tab];

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load saved items.</p>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h5 mb-1">Saved</h1>
          <p className="text-secondary small mb-0">Properties, plots, and projects you have saved.</p>
        </div>
        {tab !== 'projects' && (
          <select
            className="form-select form-select-sm"
            style={{ width: 180 }}
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      <ul className="nav nav-tabs saved-items-tabs mb-3">
        {TABS.map((item) => (
          <li className="nav-item" key={item.id}>
            <button
              type="button"
              className={`nav-link ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'projects' ? (
        <div className="home-project-grid">
          {items.length === 0 && <div className="text-secondary">{emptyMessage}</div>}
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="row g-3">
          {items.length === 0 && <div className="text-secondary">{emptyMessage}</div>}
          {items.map((item) => (
            <div className="col-md-6" key={item.id}>
              <SavedPropertyCard property={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
