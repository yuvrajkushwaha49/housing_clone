import { useEffect, useState } from 'react';
import { settingsService } from '../../services';
import { useToast } from '../../hooks/useToast';

const KEYS = [
  { key: 'app_name', label: 'App name', groupName: 'general' },
  { key: 'app_url', label: 'App URL', groupName: 'general' },
  { key: 'support_email', label: 'Support email', groupName: 'general' },
  { key: 'support_phone', label: 'Support phone', groupName: 'general' },
];

export default function AppSettingsPage() {
  const toast = useToast();
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsService
      .list()
      .then((res) => {
        const map = {};
        for (const row of res.data.data) map[row.key] = row.value || '';
        setValues(map);
      })
      .catch((err) => toast.apiError(err, 'Failed to load'))
      .finally(() => setLoading(false));
  }, [toast]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await settingsService.upsert(
        KEYS.map((k) => ({
          key: k.key,
          value: values[k.key] || '',
          groupName: k.groupName,
        }))
      );
      toast.success('Settings saved');
    } catch (err) {
      toast.apiError(err, 'Save failed');
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div>
      <form className="panel-card" style={{ maxWidth: 560 }} onSubmit={save}>
        <h1 className="h5 mb-3">Application settings</h1>
        {KEYS.map((k) => (
          <div className="mb-3" key={k.key}>
            <label className="form-label">{k.label}</label>
            <input
              className="form-control"
              value={values[k.key] || ''}
              onChange={(e) => setValues({ ...values, [k.key]: e.target.value })}
            />
          </div>
        ))}
        <button className="btn btn-primary" type="submit">Save settings</button>
      </form>
    </div>
  );
}
