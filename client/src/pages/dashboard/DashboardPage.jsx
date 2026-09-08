import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { dashboardService, leadService } from '../../services';
import { ROLE_CODES } from '../../constants';
import { useToast } from '../../hooks/useToast';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function KpiCard({ label, value, hint }) {
  return (
    <div className="col-6 col-xl-4">
      <div className="stat-card">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);
  const isSuperAdmin = user?.role?.code === ROLE_CODES.SUPER_ADMIN;
  const isBuilder = user?.role?.code === ROLE_CODES.BUILDER;
  const [data, setData] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dashboardService
      .getStats()
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch((err) => {
        if (mounted) {
          toast.apiError(err, 'Failed to load dashboard');
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let mounted = true;
    leadService
      .approvalStats()
      .then((res) => {
        if (mounted) setQueueStats(res.data.data);
      })
      .catch(() => {
        if (mounted) setQueueStats(null);
      });
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="row g-3">
        {[1, 2, 3, 4].map((i) => (
          <div className="col-6 col-xl-3" key={i}>
            <div className="stat-card placeholder-glow">
              <span className="placeholder col-6" />
              <span className="placeholder col-4 d-block mt-2" style={{ height: 28 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loadFailed || !data) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load dashboard.</p>;
  }

  const roleChart = {
    labels: data.usersByRole.map((r) => r.roleName),
    datasets: [
      {
        data: data.usersByRole.map((r) => r.total),
        backgroundColor: ['#5d519b', '#433b6b', '#2d235f', '#7a6eb8', '#9b91cc', '#b8b0db', '#d4cfeb', '#eeeaf8'],
      },
    ],
  };

  const statusChart = {
    labels: data.usersByStatus.map((s) => s.status),
    datasets: [
      {
        label: 'Users',
        data: data.usersByStatus.map((s) => s.total),
        backgroundColor: '#5d519b',
      },
    ],
  };

  return (
    <div className="dashboard">
      {isBuilder && (
        <div className="panel-card mb-4">
          <h2 className="h6 mb-3">Quick actions</h2>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/panel/builder/projects/new" className="btn btn-primary">
              <i className="bi bi-buildings me-1" aria-hidden />
              New project
            </Link>
            <Link to="/panel/builder/plots/new" className="btn btn-outline-primary">
              <i className="bi bi-map me-1" aria-hidden />
              Add plot
            </Link>
            <Link to="/panel/builder/plots" className="btn btn-outline-secondary">
              My plots
            </Link>
            <Link to="/panel/builder/properties" className="btn btn-outline-secondary">
              My properties
            </Link>
          </div>
        </div>
      )}

      {isSuperAdmin && queueStats && (
        <div className="admin-review-queue mb-4">
          <h2 className="h6 mb-3">Pending reviews</h2>
          <div className="row g-3">
            {(queueStats.pendingProperties > 0 || queueStats.pendingProjects > 0) && (
              <div className="col-md-6 col-xl-4">
                <Link to="/panel/super-admin/approvals" className="admin-queue-card">
                  <span className="admin-queue-card-icon is-warning">
                    <i className="bi bi-check2-square" />
                  </span>
                  <div>
                    <div className="admin-queue-card-label">Property & project approvals</div>
                    <div className="admin-queue-card-value">
                      {(queueStats.pendingProperties || 0) + (queueStats.pendingProjects || 0)}
                    </div>
                  </div>
                </Link>
              </div>
            )}
            {queueStats.pendingBuilderProfileChanges > 0 && (
              <div className="col-md-6 col-xl-4">
                <Link to="/panel/super-admin/builder-profiles" className="admin-queue-card">
                  <span className="admin-queue-card-icon is-info">
                    <i className="bi bi-building-check" />
                  </span>
                  <div>
                    <div className="admin-queue-card-label">Profile updates under review</div>
                    <div className="admin-queue-card-value">{queueStats.pendingBuilderProfileChanges}</div>
                  </div>
                </Link>
              </div>
            )}
            {queueStats.pendingVerification > 0 && (
              <div className="col-md-6 col-xl-4">
                <Link to="/panel/super-admin/verifications" className="admin-queue-card">
                  <span className="admin-queue-card-icon is-primary">
                    <i className="bi bi-person-check" />
                  </span>
                  <div>
                    <div className="admin-queue-card-label">Profile verifications</div>
                    <div className="admin-queue-card-value">{queueStats.pendingVerification}</div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <KpiCard label="Total users" value={data.kpis.totalUsers} />
        <KpiCard label="Active users" value={data.kpis.activeUsers} />
        <KpiCard label="New (7 days)" value={data.kpis.newUsersWeek} />
        <KpiCard label="Roles" value={data.kpis.totalRoles} />
        <KpiCard label="Permissions" value={data.kpis.totalPermissions} />
        <KpiCard label="Activity (24h)" value={data.kpis.activityLast24h} />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="panel-card h-100">
            <h2 className="h6 mb-3">Users by role</h2>
            <div style={{ maxWidth: 280, margin: '0 auto' }}>
              <Doughnut data={roleChart} options={{ plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="panel-card h-100">
            <h2 className="h6 mb-3">Users by status</h2>
            <Bar
              data={statusChart}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="panel-card">
        <h2 className="h6 mb-3">Recent activity</h2>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>User</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-secondary">No activity yet</td>
                </tr>
              )}
              {data.recentActivity.map((row) => (
                <tr key={row.id}>
                  <td><code className="small">{row.activityType}</code></td>
                  <td>{row.description}</td>
                  <td>{row.userEmail || '—'}</td>
                  <td className="text-secondary small">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
