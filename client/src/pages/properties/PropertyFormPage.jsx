import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import LocationFields from '../../components/LocationFields';
import { FormLabelWithRating, FieldReviewRating, PropertyReviewSummary } from '../../components/properties/PropertyFieldReviewRating';
import { PROPERTY_PURPOSE_LABEL, isPlotCategory, isPlotType, PLOT_AMENITY_FIELDS, EMPTY_PLOT_AMENITIES } from '../../components/properties/propertyUtils';
import { ROLE_CODES } from '../../constants';
import { mastersService, mediaUrl, propertyService } from '../../services';
import { useToast } from '../../hooks/useToast';

const PURPOSE_OPTIONS = [
  { value: 'sale', icon: 'bi-tag' },
  { value: 'rent', icon: 'bi-key' },
  { value: 'lease', icon: 'bi-file-earmark-text' },
  { value: 'pg', icon: 'bi-people' },
];

const defaultValues = {
  title: '',
  description: '',
  categoryId: '',
  propertyTypeId: '',
  purpose: 'sale',
  price: '',
  priceNegotiable: false,
  area: '',
  areaUnitId: '',
  carpetArea: '',
  bedrooms: '',
  bathrooms: '',
  balconies: '',
  parking: '',
  facingId: '',
  furnishingId: '',
  ownershipId: '',
  constructionStatusId: '',
  floorNumber: '',
  totalFloors: '',
  ageYears: '',
  countryId: '',
  stateId: '',
  cityId: '',
  localityId: '',
  addressLine: '',
  landmark: '',
  pincode: '',
  metaTitle: '',
  metaDescription: '',
  plotAmenities: { ...EMPTY_PLOT_AMENITIES },
  submit: false,
};

