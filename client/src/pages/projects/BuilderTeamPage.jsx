import { useEffect, useState } from 'react';
import { builderService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function BuilderTeamPage() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', roleTitle: '' });

  const load = async () => {
    const { data } = await builderService.listTeam();
    setMembers(data.data.members);
  };

  useEffect(() => {
    load().catch((err) => toast.apiError(err, 'Failed to load'));
  }, [toast]);

  const add = async (e) => {
    e.preventDefault();
    try {
      const { data } = await builderService.addTeam(form);
      setMembers(data.data.members);
      setForm({ name: '', email: '', phone: '', roleTitle: '' });
      toast.success('Team member added');
    } catch (err) {
      toast.apiError(err, 'Add failed');
    }
  };

  const remove = async (id) => {
    const { data } = await builderService.removeTeam(id);
    setMembers(data.data.members);
  };

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <form className="panel-card" onSubmit={add}>
          <h2 className="h6 mb-3">Add team member</h2>
          <input className="form-control mb-2" placeholder="Name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="form-control mb-2" type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="form-control mb-2" placeholder="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="form-control mb-2" placeholder="Role title" value={form.roleTitle}
            onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} />
          <button className="btn btn-primary w-100" type="submit">Add</button>
        </form>
      </div>
      <div className="col-lg-8">
        <div className="panel-card">
          <h2 className="h6 mb-3">Team</h2>
          {members.map((m) => (
            <div key={m.id} className="d-flex justify-content-between border-bottom py-2">
              <div>
                <strong>{m.name}</strong>
                <div className="small text-secondary">{m.roleTitle || '—'} · {m.email || m.phone || ''}</div>
              </div>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(m.id)}>
                Remove
              </button>
            </div>
          ))}
          {!members.length && <div className="text-secondary">No team members yet</div>}
        </div>
      </div>
    </div>
  );
}
