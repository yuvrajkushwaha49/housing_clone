export default function HousingCitySelect({ cities = [], selectedCityId, onCityChange, cityName }) {
  if (!cities.length) {
    return null;
  }

  return (
    <div className="dropdown home-housing-city">
      <button
        type="button"
        className="home-housing-city-btn dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {cityName || 'Select city'}
      </button>
      <ul className="dropdown-menu home-housing-city-menu">
        {cities.map((city) => (
          <li key={city.id}>
            <button
              type="button"
              className={`dropdown-item${String(city.id) === String(selectedCityId) ? ' active' : ''}`}
              onClick={() => onCityChange?.(city.id)}
            >
              {city.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
