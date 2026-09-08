import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supportService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function TicketsPage({ staff = false }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { subject: '', category: 'other', priority: 'medium', message: '' },
  });

  const load = async (page = 1) => {
    try {
      const { data } = await supportService.listTickets({
        page,
        status: status || undefined,
      });
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      toast.apiError(err, 'Failed to load tickets');
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (values) => {
    try {
      const { data } = await supportService.createTicket(values);
      reset();
      setShowForm(false);
      navigate(`${data.data.id}`);
    } catch (err) {
      toast.apiError(err, 'Create failed');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <form
          className="d-flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(1);
          }}
        >
          <select className="form-select" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button className="btn btn-outline-secondary" type="submit">Filter</button>
        </form>
        {!staff && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            New ticket
          </button>
        )}
      </div>

      {showForm && (
        <form className="panel-card mb-3" onSubmit={handleSubmit(onCreate)}>
          <h2 className="h6 mb-3">Create support ticket</h2>
          <input className="form-control mb-2" placeholder="Subject" {...register('subject', { required: true })} />
          <div className="row g-2 mb-2">
            <div className="col-md-6">
              <select className="form-select" {...register('category')}>
                <option value="account">Account</option>
                <option value="listing">Listing</option>
                <option value="payment">Payment</option>
                <option value="technical">Technical</option>
                <option value="complaint">Complaint</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-6">
              <select className="form-select" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <textarea className="form-control mb-2" rows={4} placeholder="Describe your issue" {...register('message', { required: true, minLength: 10 })} />
          <button className="btn btn-primary" type="submit">Submit ticket</button>
        </form>
      )}

      <div className="panel-card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                {staff && <th>User</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td><code>{t.ticketNumber}</code></td>
                  <td>{t.subject}</td>
                  <td>{t.priority}</td>
                  <td><span className="badge text-bg-light border">{t.status}</span></td>
                  {staff && <td>{t.user?.name}</td>}
                  <td className="text-end">
                    <Link className="btn btn-sm btn-outline-primary" to={t.id}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