function FormSection({ icon, title, hint, children }) {
  return (
    <section className="builder-profile-section property-form-section">
      <div className="builder-profile-section-head">
        <span className="builder-profile-section-icon" aria-hidden>
          <i className={`bi ${icon}`} />
        </span>
        <div>
          <h2 className="h6 mb-0">{title}</h2>
          {hint && <p className="form-section-hint mb-0 mt-1">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ htmlFor, icon, children, required }) {
  return (
    <label className="form-label builder-profile-label" htmlFor={htmlFor}>
      {icon && <i className={`bi ${icon}`} aria-hidden />}
      {children}
      {required && <span className="text-danger ms-1">*</span>}
    </label>
  );
}

function RatedLabel({
  show,
  fieldReviewProps,
  sectionKey,
  fieldKey,
  htmlFor,
  icon,
  required,
  children,
}) {
  if (show) {
    return (
      <FormLabelWithRating sectionKey={sectionKey} fieldKey={fieldKey} {...fieldReviewProps}>
        {children}{required ? <span className="text-danger ms-1">*</span> : null}
      </FormLabelWithRating>
    );
  }
  return <FieldLabel htmlFor={htmlFor} icon={icon} required={required}>{children}</FieldLabel>;
}

export default function PropertyFormPage() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const { uuid } = useParams();
  const isEdit = Boolean(uuid);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useSelector((s) => s.auth);
  const isBuilder = user?.role?.code === ROLE_CODES.BUILDER;
  const plotModeParam = searchParams.get('type') === 'plot'
    || searchParams.get('plot') === '1'
    || location.pathname.includes('/plots/new');
  const listPath = location.pathname.replace(/\/new$/, '').replace(/\/[^/]+\/edit$/, '');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [propertyStatus, setPropertyStatus] = useState(null);
  const [property, setProperty] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const countryId = watch('countryId');
  const stateId = watch('stateId');
  const cityId = watch('cityId');
  const localityId = watch('localityId');
  const categoryId = watch('categoryId');
  const propertyTypeId = watch('propertyTypeId');
  const purpose = watch('purpose');
  const title = watch('title');

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(categoryId)),
    [categories, categoryId]
  );
  const selectedType = useMemo(
    () => types.find((t) => String(t.id) === String(propertyTypeId)),
    [types, propertyTypeId]
  );
  const isPlotListing = useMemo(
    () => isPlotCategory(selectedCategory)
      || isPlotType(selectedType)
      || isPlotCategory(property?.category)
      || isPlotType(property?.propertyType),
    [selectedCategory, selectedType, property]
  );
  const purposeOptions = useMemo(
    () => (isPlotListing ? PURPOSE_OPTIONS.filter((opt) => opt.value !== 'pg') : PURPOSE_OPTIONS),
    [isPlotListing]
  );

  useEffect(() => {
    Promise.all([
      mastersService.listCategories({ activeOnly: true }),
      mastersService.listAmenities({ activeOnly: true }),
      mastersService.getLookups(),
    ]).then(([cat, am, lu]) => {
      setCategories(cat.data.data);
      setAmenities(am.data.data);
      setLookups(lu.data.data);
      const defaultUnit = lu.data.data.areaUnits?.find((u) => u.code === 'sqyd')
        || lu.data.data.areaUnits?.[0];
      if (defaultUnit) {
        setValue('areaUnitId', String(defaultUnit.id));
      }
    }).catch((err) => toast.apiError(err, 'Failed to load form data'));
  }, [setValue, toast]);

  useEffect(() => {
    if (isEdit || !plotModeParam || !categories.length) return;
    const landCategory = categories.find((c) => c.code === 'land');
    if (landCategory) {
      setValue('categoryId', landCategory.id, { shouldDirty: true });
      setValue('purpose', 'sale', { shouldDirty: true });
    }
  }, [isEdit, plotModeParam, categories, setValue]);

  useEffect(() => {
    if (isEdit || !plotModeParam || !types.length) return;
    const plotType = types.find((t) => t.code === 'plot');
    if (plotType) {
      setValue('propertyTypeId', plotType.id, { shouldDirty: true });
    }
  }, [isEdit, plotModeParam, types, setValue]);

  useEffect(() => {
    if (isPlotListing && purpose === 'pg') {
      setValue('purpose', 'sale', { shouldDirty: true });
    }
  }, [isPlotListing, purpose, setValue]);

  useEffect(() => {
    mastersService
      .listTypes({ categoryId: categoryId || undefined, activeOnly: true })
      .then((res) => setTypes(res.data.data));
  }, [categoryId]);

  useEffect(() => {
    if (!isEdit) return;
    propertyService
      .getById(uuid)
      .then((res) => {
        const p = res.data.data;
        reset({
          title: p.title,
          description: p.description,
          categoryId: p.category.id,
          propertyTypeId: p.propertyType.id,
          purpose: p.purpose,
          price: p.price,
          priceNegotiable: p.priceNegotiable,
          area: p.area,
          areaUnitId: String(p.areaUnit.id),
          carpetArea: p.carpetArea ?? '',
          bedrooms: p.bedrooms ?? '',
          bathrooms: p.bathrooms ?? '',
          balconies: p.balconies ?? '',
          parking: p.parking ?? '',
          facingId: p.facing?.id ? String(p.facing.id) : '',
          furnishingId: p.furnishing?.id ? String(p.furnishing.id) : '',
          ownershipId: p.ownership?.id ? String(p.ownership.id) : '',
          constructionStatusId: p.constructionStatus?.id ? String(p.constructionStatus.id) : '',
          floorNumber: p.floorNumber ?? '',
          totalFloors: p.totalFloors ?? '',
          ageYears: p.ageYears ?? '',
          countryId: p.country.id,
          stateId: p.state.id,
          cityId: p.city.id,
          localityId: p.locality?.id || '',
          addressLine: p.addressLine,
          landmark: p.landmark || '',
          pincode: p.pincode || '',
          metaTitle: p.metaTitle || '',
          metaDescription: p.metaDescription || '',
          plotAmenities: {
            ...EMPTY_PLOT_AMENITIES,
            ...(p.plotAmenities || {}),
          },
          submit: false,
        });
        setSelectedAmenities(p.amenities?.map((a) => a.id) || []);
        setExistingMedia(p.media || []);
        setProperty(p);
        setPropertyStatus(p.status);
        setRejectionReason(p.rejectionReason || '');
      })
      .catch((err) => toast.apiError(err, 'Failed to load property'));
  }, [isEdit, uuid, reset, toast]);

  useEffect(() => {
    const urls = mediaFiles.map((file) => URL.createObjectURL(file));
    setMediaPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [mediaFiles]);

  const filteredTypes = useMemo(
    () => (categoryId ? types.filter((t) => t.categoryId === categoryId) : types),
    [types, categoryId]
  );

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleLocationChange = (patch) => {
    Object.entries(patch).forEach(([field, value]) => setValue(field, value));
  };

  const handleFilesSelected = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setMediaFiles((prev) => [...prev, ...files]);
  };

  const removeNewFile = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeMedia = async (mediaId) => {
    if (!isEdit) return;
    if (!window.confirm('Remove this image?')) return;
    try {
      await propertyService.deleteMedia(uuid, mediaId);
      setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success('Image removed');
    } catch (err) {
      toast.apiError(err, 'Failed to remove image');
    }
  };

  const onSubmit = async (values, event) => {
    const submitForApproval = event?.nativeEvent?.submitter?.name === 'submit';

    const payload = {
      ...values,
      price: Number(values.price),
      area: Number(values.area),
      areaUnitId: Number(values.areaUnitId),
      carpetArea: isPlotListing ? null : (values.carpetArea === '' ? null : Number(values.carpetArea)),
      priceNegotiable: Boolean(values.priceNegotiable),
      bedrooms: isPlotListing ? null : (values.bedrooms === '' ? null : Number(values.bedrooms)),
      bathrooms: isPlotListing ? null : (values.bathrooms === '' ? null : Number(values.bathrooms)),
      balconies: isPlotListing ? null : (values.balconies === '' ? null : Number(values.balconies)),
      parking: isPlotListing ? null : (values.parking === '' ? null : Number(values.parking)),
      ageYears: isPlotListing ? null : (values.ageYears === '' ? null : Number(values.ageYears)),
      facingId: values.facingId === '' ? null : Number(values.facingId),
      furnishingId: isPlotListing ? null : (values.furnishingId === '' ? null : Number(values.furnishingId)),
      ownershipId: values.ownershipId === '' ? null : Number(values.ownershipId),
      constructionStatusId: isPlotListing
        ? null
        : (values.constructionStatusId === '' ? null : Number(values.constructionStatusId)),
      floorNumber: isPlotListing ? null : (values.floorNumber === '' ? null : Number(values.floorNumber)),
      totalFloors: isPlotListing ? null : (values.totalFloors === '' ? null : Number(values.totalFloors)),
      localityId: values.localityId || null,
      amenityIds: isPlotListing ? [] : selectedAmenities,
      plotAmenities: isPlotListing ? values.plotAmenities : null,
      submit: submitForApproval,
    };

    try {
      let propertyId = uuid;
      if (isEdit) {
        const { data } = await propertyService.update(uuid, payload);
        propertyId = data.data.id;
        toast.success(submitForApproval ? 'Submitted for approval' : 'Property saved');
      } else {
        const { data } = await propertyService.create(payload);
        propertyId = data.data.id;
        toast.success(submitForApproval ? 'Submitted for approval' : 'Draft saved');
      }

      if (mediaFiles.length) {
        const formData = new FormData();
        mediaFiles.forEach((file) => formData.append('files', file));
        formData.append('mediaType', 'image');
        formData.append('isPrimary', existingMedia.length ? 'false' : 'true');
        await propertyService.uploadMedia(propertyId, formData);
      }

      navigate(listPath);
    } catch (err) {
      toast.apiError(err, 'Save failed');
    }
  };

  if (!lookups) {
    return (
      <div className="property-form-page">
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      </div>
    );
  }

  const isResubmit = searchParams.get('resubmit') === '1';
  const showRatings =
    Boolean(property?.review?.items?.length)
    && (propertyStatus === 'rejected' || (propertyStatus === 'approved' && isResubmit));
  const fieldReview = showRatings ? property.review : null;
  const fieldReviewProps = { property, review: fieldReview };

  const submitLabel = propertyStatus === 'rejected'
    ? 'Save & send for review again'
    : propertyStatus === 'approved' && isResubmit
      ? 'Save & improve rating'
      : 'Submit for approval';

  return (
    <div className="property-form-page">
      <header className="property-form-hero">
        <div className="property-form-hero-top">
          <Link to={listPath} className="btn btn-sm btn-outline-secondary property-form-back">
            <i className="bi bi-arrow-left me-1" />
            Back
          </Link>
          <div className="property-form-hero-icon" aria-hidden>
            <i className={`bi ${isEdit ? 'bi-pencil-square' : isPlotListing ? 'bi-map' : 'bi-house-add'}`} />
          </div>
          <div className="property-form-hero-body">
            <h1 className="property-form-title">
              {isEdit
                ? (isPlotListing ? 'Edit plot' : 'Edit property')
                : (isPlotListing || plotModeParam ? 'Add plot' : 'Add property')}
            </h1>
            <p className="property-form-subtitle mb-0">
              {isPlotListing
                ? (isBuilder
                  ? 'List plot inventory from your projects — area, location, facing, and site photos.'
                  : 'List residential or commercial land with area, location, and clear plot photos.')
                : isEdit
                  ? 'Update listing details, photos, and location. Submit again when ready for review.'
                  : 'Create a listing with photos, pricing, and location. Save as draft or submit for approval.'}
            </p>
          </div>
        </div>
        <ol className="builder-profile-steps property-form-steps">
          <li className="builder-profile-step is-active"><span>1</span> Property details</li>
          <li className="builder-profile-step"><span>2</span> Admin review</li>
          <li className="builder-profile-step"><span>3</span> Live on search</li>
        </ol>
      </header>

      {showRatings && (
        <div className="resubmit-form-intro panel-card mb-3">
          <div className="resubmit-form-intro-head">
            <span className="resubmit-step-num">2</span>
            <div>
              <h2 className="form-section-title mb-1">
                {propertyStatus === 'approved' ? 'Improve rating' : 'Fix & resubmit'}
              </h2>
              <p className="form-section-hint mb-0">
                {propertyStatus === 'approved'
                  ? 'Each field shows its admin review rating (1–10). Improve low-rated fields, then submit again for a fresh review.'
                  : 'Each field shows its admin review rating (1–10). Update low-rated or rejected fields, then submit again.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {propertyStatus === 'approved' && isResubmit && !showRatings && (
        <div className="panel-card mb-3">
          <h2 className="h6 mb-1">Improve rating</h2>
          <p className="text-secondary small mb-0">
            Update listing details and photos, then submit again. Admin will re-score your listing.
          </p>
        </div>
      )}

      {propertyStatus === 'rejected' && (
        <div className="property-form-rejected-banner">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          <div>
            <strong>Listing rejected</strong>
            {rejectionReason && <p className="mb-1 mt-1">{rejectionReason}</p>}
            <p className="small mb-0 text-secondary">
              Fix the issues below{showRatings ? ' — each field shows its review rating' : ''}, then save and submit for review again.
            </p>
          </div>
        </div>
      )}

      <form className="property-form-layout" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="property-form-main builder-profile-form">
          <FormSection
            icon="bi-card-text"
            title="Basic details"
            hint="Title and description buyers see first in search results."
          >
            <div className="row g-3">
              <div className="col-12">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="property" fieldKey="title" htmlFor="title" icon="bi-type" required>
                  Listing title
                </RatedLabel>
                <input
                  id="title"
                  className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                  placeholder={isPlotListing ? 'e.g. 2400 sq yd corner plot near highway' : 'e.g. 3 BHK apartment with city view'}
                  {...register('title', { required: true })}
                />
                {errors.title && <div className="invalid-feedback">Title is required</div>}
              </div>
              <div className="col-12">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="property" fieldKey="description" htmlFor="description" icon="bi-text-paragraph" required>
                  Description
                </RatedLabel>
                <textarea
                  id="description"
                  rows={5}
                  className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                  placeholder={isPlotListing
                    ? 'Describe plot size, facing, road width, approvals, and nearby landmarks…'
                    : 'Describe the property, layout, neighbourhood, and highlights…'}
                  {...register('description', { required: true, minLength: 20 })}
                />
                {errors.description && (
                  <div className="invalid-feedback">Description must be at least 20 characters</div>
                )}
              </div>
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                  <span className="form-label builder-profile-label mb-0">
                    <i className="bi bi-bullseye" aria-hidden />
                    Purpose
                  </span>
                  {showRatings && (
                    <FieldReviewRating
                      {...fieldReviewProps}
                      sectionKey="property"
                      fieldKey="purpose"
                    />
                  )}
                </div>
                <div className="property-form-purpose-group" role="group" aria-label="Purpose">
                  {purposeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`property-form-purpose-btn ${purpose === opt.value ? 'is-active' : ''}`}
                      onClick={() => setValue('purpose', opt.value, { shouldDirty: true })}
                    >
                      <i className={`bi ${opt.icon}`} aria-hidden />
                      {PROPERTY_PURPOSE_LABEL[opt.value]}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...register('purpose', { required: true })} />
              </div>
            </div>
          </FormSection>

          <FormSection
            icon="bi-building"
            title="Property type & pricing"
            hint="Category, type, and price shown on the listing card."
          >
            <div className="row g-3">
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="property" fieldKey="category" htmlFor="categoryId" required>
                  Category
                </RatedLabel>
                <select
                  id="categoryId"
                  className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  {...register('categoryId', { required: true })}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="property" fieldKey="propertyType" htmlFor="propertyTypeId" required>
                  Property type
                </RatedLabel>
                <select
                  id="propertyTypeId"
                  className={`form-select ${errors.propertyTypeId ? 'is-invalid' : ''}`}
                  {...register('propertyTypeId', { required: true })}
                >
                  <option value="">Select type</option>
                  {filteredTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="pricing" fieldKey="price" htmlFor="price" icon="bi-currency-rupee" required>
                  Price
                </RatedLabel>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                  placeholder="0"
                  {...register('price', { required: true })}
                />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <label className="form-check property-form-negotiable w-100">
                  <input type="checkbox" className="form-check-input" {...register('priceNegotiable')} />
                  <span className="form-check-label d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <span>Price is negotiable</span>
                    {showRatings && (
                      <FieldReviewRating {...fieldReviewProps} sectionKey="pricing" fieldKey="priceNegotiable" />
                    )}
                  </span>
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection
            icon="bi-rulers"
            title={isPlotListing ? 'Plot size' : 'Size & layout'}
            hint={isPlotListing
              ? 'Plot area and facing help buyers compare land listings.'
              : 'Area, rooms, and floor details help buyers filter your listing.'}
          >
            <div className="row g-3">
              <div className={isPlotListing ? 'col-md-6' : 'col-md-4'}>
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="area" htmlFor="area" required>
                  {isPlotListing ? 'Plot area' : 'Built-up area'}
                </RatedLabel>
                <input type="number" step="0.01" id="area" className="form-control" {...register('area', { required: true })} />
              </div>
              <div className={isPlotListing ? 'col-md-6' : 'col-md-4'}>
                <FieldLabel htmlFor="areaUnitId" required>Unit</FieldLabel>
                <select id="areaUnitId" className="form-select" {...register('areaUnitId', { required: true })}>
                  {lookups.areaUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {!isPlotListing && (
                <>
              <div className="col-md-4">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="carpetArea" htmlFor="carpetArea">
                  Carpet area
                </RatedLabel>
                <input type="number" step="0.01" id="carpetArea" className="form-control" {...register('carpetArea')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="bedrooms" htmlFor="bedrooms" icon="bi-door-closed">
                  Beds
                </RatedLabel>
                <input type="number" id="bedrooms" className="form-control" min="0" {...register('bedrooms')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="bathrooms" htmlFor="bathrooms" icon="bi-droplet">
                  Baths
                </RatedLabel>
                <input type="number" id="bathrooms" className="form-control" min="0" {...register('bathrooms')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="balconies" htmlFor="balconies">
                  Balconies
                </RatedLabel>
                <input type="number" id="balconies" className="form-control" min="0" {...register('balconies')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="parking" htmlFor="parking" icon="bi-car-front">
                  Parking
                </RatedLabel>
                <input type="number" id="parking" className="form-control" min="0" {...register('parking')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="floorNumber" htmlFor="floorNumber">
                  Floor
                </RatedLabel>
                <input type="number" id="floorNumber" className="form-control" {...register('floorNumber')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="totalFloors" htmlFor="totalFloors">
                  Total floors
                </RatedLabel>
                <input type="number" id="totalFloors" className="form-control" {...register('totalFloors')} />
              </div>
              <div className="col-6 col-md-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="size" fieldKey="ageYears" htmlFor="ageYears">
                  Age (years)
                </RatedLabel>
                <input type="number" id="ageYears" className="form-control" min="0" {...register('ageYears')} />
              </div>
                </>
              )}
            </div>
          </FormSection>

          <FormSection
            icon="bi-sliders"
            title="Features"
            hint={isPlotListing ? 'Facing and ownership details for land buyers.' : 'Optional attributes that improve discoverability.'}
          >
            <div className="row g-3">
              {!isPlotListing && (
              <div className="col-md-6 col-lg-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="features" fieldKey="furnishing" htmlFor="furnishingId">
                  Furnishing
                </RatedLabel>
                <select id="furnishingId" className="form-select" {...register('furnishingId')}>
                  <option value="">Select</option>
                  {lookups.furnishingTypes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              )}
              <div className="col-md-6 col-lg-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="features" fieldKey="facing" htmlFor="facingId">
                  Facing
                </RatedLabel>
                <select id="facingId" className="form-select" {...register('facingId')}>
                  <option value="">Select</option>
                  {lookups.facingTypes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="col-md-6 col-lg-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="features" fieldKey="ownership" htmlFor="ownershipId">
                  Ownership
                </RatedLabel>
                <select id="ownershipId" className="form-select" {...register('ownershipId')}>
                  <option value="">Select</option>
                  {lookups.ownershipTypes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {!isPlotListing && (
              <div className="col-md-6 col-lg-3">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="features" fieldKey="constructionStatus" htmlFor="constructionStatusId">
                  Construction
                </RatedLabel>
                <select id="constructionStatusId" className="form-select" {...register('constructionStatusId')}>
                  <option value="">Select</option>
                  {lookups.constructionStatuses.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              )}
            </div>
          </FormSection>

          <FormSection icon="bi-geo-alt" title="Location" hint="Accurate address helps buyers find your listing.">
            <div className="row g-3">
              <LocationFields
                values={{ countryId, stateId, cityId, localityId }}
                onChange={handleLocationChange}
                required
                colClass="col-md-6 col-lg-3"
                property={showRatings ? property : null}
                review={fieldReview}
              />
              <div className="col-12">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="location" fieldKey="addressLine" htmlFor="addressLine" icon="bi-signpost" required>
                  Street address
                </RatedLabel>
                <input id="addressLine" className="form-control" {...register('addressLine', { required: true })} />
              </div>
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="location" fieldKey="landmark" htmlFor="landmark">
                  Landmark
                </RatedLabel>
                <input id="landmark" className="form-control" {...register('landmark')} />
              </div>
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="location" fieldKey="pincode" htmlFor="pincode">
                  Pincode
                </RatedLabel>
                <input id="pincode" className="form-control" {...register('pincode')} />
              </div>
            </div>
          </FormSection>

          <FormSection
            icon="bi-stars"
            title={isPlotListing ? 'Plot amenities' : 'Amenities'}
            hint={
              isPlotListing
                ? 'Road width, utilities, and other land details buyers look for.'
                : `Select everything included with this property.${selectedAmenities.length ? ` ${selectedAmenities.length} selected.` : ''}`
            }
          >
            {isPlotListing ? (
              <div className="row g-3">
                {PLOT_AMENITY_FIELDS.map((field) => (
                  <div key={field.key} className="col-md-6">
                    <FieldLabel htmlFor={`plotAmenity-${field.key}`} icon={field.icon}>
                      {field.label}
                    </FieldLabel>
                    <input
                      id={`plotAmenity-${field.key}`}
                      type="text"
                      className="form-control"
                      placeholder={field.placeholder}
                      {...register(`plotAmenities.${field.key}`)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="property-form-amenity-grid">
                {amenities.map((a) => {
                  const selected = selectedAmenities.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`property-form-amenity-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => toggleAmenity(a.id)}
                      aria-pressed={selected}
                    >
                      {showRatings && (
                        <span className="property-form-amenity-rating">
                          <FieldReviewRating
                            {...fieldReviewProps}
                            sectionKey="amenity"
                            fieldKey="selection"
                            entityUuid={a.id}
                          />
                        </span>
                      )}
                      {selected && (
                        <span className="property-form-amenity-check" aria-hidden>
                          <i className="bi bi-check-lg" />
                        </span>
                      )}
                      <span className="property-form-amenity-icon-wrap">
                        <i className={`bi ${a.icon || 'bi-check2-circle'}`} aria-hidden />
                      </span>
                      <span className="property-form-amenity-name">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormSection>

          <FormSection icon="bi-images" title="Photos" hint="Add clear photos — the first image is used as the cover in search.">
            <input
              ref={fileInputRef}
              type="file"
              className="d-none"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="property-form-upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="bi bi-cloud-arrow-up" aria-hidden />
              <span className="fw-semibold">Click to upload photos</span>
              <span className="small text-secondary">JPG, PNG — multiple files allowed</span>
            </button>
            {(existingMedia.length > 0 || mediaPreviews.length > 0) && (
              <div className="property-form-media-grid">
                {existingMedia.filter((m) => m.mediaType === 'image').map((m) => (
                  <div key={m.id} className="property-form-media-item">
                    <img src={mediaUrl(m.url)} alt="" />
                    {showRatings && (
                      <div className="property-form-media-rating">
                        <FieldReviewRating
                          {...fieldReviewProps}
                          sectionKey="gallery"
                          fieldKey="item"
                          entityUuid={m.id}
                        />
                      </div>
                    )}
                    <button type="button" className="property-form-media-remove" onClick={() => removeMedia(m.id)} aria-label="Remove">
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                ))}
                {mediaPreviews.map((url, index) => (
                  <div key={url} className="property-form-media-item is-new">
                    <img src={url} alt="" />
                    <span className="property-form-media-badge">New</span>
                    <button type="button" className="property-form-media-remove" onClick={() => removeNewFile(index)} aria-label="Remove">
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection icon="bi-search" title="SEO (optional)" hint="Custom title and description for Google and social previews.">
            <div className="row g-3">
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="seo" fieldKey="metaTitle" htmlFor="metaTitle">
                  Meta title
                </RatedLabel>
                <input id="metaTitle" className="form-control" placeholder={title || 'Uses listing title if empty'} {...register('metaTitle')} />
              </div>
              <div className="col-md-6">
                <RatedLabel show={showRatings} fieldReviewProps={fieldReviewProps} sectionKey="seo" fieldKey="metaDescription" htmlFor="metaDescription">
                  Meta description
                </RatedLabel>
                <input id="metaDescription" className="form-control" {...register('metaDescription')} />
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="property-form-sidebar">
          {showRatings && (
            <PropertyReviewSummary property={property} review={fieldReview} />
          )}
          <div className="builder-profile-card property-form-tips">
            <div className="builder-profile-card-icon is-accent">
              <i className="bi bi-lightbulb" />
            </div>
            <h3 className="h6 mb-2">Listing tips</h3>
            <ul className="property-form-tips-list">
              {isPlotListing ? (
                <>
                  <li>Mention plot dimensions, facing, and road access in the title</li>
                  <li>Upload boundary and approach road photos</li>
                  <li>Include facing and ownership for better search ranking</li>
                  <li>Submit only when location and area details are final</li>
                </>
              ) : (
                <>
                  <li>Use a clear title with beds, location, or USP</li>
                  <li>Add at least 3 photos from different angles</li>
                  <li>Fill area, beds, and baths for better search ranking</li>
                  <li>Submit only when details and photos are final</li>
                </>
              )}
            </ul>
          </div>
          <div className="builder-profile-card property-form-checklist">
            <h3 className="h6 mb-2">Before you submit</h3>
            <ul className="property-form-checklist-items">
              <li className={title?.trim() ? 'is-done' : ''}>
                <i className={`bi ${title?.trim() ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                Title added
              </li>
              <li className={categoryId ? 'is-done' : ''}>
                <i className={`bi ${categoryId ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                Category & type
              </li>
              <li className={countryId && cityId ? 'is-done' : ''}>
                <i className={`bi ${countryId && cityId ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                Location set
              </li>
              <li className={existingMedia.length + mediaFiles.length > 0 ? 'is-done' : ''}>
                <i className={`bi ${existingMedia.length + mediaFiles.length > 0 ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                At least one photo
              </li>
            </ul>
          </div>
        </aside>

        <footer className="property-form-actions builder-profile-actions">
          <p className="builder-profile-actions-hint mb-0">
            {propertyStatus === 'approved' && isResubmit
              ? 'Submitting again sends this listing for a new admin rating. It will leave Live until approved again.'
              : 'Drafts are private. Submit sends your listing to admin for approval.'}
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Link to={listPath} className="btn btn-outline-secondary">Cancel</Link>
            <button type="submit" name="draft" className="btn btn-outline-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save draft'}
            </button>
            <button type="submit" name="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : submitLabel}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
