import { useEffect, useId, useRef, useState } from 'react';

/**
 * Housing-style filter chip with custom dropdown panel.
 */
export default function SearchFilterDropdown({
  label,
  value = '',
  options = [],
  onChange,
  disabled = false,
  placeholder,
  buttonLabel,
  className = '',
  children,
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const display = buttonLabel || selected?.label || placeholder || label;
  const isActive = Boolean(value) || open;

  const pick = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`ps-filter-dd${open ? ' is-open' : ''}${isActive ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="ps-filter-dd-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className="ps-filter-dd-label">{display}</span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} aria-hidden />
      </button>

      {open && (
        <div id={menuId} className={`ps-filter-dd-menu${menuClassName ? ` ${menuClassName}` : ''}`} role="listbox">
          {typeof children === 'function'
            ? children({ close: () => setOpen(false) })
            : children || (
            <ul className="ps-filter-dd-list">
              <li>
                <button
                  type="button"
                  className={`ps-filter-dd-option${!value ? ' is-selected' : ''}`}
                  role="option"
                  aria-selected={!value}
                  onClick={() => pick('')}
                >
                  {placeholder || `Any ${label.toLowerCase()}`}
                </button>
              </li>
              {options.map((opt) => (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    className={`ps-filter-dd-option${String(value) === String(opt.value) ? ' is-selected' : ''}`}
                    role="option"
                    aria-selected={String(value) === String(opt.value)}
                    onClick={() => pick(opt.value)}
                  >
                    {opt.label}
                    {String(value) === String(opt.value) && (
                      <i className="bi bi-check2" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchBudgetDropdown({
  minPrice = '',
  maxPrice = '',
  onApply,
  presets = [],
}) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (open) {
      setMin(minPrice);
      setMax(maxPrice);
    }
  }, [open, minPrice, maxPrice]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  let display = 'Budget';
  if (minPrice && maxPrice) display = `${fmt(minPrice)} - ${fmt(maxPrice)}`;
  else if (minPrice) display = `${fmt(minPrice)}+`;
  else if (maxPrice) display = `Up to ${fmt(maxPrice)}`;

  const apply = (nextMin = min, nextMax = max) => {
    onApply?.({ minPrice: nextMin, maxPrice: nextMax });
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`ps-filter-dd${open ? ' is-open' : ''}${minPrice || maxPrice || open ? ' is-active' : ''}`}
    >
      <button
        type="button"
        className="ps-filter-dd-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ps-filter-dd-label">{display}</span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} aria-hidden />
      </button>

      {open && (
        <div id={menuId} className="ps-filter-dd-menu ps-filter-dd-menu--budget" role="dialog" aria-label="Budget">
          {presets.length > 0 && (
            <div className="ps-filter-budget-presets">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="ps-filter-budget-preset"
                  onClick={() => {
                    setMin(p.min);
                    setMax(p.max);
                    apply(p.min, p.max);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="ps-filter-budget-fields">
            <label>
              <span>Min (₹)</span>
              <input
                type="number"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="Min"
              />
            </label>
            <label>
              <span>Max (₹)</span>
              <input
                type="number"
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="Max"
              />
            </label>
          </div>
          <div className="ps-filter-budget-actions">
            <button
              type="button"
              className="ps-filter-budget-clear"
              onClick={() => {
                setMin('');
                setMax('');
                apply('', '');
              }}
            >
              Clear
            </button>
            <button type="button" className="ps-filter-budget-apply" onClick={() => apply()}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
