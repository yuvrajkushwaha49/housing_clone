import { useCallback, useEffect, useMemo, useState } from 'react';
import { mastersService } from '../services';

const CITY_STORAGE_KEY = 'hous_home_city_id';
const PANEL_CITY_STORAGE_KEY = 'hous_panel_city_id';
const GEO_STATUS_KEY = 'hous_home_geo_status';
const CITY_CHANGE_EVENT = 'hous:city-change';
const PANEL_CITY_CHANGE_EVENT = 'hous:panel-city-change';

let citiesCache = null;
let citiesInflight = null;
let deviceCoordsPromise = null;
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

function toCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function findNearestCity(cities, latitude, longitude) {
  let nearest = null;
  let bestDistance = Infinity;

  cities.forEach((city) => {
    const cityLat = toCoord(city.latitude);
    const cityLng = toCoord(city.longitude);
    if (cityLat == null || cityLng == null) return;

    const distance = distanceKm(latitude, longitude, cityLat, cityLng);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = city;
    }
  });

  return nearest;
}

function setGeoStatus(status) {
  sessionStorage.setItem(GEO_STATUS_KEY, status);
}

function getGeoStatus() {
  return sessionStorage.getItem(GEO_STATUS_KEY) || '';
}

function persistCityId(nextCityId) {
  const normalized = nextCityId ? String(nextCityId) : '';
  sessionStorage.setItem(CITY_STORAGE_KEY, normalized || 'all');
  window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: normalized }));
  return normalized;
}

function getDeviceCoords() {
  if (!navigator?.geolocation) {
    return Promise.resolve(null);
  }

  if (!deviceCoordsPromise) {
    deviceCoordsPromise = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords || {};
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            resolve(null);
            return;
          }
          resolve({ latitude, longitude });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    }).finally(() => {
      // Allow a fresh read later if permission flips from denied -> granted.
      window.setTimeout(() => {
        deviceCoordsPromise = null;
      }, 1500);
    });
  }

  return deviceCoordsPromise;
}

async function shouldAttemptGeo() {
  const status = getGeoStatus();
  if (status === 'granted') return false;

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'granted' || permission.state === 'prompt') {
        return true;
      }
      if (permission.state === 'denied') {
        setGeoStatus('denied');
        return false;
      }
    } catch {
      // Safari / older browsers may reject permissions query.
    }
  }

  return status !== 'denied';
}

async function resolveCityFromGeo(cities) {
  const coords = await getDeviceCoords();
  if (!coords) {
    setGeoStatus('denied');
    return null;
  }

  const nearest = findNearestCity(cities, coords.latitude, coords.longitude);
  setGeoStatus(nearest ? 'granted' : 'denied');
  return nearest;
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

  const applyCityId = useCallback((nextCityId) => {
    const normalized = persistCityId(nextCityId);
    setCityIdState(normalized);
    setLocalityId('');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapCities = async (allCities) => {
      if (!allCities.length) return;

      const firstCityId = String(allCities[0].id);
      const savedId = sessionStorage.getItem(CITY_STORAGE_KEY);
      const savedCity = savedId && savedId !== 'all'
        ? allCities.find((city) => String(city.id) === savedId)
        : null;

      const attemptGeo = await shouldAttemptGeo();
      if (!attemptGeo) {
        const fallbackId = savedCity ? String(savedCity.id) : firstCityId;
        if (!cancelled) applyCityId(fallbackId);
        else persistCityId(fallbackId);
        return;
      }

      // Default first city immediately, then auto-switch after Allow.
      if (!cancelled) applyCityId(firstCityId);
      else persistCityId(firstCityId);

      const nearest = await resolveCityFromGeo(allCities);
      // Persist even if this effect instance was cleaned up (React Strict Mode).
      if (nearest?.id) {
        const normalized = persistCityId(String(nearest.id));
        if (!cancelled) {
          setCityIdState(normalized);
          setLocalityId('');
        }
      }
    };

    if (citiesCache?.length) {
      setCities(citiesCache);
      setLoadingCities(false);
      bootstrapCities(citiesCache);
      return undefined;
    }

    setLoadingCities(true);
    loadAllCities()
      .then((allCities) => {
        if (cancelled) return;
        setCities(allCities);
        return bootstrapCities(allCities);
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
  }, [applyCityId]);

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

  // If user allows location later from browser UI, switch city automatically.
  useEffect(() => {
    if (!cities.length || !navigator.permissions?.query) return undefined;

    let permissionRef = null;
    let cancelled = false;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (cancelled) return;
        permissionRef = permission;
        permission.onchange = async () => {
          if (permission.state !== 'granted' || !citiesCache?.length) return;
          const nearest = await resolveCityFromGeo(citiesCache);
          if (nearest?.id) {
            applyCityId(String(nearest.id));
          }
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (permissionRef) permissionRef.onchange = null;
    };
  }, [cities.length, applyCityId]);

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
    // Manual pick should stick for this session.
    setGeoStatus('granted');
    applyCityId(nextCityId);
  }, [applyCityId]);

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
