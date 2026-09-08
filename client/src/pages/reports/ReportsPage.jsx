import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { reportService } from '../../services';
import { useToast } from '../../hooks/useToast';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ReportsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService
      .overview()
      .then((res) => setData(res.data.data))
      .catch((err) => {
        toast.apiError(err, 'Failed to load reports');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }
  if (loadFailed || !data) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load reports.</p>;
  }

  const kpiEntries = Object.entries(data.kpis || {});
  const statusChart = data.propertiesByStatus
    ? {
        labels: data.propertiesByStatus.map((s) => s.status),
        datasets: [{
          data: data.propertiesByStatus.map((s) => s.total),
          backgroundColor: ['#5d519b', '#433b6b', '#2d235f', '#7a6eb8', '#9b91cc', '#d4cfeb'],
        }],
      }
    : null;

  const leadsChart = data.leadsByStatus
    ? {
        labels: data.leadsByStatus.map((s) => s.status),
        datasets: [{
          label: 'Leads',
          data: data.leadsByStatus.map((s) => s.total),
          backgroundColor: '#5d519b',
        }],
      }
    : null;

  return (
    <div>
      <div className="row g-3 mb-3">
        {kpiEntries.map(([key, value]) => (
          <div className="col-6 col-md-4 col-xl-3" key={key}>
            <div className="stat-card">
              <div className="stat-label">{key.replace(/([A-Z])/g, ' $1')}</div>
              <div className="stat-value">{value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="row g-3">
        {statusChart && (
          <div className="col-md-6">
            <div className="panel-card">
              <h2 className="h6 mb-3">Properties by status</h2>
              <Doughnut data={statusChart} />
            </div>
          </div>
        )}
        {leadsChart && (
          <div className="col-md-6">
            <div className="panel-card">
              <h2 className="h6 mb-3">Leads by status</h2>
              <Bar data={leadsChart} options={{ plugins: { legend: { display: false } } }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
