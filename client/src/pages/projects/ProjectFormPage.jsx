import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { mediaUrl, mastersService, projectService } from '../../services';
import ImageUploadWithCaption from '../../components/ImageUploadWithCaption';
import AmenitySelector from '../../components/AmenitySelector';
import DocumentUploadField from '../../components/DocumentUploadField';
import LocationFields from '../../components/LocationFields';
import ProjectCreateStructureForm from '../../components/projects/ProjectCreateStructureForm';
import ProjectStructureSection from '../../components/projects/ProjectStructureSection';
import {
  BuilderResubmitFooter,
  BuilderResubmitHeader,
} from '../../components/projects/BuilderProjectResubmitPanel';
import { FormLabelWithRating, FieldReviewRating } from '../../components/projects/FieldReviewRating';
import { appendImagesToFormData } from '../../utils/imageUpload';
import { getTodayDateString } from '../../utils/dateInput';
import { uploadPendingAmenityImages } from '../../utils/amenityImages';
import { saveProjectStructure, createDefaultProjectStructure, validateProjectStructure } from '../../utils/projectStructureUtils';
import { validateProjectPriceRange, validateUnitsPriceRange } from '../../utils/unitUtils';
import { useDebouncedProjectPriceToast } from '../../hooks/useDebouncedProjectPriceToast';
import { useToast } from '../../hooks/useToast';

function toDateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function mapProjectToFormValues(project) {
  return {
    name: project.name || '',
    description: project.description || '',
    reraId: project.reraId || '',
    addressLine: project.addressLine || '',
    minPrice: project.minPrice ?? '',
    maxPrice: project.maxPrice ?? '',
    launchDate: toDateInputValue(project.launchDate),
    possessionDate: toDateInputValue(project.possessionDate),
    categoryId: project.category?.id || '',
    countryId: project.country?.id || '',
    stateId: project.state?.id || '',
    cityId: project.city?.id || '',
    localityId: project.locality?.id || '',
    submit: false,
  };
}

