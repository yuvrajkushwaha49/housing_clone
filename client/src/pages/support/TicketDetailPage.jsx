import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supportService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function TicketDetailPage() {
  const toast = useToast();
  const { uuid } = useParams();
  const { user } = useSelector((s) => s.auth);
  const isStaff = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role?.code);
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    const { data } = await supportService.getTicket(uuid);
    setTicket(data.data);
  };

  useEffect(() => {
    load().catch((err) => {
      toast.apiError(err, 'Failed to load');
      setLoadFailed(true);
    });
  }, [uuid, toast]);

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const { data } = await supportService.addMessage(uuid, { message });
      setTicket(data.data);
      setMessage('');
    } catch (err) {
      toast.apiError(err, 'Send failed');
    }
  };

  const update = async (payload) => {
    try {
      const { data } = await supportService.updateTicket(uuid, payload);
      setTicket(data.data);
      toast.success('Ticket updated');
    } catch (err) {
      toast.apiError(err, 'Update failed');
    }
  };

  if (!ticket && !loadFailed) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return (
      <div>
        <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Tickets</Link>
        <p className="text-secondary">Could not load this ticket.</p>
      </div>
    );
  }

  return (
    <div>
      <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Tickets</Link>
      {ticket && (
        <div className="row g-3">
          <div className="col-lg-8">
            <div className="panel-card mb-3">
              <div className="d-flex justify-content-between">
                <div>
                  <h1 className="h5 mb-1">{ticket.subject}</h1>
                  <code>{ticket.ticketNumber}</code>
                </div>
                <span className="badge text-bg-light border align-self-start">{ticket.status}</span>
              </div>
            </div>
            <div className="panel-card mb-3" style={{ maxHeight: 420, overflow: 'auto' }}>
              {ticket.messages.map((m) => (
                <div key={m.id} className="border-bottom py-2">
                  <div className="small fw-semibold">
                    {m.sender.name}
                    {m.isInternal && <span className="badge text-bg-warning ms-2">Internal</span>}
                  </div>
                  <div>{m.message}</div>
                  <small className="text-secondary">{new Date(m.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
            {!['resolved', 'closed'].includes(ticket.status) && (
              <form className="panel-card" onSubmit={send}>
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Reply"
                />
                <button className="btn btn-primary" type="submit">Send reply</button>
              </form>
            )}
          </div>
          <div className="col-lg-4">
            <div className="panel-card">
              <div className="small mb-2"><strong>Category:</strong> {ticket.category}</div>
              <div className="small mb-2"><strong>Priority:</strong> {ticket.priority}</div>
              <div className="small mb-2"><strong>User:</strong> {ticket.user.name}</div>
              <div className="small mb-3"><strong>Assignee:</strong> {ticket.assignee?.name || 'Unassigned'}</div>
              {isStaff && (
                <div className="d-grid gap-2">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => update({ assignToMe: true, status: 'in_progress' })}>
                    Assign to me
                  </button>
                  <button type="button" className="btn btn-sm btn-success" onClick={() => update({ status: 'resolved' })}>
                    Mark resolved
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => update({ status: 'closed' })}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
