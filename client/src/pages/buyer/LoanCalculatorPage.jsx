import { useMemo, useState } from 'react';

export default function LoanCalculatorPage() {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const result = useMemo(() => {
    const P = Number(principal) || 0;
    const r = (Number(rate) || 0) / 12 / 100;
    const n = (Number(years) || 0) * 12;
    if (!P || !n) return { emi: 0, total: 0, interest: 0 };
    if (r === 0) {
      const emi = P / n;
      return { emi, total: P, interest: 0 };
    }
    const emi = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
    const total = emi * n;
    return { emi, total, interest: total - P };
  }, [principal, rate, years]);

  const fmt = (n) =>
    Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <form className="panel-card" onSubmit={(e) => e.preventDefault()}>
          <h2 className="h6 mb-3">Home loan calculator</h2>
          <label className="form-label small">Loan amount (₹)</label>
          <input type="number" className="form-control mb-3" value={principal}
            onChange={(e) => setPrincipal(e.target.value)} />
          <label className="form-label small">Interest rate (% p.a.)</label>
          <input type="number" step="0.1" className="form-control mb-3" value={rate}
            onChange={(e) => setRate(e.target.value)} />
          <label className="form-label small">Tenure (years)</label>
          <input type="number" className="form-control mb-0" value={years}
            onChange={(e) => setYears(e.target.value)} />
        </form>
      </div>
      <div className="col-lg-7">
        <div className="panel-card">
          <div className="stat-label">Monthly EMI</div>
          <div className="display-5 fw-semibold mb-4">{fmt(result.emi)}</div>
          <div className="row g-3">
            <div className="col-sm-6">
              <div className="stat-label">Total interest</div>
              <div className="h4">{fmt(result.interest)}</div>
            </div>
            <div className="col-sm-6">
              <div className="stat-label">Total payment</div>
              <div className="h4">{fmt(result.total)}</div>
            </div>
          </div>
          <p className="small text-secondary mt-3 mb-0">
            Estimates only — not a loan offer. Confirm rates with your lender.
          </p>
        </div>
      </div>
    </div>
  );
}
