import { useEffect, useState } from 'react';
import { mastersService } from '../services';
import { useToast } from '../hooks/useToast';
import { FormLabelWithRating as ProjectFormLabelWithRating } from './projects/FieldReviewRating';
import { FormLabelWithRating as PropertyFormLabelWithRating } from './properties/PropertyFieldReviewRating';

function LocationLabel({
  project,
  property,
  review,
  sectionKey,
  fieldKey,
  children,
}) {
  const showProject = project && review?.items?.length;
  const showProperty = property && review?.items?.length;

  if (showProperty) {
    return (
      <PropertyFormLabelWithRating
        property={property}
        review={review}
        sectionKey={sectionKey}
        fieldKey={fieldKey}
      >
        {children}
      </PropertyFormLabelWithRating>
    );
  }

  if (showProject) {
    return (
      <ProjectFormLabelWithRating
        project={project}
        review={review}
        sectionKey={sectionKey}
        fieldKey={fieldKey}
      >
        {children}
      </ProjectFormLabelWithRating>
    );
  }

  return <label className="form-label">{children}</label>;
}

export default function LocationFields({
  values = {},
  onChange,
  showAddress = false,
  addressProps = {},
  required = false,
  colClass = 'col-md-6 col-lg-3',
  addressColClass = 'col-12',
  project = null,
  property = null,
  review = null,
  reviewSectionKey = null,
}) {
  const toast = useToast();
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingLocalities, setLoadingLocalities] = useState(false);

  const countryId = values.countryId || '';
  const stateId = values.stateId || '';
  const cityId = values.cityId || '';
  const localityId = values.localityId || '';

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    mastersService.listCountries({ activeOnly: true })
      .then((res) => {
        if (!cancelled) setCountries(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load countries.');
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingStates(true);
    mastersService.listStates(countryId, { activeOnly: true })
      .then((res) => {
        if (!cancelled) setStates(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load states.');
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });
    return () => { cancelled = true; };
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingCities(true);
    mastersService.listCities(stateId, { activeOnly: true })
      .then((res) => {
        if (!cancelled) setCities(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load cities.');
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => { cancelled = true; };
  }, [stateId]);

  useEffect(() => {
    if (!cityId) {
      setLocalities([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingLocalities(true);
    mastersService.listLocalities(cityId, { activeOnly: true })
      .then((res) => {
        if (!cancelled) setLocalities(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load localities.');
      })
      .finally(() => {
        if (!cancelled) setLoadingLocalities(false);
      });
    return () => { cancelled = true; };
  }, [cityId]);

  const handleCountryChange = (value) => {
    onChange({
      countryId: value,
      stateId: '',
      cityId: '',
      localityId: '',
    });
  };

  const handleStateChange = (value) => {
    onChange({
      stateId: value,
      cityId: '',
      localityId: '',
    });
  };

  const handleCityChange = (value) => {
    onChange({
      cityId: value,
      localityId: '',
    });
  };

  const handleLocalityChange = (value) => {
    onChange({ localityId: value });
  };

  const optionLabel = (loading, items, emptyHint) => {
    if (loading) return 'Loading…';
    if (!items.length) return emptyHint;
    return 'Select';
  };

  const labelProps = {
    project,
    property,
    review,
    sectionKey: reviewSectionKey || (property ? 'location' : 'project'),
  };

  return (
    <>
      <div className={colClass}>
        <LocationLabel fieldKey="country" {...labelProps}>
          Country {required && <span className="text-danger">*</span>}
        </LocationLabel>
        <select
          className="form-select"
          value={countryId}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={loadingCountries}
          required={required}
        >
          <option value="">{loadingCountries ? 'Loading countries…' : 'Select country'}</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className={colClass}>
        <LocationLabel fieldKey="state" {...labelProps}>
          State {required && <span className="text-danger">*</span>}
        </LocationLabel>
        <select
          className="form-select"
          value={stateId}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={!countryId || loadingStates}
          required={required}
        >
          <option value="">
            {optionLabel(loadingStates, states, countryId ? 'No states found' : 'Select country first')}
          </option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className={colClass}>
        <LocationLabel fieldKey="city" {...labelProps}>
          City {required && <span className="text-danger">*</span>}
        </LocationLabel>
        <select
          className="form-select"
          value={cityId}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={!stateId || loadingCities}
          required={required}
        >
          <option value="">
            {optionLabel(loadingCities, cities, stateId ? 'No cities found' : 'Select state first')}
          </option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className={colClass}>
        <LocationLabel fieldKey="locality" {...labelProps}>
          Locality
        </LocationLabel>
        <select
          className="form-select"
          value={localityId}
          onChange={(e) => handleLocalityChange(e.target.value)}
          disabled={!cityId || loadingLocalities}
        >
          <option value="">
            {optionLabel(loadingLocalities, localities, cityId ? 'No localities found' : 'Select city first')}
          </option>
          {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {showAddress && (
        <div className={addressColClass}>
          <LocationLabel fieldKey="addressLine" {...labelProps}>
            Street address
          </LocationLabel>
          <input
            className="form-control"
            placeholder="Building / plot address, landmark nearby"
            {...addressProps}
          />
        </div>
      )}
    </>
  );
}
