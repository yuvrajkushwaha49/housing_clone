import { useNavigate } from 'react-router-dom';

function MegaColumn({ column, onNavigate }) {
  const navigate = useNavigate();
  const isIconColumn = column.variant === 'icons';

  const handleItemClick = (to) => {
    if (to) navigate(to);
    onNavigate?.();
  };

  return (
    <div className={`home-housing-mega-col${isIconColumn ? ' home-housing-mega-col--icons' : ''}`}>
      <h3 className="home-housing-mega-col-title">{column.title}</h3>
      <ul className="home-housing-mega-list">
        {column.items.map((item) => (
          <li key={`${column.title}-${item.label}`}>
            <button
              type="button"
              className="home-housing-mega-link"
              onClick={() => handleItemClick(item.to)}
            >
              {item.icon && <i className={`bi ${item.icon}`} aria-hidden />}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
        {column.items.length === 0 && (
          <li className="home-housing-mega-empty">No areas available yet</li>
        )}
      </ul>
    </div>
  );
}

export default function HousingMegaMenu({ menu, onNavigate }) {
  if (!menu) return null;

  return (
    <div className="home-housing-mega">
      <div className="home-housing-mega-caret" aria-hidden />
      <div className="home-housing-mega-inner">
        <div className="home-housing-mega-grid">
          {menu.columns.map((column) => (
            <MegaColumn key={column.title} column={column} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}
