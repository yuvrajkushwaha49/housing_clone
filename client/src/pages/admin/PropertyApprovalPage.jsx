import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { leadService, propertyService } from '../../services';
import { formatPropertyPrice } from '../../components/properties/propertyUtils';
import { useToast } from '../../hooks/useToast';

export default function PropertyApprovalPage() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const projectsPath = user?.role?.code === 'SUPER_ADMIN'
    ? '/panel/super-admin/projects'
    : '/panel/admin/projects';
  const propertiesPath = user?.role?.code === 'SUPER_ADMIN'
    ? '/panel/super-admin/properties'
    : '/panel/admin/properties';
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        leadService.approvalStats(),
        propertyService.adminList({ status: 'pending', limit: 50 }),
      ]);
      setStats(statsRes.data.data);
      setItems(listRes.data.data);
    } catch (err) {
      toast.apiError(err, 'Failed to load queue');
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load approval queue.</p>;
  }

  return (
    <div>
      {stats?.pendingProjects > 0 && (
        <div className="alert alert-info py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>{stats.pendingProjects} project(s) waiting for approval</span>
          <Link className="btn btn-sm btn-outline-primary" to={projectsPath}>Review projects</Link>
        </div>
      )}

      {stats && (
        <div className="row g-3 mb-3">
          {[
            ['Pending properties', stats.pendingProperties],
            ['Pending projects', stats.pendingProjects],
            ['Total pending approvals', (stats.pendingProperties || 0) + (stats.pendingProjects || 0)],
            ['New leads', stats.newLeads],
            ['Visit requests', stats.visitRequests],
            ['New inquiries', stats.newInquiries],
          ].map(([label, value]) => (
            <div className="col-6 col-md" key={label}>
              <div className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel-card">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h2 className="h5 mb-0">Pending property approvals ({items.length})</h2>
          <Link className="btn btn-sm btn-outline-secondary" to={propertiesPath}>
            All properties
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-secondary mb-0">No properties waiting for review.</p>
        ) : (
          <div className="list-group list-group-flush">
            {items.map((p) => (
              <Link
                key={p.id}
                to={`${propertiesPath}/${p.id}/review`}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                <div>
                  <div className="fw-semibold">{p.title}</div>
                  <small className="text-secondary">
                    {p.city?.name} · {formatPropertyPrice(p.price)}
                  </small>
                </div>
                <span className="badge text-bg-warning">Review</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