export default function ProjectFormPage() {
  const toast = useToast();
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(uuid);
  const isResubmit = searchParams.get('resubmit') === '1';
  const { user } = useSelector((s) => s.auth);
  const isSuperAdmin = user?.role?.code === 'SUPER_ADMIN';
  const isBuilder = user?.role?.code === 'BUILDER';
  const { notifyDebounced, notifyNow } = useDebouncedProjectPriceToast();
  const navigate = useNavigate();
  const structureRef = useRef(null);
  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(isEdit);
  const [loadFailed, setLoadFailed] = useState(false);
  const [categories, setCategories] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [pendingAmenityImages, setPendingAmenityImages] = useState({});
  const [imageItems, setImageItems] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [savingCaptionId, setSavingCaptionId] = useState(null);
  const [resubmitNote, setResubmitNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const defaults = createDefaultProjectStructure();
  const [buildings, setBuildings] = useState(defaults.buildings);
  const [towers, setTowers] = useState(defaults.towers);
  const [lookups, setLookups] = useState({ furnishingTypes: [], facingTypes: [] });
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      name: '',
      description: '',
      reraId: '',
      addressLine: '',
      minPrice: '',
      maxPrice: '',
      launchDate: '',
      possessionDate: '',
      categoryId: '',
      countryId: '',
      stateId: '',
      cityId: '',
      localityId: '',
      submit: false,
    },
  });

  const countryId = watch('countryId');
  const stateId = watch('stateId');
  const cityId = watch('cityId');
  const localityId = watch('localityId');
  const minPrice = watch('minPrice');
  const maxPrice = watch('maxPrice');
  const minDate = getTodayDateString();
  const minPriceField = register('minPrice');
  const maxPriceField = register('maxPrice');

  const showResubmitPanel = isEdit
    && isResubmit
    && isBuilder
    && project
    && ['rejected', 'published'].includes(project.status);
  const fieldReview = showResubmitPanel ? project?.review : null;

  const fieldReviewProps = { project, review: fieldReview };
  const showRatings = Boolean(fieldReview?.items?.length);

  const loadProject = useCallback(async () => {
    if (!isEdit) return;
    setLoadingProject(true);
    setLoadFailed(false);
    try {
      const { data } = await projectService.get(uuid);
      const loaded = data.data;
      setProject(loaded);
      reset(mapProjectToFormValues(loaded));
      setSelectedAmenities(loaded.amenities?.map((a) => a.id) || []);
      setResubmitNote('');
    } catch (err) {
      toast.apiError(err, 'Failed to load project');
      setLoadFailed(true);
    } finally {
      setLoadingProject(false);
    }
  }, [isEdit, uuid, reset, toast]);

  const handleProjectPriceBlur = () => {
    notifyNow(minPrice, maxPrice);
  };

  const handleMinPriceChange = (e) => {
    minPriceField.onChange(e);
    notifyDebounced(e.target.value, maxPrice);
  };

  const handleMaxPriceChange = (e) => {
    maxPriceField.onChange(e);
    notifyDebounced(minPrice, e.target.value);
  };

  useEffect(() => {
    Promise.all([
      mastersService.listCategories({ activeOnly: true }),
      mastersService.listAmenities({ activeOnly: true }),
      mastersService.getLookups(),
    ]).then(([categoriesRes, amenitiesRes, lookupsRes]) => {
      setCategories(categoriesRes.data.data);
      setAmenities(amenitiesRes.data.data);
      setLookups(lookupsRes.data.data);
    }).catch(() => toast.error('Failed to load form data.'));
  }, [toast]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleLocationChange = (patch) => {
    Object.entries(patch).forEach(([field, value]) => setValue(field, value));
  };

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) => {
      if (prev.includes(id)) {
        setPendingAmenityImages((images) => {
          const next = { ...images };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const handlePendingAmenityImage = (amenityId, file) => {
    setPendingAmenityImages((prev) => {
      const next = { ...prev };
      if (file) next[amenityId] = file;
      else delete next[amenityId];
      return next;
    });
  };

  const saveImageCaption = async (mediaId, caption) => {
    setSavingCaptionId(mediaId);
    try {
      const { data } = await projectService.updateMedia(uuid, mediaId, { caption });
      setProject(data.data);
      toast.success('Image description saved');
    } catch (err) {
      toast.apiError(err, 'Failed to save description');
    } finally {
      setSavingCaptionId(null);
    }
  };

  const buildPayload = (values) => ({
    name: values.name,
    description: values.description,
    reraId: values.reraId || undefined,
    addressLine: values.addressLine || undefined,
    minPrice: values.minPrice !== '' && values.minPrice != null ? Number(values.minPrice) : undefined,
    maxPrice: values.maxPrice !== '' && values.maxPrice != null ? Number(values.maxPrice) : undefined,
    launchDate: values.launchDate || undefined,
    possessionDate: values.possessionDate || undefined,
    categoryId: values.categoryId || undefined,
    countryId: values.countryId || undefined,
    stateId: values.stateId || undefined,
    cityId: values.cityId || undefined,
    localityId: values.localityId || undefined,
    amenityIds: selectedAmenities,
  });

  const uploadNewMedia = async (projectId) => {
    if (imageItems.length) {
      const imageForm = appendImagesToFormData(new FormData(), imageItems, {
        mediaType: 'image',
        isPrimary: 'true',
      });
      await projectService.uploadMedia(projectId, imageForm);
    }

    if (documentFiles.length) {
      const documentForm = new FormData();
      documentFiles.forEach((file) => documentForm.append('files', file));
      documentForm.append('mediaType', 'document');
      await projectService.uploadMedia(projectId, documentForm);
    }
  };

  const saveProjectEdits = async (values) => {
    const payload = { ...buildPayload(values) };
    const { data } = await projectService.update(uuid, payload);
    const updatedProject = await uploadPendingAmenityImages(uuid, pendingAmenityImages);
    await uploadNewMedia(uuid);
    return updatedProject || data.data;
  };

  const onSubmitForReview = async (values) => {
    const priceRangeError = validateProjectPriceRange(values.minPrice, values.maxPrice);
    if (priceRangeError) {
      toast.error(priceRangeError);
      return;
    }

    const unitsPriceError = validateUnitsPriceRange(
      project?.units?.map((u) => ({ unitNumber: u.unitNumber, price: u.price })) || [],
      values.minPrice,
      values.maxPrice
    );
    if (unitsPriceError) {
      toast.error(unitsPriceError);
      return;
    }

    if (!resubmitNote.trim()) {
      toast.error('Please add a note explaining what you updated before requesting review again');
      return;
    }

    setSubmittingReview(true);
    try {
      await saveProjectEdits(values);
      await projectService.updateStatus(uuid, {
        status: 'pending',
        resubmitNote: resubmitNote.trim(),
      });
      setResubmitNote('');
      toast.success(
        project.status === 'published'
          ? 'Updates saved and sent for review'
          : 'Sent for review again'
      );
      navigate('..');
    } catch (err) {
      toast.apiError(err, 'Submit failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const onSubmit = async (values) => {
    const priceRangeError = validateProjectPriceRange(values.minPrice, values.maxPrice);
    if (priceRangeError) {
      toast.error(priceRangeError);
      return;
    }

    if (isEdit) {
      const unitsPriceError = validateUnitsPriceRange(
        project?.units?.map((u) => ({ unitNumber: u.unitNumber, price: u.price })) || [],
        values.minPrice,
        values.maxPrice
      );
      if (unitsPriceError) {
        toast.error(unitsPriceError);
        return;
      }
    } else if (!isSuperAdmin) {
      const structureValidationError = validateProjectStructure(
        { buildings, towers },
        { minPrice: values.minPrice, maxPrice: values.maxPrice }
      );
      if (structureValidationError) {
        toast.error(structureValidationError);
        structureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        const updated = await saveProjectEdits(values);
        setProject(updated);
        setPendingAmenityImages({});
        setImageItems([]);
        setDocumentFiles([]);
        await loadProject();
        toast.success('Project saved');
        return;
      }

      const payload = {
        ...buildPayload(values),
        submit: values.submit,
      };
      const { data } = await projectService.create(payload);
      const projectId = data.data.id;

      if (!isSuperAdmin) {
        await saveProjectStructure(projectId, { buildings, towers });
      }
      await uploadPendingAmenityImages(projectId, pendingAmenityImages);
      await uploadNewMedia(projectId);

      navigate(`../${projectId}`);
    } catch (err) {
      toast.apiError(err, isEdit ? 'Save failed' : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEdit && !showResubmitPanel
    ? 'Edit project'
    : !isEdit
      ? 'New project'
      : null;

  const pageHint = isEdit && !showResubmitPanel
    ? 'Update your saved project details, structure, amenities, and media.'
    : !isEdit
      ? 'Add project details, structure, amenities, and media in one form.'
      : null;

  if (isEdit && loadingProject) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (isEdit && loadFailed) {
    return (
      <div>
        <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Projects</Link>
        <p className="text-secondary">Could not load project.</p>
      </div>
    );
  }

  const existingImages = project?.media?.filter((m) => m.mediaType === 'image') || [];
  const existingDocuments = project?.media?.filter((m) => m.mediaType === 'document') || [];

  return (
    <div className={showResubmitPanel ? 'project-resubmit-page' : undefined}>
      <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Projects</Link>

      {showResubmitPanel && (
        <BuilderResubmitHeader
          project={project}
          variant={project.status === 'published' ? 'published' : 'rejected'}
        />
      )}

      {(pageTitle || pageHint) && (
        <div className="mb-3">
          {pageTitle && <h1 className="h4 mb-1">{pageTitle}</h1>}
          {pageHint && <p className="text-secondary small mb-0">{pageHint}</p>}
        </div>
      )}

      {showResubmitPanel && (
        <div className="resubmit-form-intro panel-card mb-3">
          <div className="resubmit-form-intro-head">
            <span className="resubmit-step-num">2</span>
            <div>
              <h2 className="form-section-title mb-1">Edit your project</h2>
              <p className="form-section-hint mb-0">
                All your previous data is loaded below. Update any section, then save changes.
                {fieldReview?.items?.length > 0 && (
                  <> Each field shows its last review rating.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={showResubmitPanel ? 'resubmit-form' : undefined}>
        <div className="panel-card mb-3">
          <h2 className="form-section-title">Basic details</h2>
          <p className="form-section-hint">Name and describe the project for buyers and reviewers.</p>

          <div className="row g-3">
            <div className="col-12">
              <FormLabelWithRating sectionKey="project" fieldKey="name" {...fieldReviewProps}>
                Project name <span className="text-danger">*</span>
              </FormLabelWithRating>
              <input
                className="form-control"
                placeholder="e.g. Green Valley Residency"
                {...register('name', { required: true })}
              />
            </div>

            <div className="col-12">
              <FormLabelWithRating sectionKey="project" fieldKey="description" {...fieldReviewProps}>
                Description <span className="text-danger">*</span>
              </FormLabelWithRating>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Describe the project — location highlights, total area, key features (min 10 characters)"
                {...register('description', { required: true, minLength: 10 })}
              />
            </div>

            <div className="col-md-6">
              <FormLabelWithRating sectionKey="project" fieldKey="category" {...fieldReviewProps}>
                Category
              </FormLabelWithRating>
              <select className="form-select" {...register('categoryId')}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <FormLabelWithRating sectionKey="project" fieldKey="reraId" {...fieldReviewProps}>
                RERA ID
              </FormLabelWithRating>
              <input className="form-control" placeholder="Registration number" {...register('reraId')} />
            </div>
          </div>
        </div>

        <div className="panel-card mb-3">
          <h2 className="form-section-title">Pricing & timeline</h2>
          <p className="form-section-hint">Optional price range and key dates for the project.</p>

          <div className="row g-3">
            <div className="col-md-6">
              <FormLabelWithRating sectionKey="project" fieldKey="minPrice" {...fieldReviewProps}>
                Min price (₹)
              </FormLabelWithRating>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="e.g. 4500000"
                {...minPriceField}
                onChange={handleMinPriceChange}
                onBlur={(e) => {
                  minPriceField.onBlur(e);
                  handleProjectPriceBlur();
                }}
              />
            </div>
            <div className="col-md-6">
              <FormLabelWithRating sectionKey="project" fieldKey="maxPrice" {...fieldReviewProps}>
                Max price (₹)
              </FormLabelWithRating>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="e.g. 12000000"
                {...maxPriceField}
                onChange={handleMaxPriceChange}
                onBlur={(e) => {
                  maxPriceField.onBlur(e);
                  handleProjectPriceBlur();
                }}
              />
              {minPrice !== '' && minPrice != null && (
                <div className="form-text">Must be greater than min price</div>
              )}
            </div>
            <div className="col-md-6">
              <FormLabelWithRating sectionKey="project" fieldKey="launchDate" {...fieldReviewProps}>
                Launch date
              </FormLabelWithRating>
              <input type="date" className="form-control" min={minDate} {...register('launchDate')} />
            </div>
            <div className="col-md-6">
              <FormLabelWithRating sectionKey="project" fieldKey="possessionDate" {...fieldReviewProps}>
                Possession date
              </FormLabelWithRating>
              <input type="date" className="form-control" min={minDate} {...register('possessionDate')} />
            </div>
          </div>
        </div>

        <div className="panel-card mb-3">
          <h2 className="form-section-title">Location</h2>
          <p className="form-section-hint">Where is the project located?</p>

          <div className="row g-3">
            <LocationFields
              values={{ countryId, stateId, cityId, localityId }}
              onChange={handleLocationChange}
              showAddress
              addressProps={register('addressLine')}
              project={showRatings ? project : null}
              review={fieldReview}
            />
          </div>
        </div>

        {!isSuperAdmin && !isEdit && (
          <div ref={structureRef} className="mb-3">
            <ProjectCreateStructureForm
              required
              buildings={buildings}
              onBuildingsChange={setBuildings}
              towers={towers}
              onTowersChange={setTowers}
              lookups={lookups}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </div>
        )}

        {!isSuperAdmin && isEdit && project && (
          <div className="mb-3">
            <ProjectStructureSection
              project={project}
              canEdit={project.status !== 'archived' && project.status !== 'pending'}
              projectStatus={project.status}
              onUpdated={setProject}
              review={fieldReview}
            />
          </div>
        )}

        <div className="panel-card mb-3">
          <h2 className="form-section-title">Amenities</h2>
          <p className="form-section-hint">Select amenities and upload a photo for each if needed.</p>
          <AmenitySelector
            amenities={amenities}
            selectedIds={selectedAmenities}
            onToggle={toggleAmenity}
            projectAmenities={project?.amenities || []}
            pendingImages={pendingAmenityImages}
            onPendingImageChange={handlePendingAmenityImage}
            project={showRatings ? project : null}
            review={fieldReview}
          />
        </div>

        <div className="panel-card mb-3">
          <h2 className="form-section-title">Gallery & documents</h2>
          <p className="form-section-hint">
            {isEdit ? 'Existing uploads are shown below. Add more images or documents if needed.' : 'Upload project images and supporting documents (optional).'}
          </p>

          {isEdit && existingImages.length > 0 && (
            <div className="mb-4">
              <h3 className="small fw-semibold mb-2">Current images</h3>
              <div className="d-flex flex-column gap-2">
                {existingImages.map((m) => (
                  <div key={m.id} className="border rounded p-2 d-flex gap-2 align-items-start">
                    <img
                      src={mediaUrl(m.url)}
                      alt={m.caption || m.fileName || 'Project image'}
                      width={72}
                      height={56}
                      style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                    />
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-1 flex-wrap">
                        <span className="small fw-semibold text-truncate">
                          {m.caption || m.fileName || 'Gallery image'}
                        </span>
                        {showRatings && (
                          <FieldReviewRating
                            project={project}
                            review={fieldReview}
                            sectionKey="gallery"
                            fieldKey="item"
                            entityUuid={m.id}
                          />
                        )}
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Image description"
                        defaultValue={m.caption || ''}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next !== (m.caption || '')) {
                            saveImageCaption(m.id, next);
                          }
                        }}
                      />
                    </div>
                    {savingCaptionId === m.id && (
                      <span className="small text-secondary">Saving…</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEdit && existingDocuments.length > 0 && (
            <div className="mb-4">
              <h3 className="small fw-semibold mb-2">Current documents</h3>
              <ul className="small mb-0">
                {existingDocuments.map((m) => (
                  <li key={m.id} className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <a href={mediaUrl(m.url)} target="_blank" rel="noreferrer">
                      {m.fileName || 'Document'}
                    </a>
                    {showRatings && (
                      <FieldReviewRating
                        project={project}
                        review={fieldReview}
                        sectionKey="document"
                        fieldKey="file"
                        entityUuid={m.id}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="row g-4">
            <div className="col-lg-6">
              <ImageUploadWithCaption
                items={imageItems}
                onChange={setImageItems}
                label={isEdit ? 'Add more images' : 'Project images'}
                hint="Add photos with captions for the project gallery."
                inputId={isEdit ? 'project-edit-gallery' : undefined}
              />
            </div>
            <div className="col-lg-6">
              <DocumentUploadField
                files={documentFiles}
                onChange={setDocumentFiles}
                label={isEdit ? 'Add more documents' : undefined}
              />
            </div>
          </div>
        </div>

        {showResubmitPanel && (
          <BuilderResubmitFooter
            variant={project.status === 'published' ? 'published' : 'rejected'}
            resubmitNote={resubmitNote}
            onResubmitNoteChange={setResubmitNote}
            onSubmit={handleSubmit(onSubmitForReview)}
            submitting={submittingReview || saving}
          />
        )}

        {!showResubmitPanel && (
        <div className="panel-card form-actions-bar">
          <Link to=".." className="btn btn-outline-secondary">Cancel</Link>
          <div className="d-flex gap-2 flex-wrap">
            {isEdit ? (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  className="btn btn-outline-primary"
                  disabled={saving}
                  onClick={() => setValue('submit', false)}
                >
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => setValue('submit', true)}
                >
                  {saving ? 'Saving…' : 'Save & submit for review'}
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </form>
    </div>
  );
}
