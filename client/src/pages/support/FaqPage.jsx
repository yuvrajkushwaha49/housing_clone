import { useEffect, useState } from 'react';
import { supportService } from '../../services';
import { useToast } from '../../hooks/useToast';

export default function FaqPage({ manage = false }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ category: 'general', question: '', answer: '' });
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    const { data } = await supportService.listFaqs({ activeOnly: manage ? 'false' : 'true' });
    setItems(data.data);
  };

  useEffect(() => {
    load().catch((err) => {
      toast.apiError(err, 'Failed to load FAQs');
      setLoadFailed(true);
    });
  }, [manage, toast]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await supportService.createFaq(form);
      setForm({ category: 'general', question: '', answer: '' });
      toast.success('FAQ created');
      await load();
    } catch (err) {
      toast.apiError(err, 'Create failed');
    }
  };

  if (loadFailed) {
    return <p className="text-secondary text-center py-5 mb-0">Could not load FAQs.</p>;
  }

  return (
    <div className="row g-3">
      {manage && (
        <div className="col-lg-4">
          <form className="panel-card" onSubmit={create}>
            <h2 className="h6 mb-3">Add FAQ</h2>
            <input className="form-control mb-2" placeholder="Category" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input className="form-control mb-2" placeholder="Question" required value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <textarea className="form-control mb-2" rows={4} placeholder="Answer" required value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            <button className="btn btn-primary w-100" type="submit">Create</button>
          </form>
        </div>
      )}
      <div className={manage ? 'col-lg-8' : 'col-12'}>
        <div className="panel-card">
          <h2 className="h6 mb-3">Frequently asked questions</h2>
          <div className="accordion" id="faqAccordion">
            {items.map((f, idx) => (
              <div className="accordion-item" key={f.id}>
                <h2 className="accordion-header">
                  <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#faq${idx}`}>
                    {f.question}
                  </button>
                </h2>
                <div id={`faq${idx}`} className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div className="accordion-body">
                    <span className="badge text-bg-light border mb-2">{f.category}</span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{f.answer}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
