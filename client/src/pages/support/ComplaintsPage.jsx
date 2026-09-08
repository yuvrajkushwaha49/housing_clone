import { useEffect, useState } from 'react';
import { supportService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function ComplaintsPage({ staff = false }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    againstType: 'property',
    subject: '',
    description: '',
  });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { data } = await supportService.listComplaints({});
    setItems(data.data);
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load'));
  }, [toast]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await supportService.createComplaint(form);
      setForm({ againstType: 'property', subject: '', description: '' });
      setShowForm(false);
      toast.success('Complaint submitted');
      await load();
    } catch (err) {
      toast.apiError(err, 'Submit failed');
    }
  };

  return (
    <div>
      {!staff && (
        <div className="mb-3 text-end">
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            File complaint
          </button>
        </div>
      )}
      {showForm && (
        <form className="panel-card mb-3" onSubmit={submit}>
          <h2 className="h6 mb-3">File a complaint</h2>
          <select
            className="form-select mb-2"
            value={form.againstType}
            onChange={(e) => setForm({ ...form, againstType: e.target.value })}
          >
            <option value="property">Property</option>
            <option value="user">User</option>
            <option value="other">Other</option>
          </select>
          <input
            className="form-control mb-2"
            placeholder="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <textarea
            className="form-control mb-2"
            rows={4}
            placeholder="Description"
            required
            minLength={10}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button className="btn btn-primary" type="submit">Submit</button>
        </form>
      )}
      <div className="panel-card">
        <h2 className="h6 mb-3">{staff ? 'All complaints' : 'My complaints'}</h2>
        {items.length === 0 && <div className="text-secondary">No complaints</div>}
        {items.map((c) => (
          <div key={c.id || c.uuid} className="border-bottom py-3">
            <div className="d-flex justify-content-between">
              <strong>{c.subject}</strong>
              <span className="badge text-bg-light border">{c.status}</span>
            </div>
            <div className="small text-secondary text-capitalize">{c.againstType}</div>
            <p className="mb-0 small">{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
