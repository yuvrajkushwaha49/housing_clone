import { useCallback, useEffect, useMemo, useState } from 'react';
import { mastersService } from '../services';

const CITY_STORAGE_KEY = 'hous_home_city_id';
const PANEL_CITY_STORAGE_KEY = 'hous_panel_city_id';
const CITY_CHANGE_EVENT = 'hous:city-change';
const PANEL_CITY_CHANGE_EVENT = 'hous:panel-city-change';

let citiesCache = null;
let citiesInflight = null;
const localitiesCache = new Map();
const localitiesInflight = new Map();

async function loadAllCities() {
  if (citiesCache) {
    return citiesCache;
  }

  if (!citiesInflight) {
    citiesInflight = mastersService
      .listAllCities({ activeOnly: true, countryIso: 'IN' })
      .then((res) => {
        citiesCache = res.data.data || [];
        return citiesCache;
      })
      .finally(() => {
        citiesInflight = null;
      });
  }

  return citiesInflight;
}

async function loadLocalities(cityId) {
  const key = String(cityId);
  if (localitiesCache.has(key)) {
    return localitiesCache.get(key);
  }

  if (!localitiesInflight.has(key)) {
    localitiesInflight.set(
      key,
      mastersService
        .listLocalities(cityId, { activeOnly: true })
        .then((res) => {
          const items = res.data.data || [];
          localitiesCache.set(key, items);
          return items;
        })
        .finally(() => {
          localitiesInflight.delete(key);
        })
    );
  }

  return localitiesInflight.get(key);
}

export function useHomeLocations() {
  const [cities, setCities] = useState(citiesCache || []);
  const [localities, setLocalities] = useState([]);
  const [cityId, setCityIdState] = useState('');
  const [panelCityId, setPanelCityIdState] = useState(() => {
    const saved = sessionStorage.getItem(PANEL_CITY_STORAGE_KEY);
    return saved && saved !== 'all' ? saved : '';
  });
  const [localityId, setLocalityId] = useState('');
  const [loadingCities, setLoadingCities] = useState(!citiesCache);
  const [loadingLocalities, setLoadingLocalities] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (citiesCache?.length) {
      setCities(citiesCache);
      const savedId = sessionStorage.getItem(CITY_STORAGE_KEY);
      const savedCity = citiesCache.find((c) => String(c.id) === savedId);
      const defaultCity = savedCity || citiesCache[0];
      if (defaultCity) {
        setCityIdState((prev) => prev || String(defaultCity.id));
      }
      setLoadingCities(false);
      return undefined;
    }

    setLoadingCities(true);
    loadAllCities()
      .then((allCities) => {
        if (cancelled) return;
        setCities(allCities);
        if (!allCities.length) return;

        const savedId = sessionStorage.getItem(CITY_STORAGE_KEY);
        const savedCity = allCities.find((c) => String(c.id) === savedId);
        const defaultCity = savedCity || allCities[0];
        setCityIdState(String(defaultCity.id));
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncCityId = (nextCityId) => {
      if (nextCityId === '' || nextCityId === 'all') {
        setCityIdState('');
        setLocalityId('');
        return;
      }
      if (nextCityId) {
        setCityIdState(String(nextCityId));
        setLocalityId('');
      }
    };

    const syncPanelCityId = (nextCityId) => {
      if (nextCityId === '' || nextCityId === 'all') {
        setPanelCityIdState('');
        return;
      }
      setPanelCityIdState(String(nextCityId));
    };

    const onCityChange = (event) => {
      syncCityId(event.detail);
    };

    const onPanelCityChange = (event) => {
      syncPanelCityId(event.detail);
    };

    const onStorage = (event) => {
      if (event.key === CITY_STORAGE_KEY) {
        syncCityId(event.newValue);
      }
      if (event.key === PANEL_CITY_STORAGE_KEY) {
        syncPanelCityId(event.newValue);
      }
    };

    window.addEventListener(CITY_CHANGE_EVENT, onCityChange);
    window.addEventListener(PANEL_CITY_CHANGE_EVENT, onPanelCityChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CITY_CHANGE_EVENT, onCityChange);
      window.removeEventListener(PANEL_CITY_CHANGE_EVENT, onPanelCityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!cityId) {
      setLocalities([]);
      setLocalityId('');
      return undefined;
    }

    let cancelled = false;
    const cached = localitiesCache.get(String(cityId));
    if (cached) {
      setLocalities(cached);
      setLoadingLocalities(false);
      return undefined;
    }

    setLoadingLocalities(true);
    loadLocalities(cityId)
      .then((items) => {
        if (!cancelled) setLocalities(items);
      })
      .catch(() => {
        if (!cancelled) setLocalities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLocalities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const setCityId = useCallback((nextCityId) => {
    const normalized = nextCityId ? String(nextCityId) : '';
    setCityIdState(normalized);
    setLocalityId('');
    sessionStorage.setItem(CITY_STORAGE_KEY, normalized || 'all');
    window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: normalized }));
  }, []);

  const setPanelCityId = useCallback((nextCityId) => {
    const normalized = nextCityId ? String(nextCityId) : '';
    setPanelCityIdState(normalized);
    sessionStorage.setItem(PANEL_CITY_STORAGE_KEY, normalized || 'all');
    window.dispatchEvent(new CustomEvent(PANEL_CITY_CHANGE_EVENT, { detail: normalized }));
  }, []);

  const cityName = useMemo(
    () => cities.find((c) => String(c.id) === String(cityId))?.name,
    [cities, cityId]
  );

  const localityName = useMemo(
    () => localities.find((l) => String(l.id) === String(localityId))?.name,
    [localities, localityId]
  );

  const panelCityName = useMemo(
    () => (panelCityId ? cities.find((c) => String(c.id) === String(panelCityId))?.name : 'All locations'),
    [cities, panelCityId]
  );

  return {
    cities,
    localities,
    cityId,
    setCityId,
    panelCityId,
    setPanelCityId,
    panelCityName,
    localityId,
    setLocalityId,
    cityName,
    localityName,
    loadingCities,
    loadingLocalities,
  };
}
