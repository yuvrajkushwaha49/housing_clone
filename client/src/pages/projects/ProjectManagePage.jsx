import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProjectDetailsView from '../../components/projects/ProjectDetailsView';
import ProjectStructureSection from '../../components/projects/ProjectStructureSection';
import ProjectReviewResults from '../../components/projects/ProjectReviewResults';
import BuilderProjectResubmitPanel from '../../components/projects/BuilderProjectResubmitPanel';
import ProjectReviewPanel from '../../components/projects/ProjectReviewPanel';
import ImageUploadWithCaption from '../../components/ImageUploadWithCaption';
import AmenitySelector from '../../components/AmenitySelector';
import UnitDetailsFields from '../../components/projects/UnitDetailsFields';
import { appendImagesToFormData, revokeImagePreviewUrls } from '../../utils/imageUpload';
import { uploadPendingAmenityImages } from '../../utils/amenityImages';
import { EMPTY_UNIT_FORM, mapUnitPayload, validateUnitPrice, validateUnitsPriceRange, validateProjectPriceRange } from '../../utils/unitUtils';
import { getTodayDateString } from '../../utils/dateInput';
import { mediaUrl, mastersService, projectService } from '../../services';
import { useDebouncedProjectPriceToast } from '../../hooks/useDebouncedProjectPriceToast';
import { useToast } from '../../hooks/useToast';

export default function ProjectManagePage() {
  const toast = useToast();
  const { notifyDebounced, notifyNow } = useDebouncedProjectPriceToast();
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resubmitPanelRef = useRef(null);
  const { user } = useSelector((s) => s.auth);
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role?.code);
  const isSuperAdmin = user?.role?.code === 'SUPER_ADMIN';
  const isBuilder = user?.role?.code === 'BUILDER';
  const minDate = getTodayDateString();
  const [project, setProject] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resubmitNote, setResubmitNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [lookups, setLookups] = useState({ furnishingTypes: [], facingTypes: [] });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [pendingAmenityImages, setPendingAmenityImages] = useState({});
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [savingCaptionId, setSavingCaptionId] = useState(null);
  const [editForm, setEditForm] = useState({
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
  });
  const [unitForm, setUnitForm] = useState({ ...EMPTY_UNIT_FORM });

  const handleProjectPriceBlur = () => {
    notifyNow(editForm.minPrice, editForm.maxPrice);
  };

  const handleMinPriceChange = (value) => {
    setEditForm((prev) => ({ ...prev, minPrice: value }));
    notifyDebounced(value, editForm.maxPrice);
  };

  const handleMaxPriceChange = (value) => {
    setEditForm((prev) => ({ ...prev, maxPrice: value }));
    notifyDebounced(editForm.minPrice, value);
  };

  const populateEditForm = async (data) => {
    setEditForm({
      name: data.name || '',
      description: data.description || '',
      reraId: data.reraId || '',
      addressLine: data.addressLine || '',
      minPrice: data.minPrice ?? '',
      maxPrice: data.maxPrice ?? '',
      launchDate: data.launchDate || '',
      possessionDate: data.possessionDate || '',
      categoryId: data.category?.id || '',
      countryId: data.country?.id || '',
      stateId: data.state?.id || '',
      cityId: data.city?.id || '',
      localityId: data.locality?.id || '',
    });
    setSelectedAmenities(data.amenities?.map((a) => a.id) || []);

    if (data.country?.id) {
      const statesRes = await mastersService.listStates(data.country.id, { activeOnly: true });
      setStates(statesRes.data.data);
    }
    if (data.state?.id) {
      const citiesRes = await mastersService.listCities(data.state.id, { activeOnly: true });
      setCities(citiesRes.data.data);
    }
    if (data.city?.id) {
      const localitiesRes = await mastersService.listLocalities(data.city.id, { activeOnly: true });
      setLocalities(localitiesRes.data.data);
    }
  };

  const load = async () => {
    const { data } = await projectService.get(uuid);
    setProject(data.data);
    await populateEditForm(data.data);
  };

  useEffect(() => {
    Promise.all([
      mastersService.listCountries({ activeOnly: true }),
      mastersService.listCategories({ activeOnly: true }),
      mastersService.listAmenities({ activeOnly: true }),
      mastersService.getLookups(),
    ]).then(([countriesRes, categoriesRes, amenitiesRes, lookupsRes]) => {
      setCountries(countriesRes.data.data);
      setCategories(categoriesRes.data.data);
      setAmenities(amenitiesRes.data.data);
      setLookups(lookupsRes.data.data);
    });
    load().catch((err) => {
      toast.apiError(err, 'Failed to load');
      setLoadFailed(true);
    });
  }, [uuid, toast]);

  const canEditDetails = project && !isSuperAdmin && (['draft', 'rejected', 'published'].includes(project.status) || isAdmin);
  const canEditStructure = project && !isSuperAdmin && (isAdmin || project.status !== 'archived');
  const canSubmitForReview = project && !isAdmin && !isSuperAdmin && ['draft', 'rejected', 'published'].includes(project.status);
  const showBuilderResubmit = isBuilder && ['rejected', 'published'].includes(project?.status);
  const canEdit = canEditDetails;

  useEffect(() => {
    if (
      searchParams.get('resubmit') === '1'
      && project
      && isBuilder
      && ['rejected', 'published'].includes(project.status)
    ) {
      navigate(`${uuid}/edit?resubmit=1`, { replace: true });
    }
  }, [searchParams, project, isBuilder, uuid, navigate]);

  useEffect(() => {
    if (!showBuilderResubmit || searchParams.get('resubmit') !== '1') return;
    resubmitPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const noteField = document.getElementById('resubmit-note');
    noteField?.focus();
  }, [showBuilderResubmit, searchParams, project?.status]);

  const handleCountryChange = async (countryId) => {
    setEditForm((prev) => ({ ...prev, countryId, stateId: '', cityId: '', localityId: '' }));
    setStates([]);
    setCities([]);
    setLocalities([]);
    if (countryId) {
      const res = await mastersService.listStates(countryId, { activeOnly: true });
      setStates(res.data.data);
    }
  };

  const handleStateChange = async (stateId) => {
    setEditForm((prev) => ({ ...prev, stateId, cityId: '', localityId: '' }));
    setCities([]);
    setLocalities([]);
    if (stateId) {
      const res = await mastersService.listCities(stateId, { activeOnly: true });
      setCities(res.data.data);
    }
  };

  const handleCityChange = async (cityId) => {
    setEditForm((prev) => ({ ...prev, cityId, localityId: '' }));
    setLocalities([]);
    if (cityId) {
      const res = await mastersService.listLocalities(cityId, { activeOnly: true });
      setLocalities(res.data.data);
    }
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

  const saveDetails = async (e) => {
    e.preventDefault();
    const nextMin = editForm.minPrice !== '' ? editForm.minPrice : project.minPrice;
    const nextMax = editForm.maxPrice !== '' ? editForm.maxPrice : project.maxPrice;
    const priceRangeError = validateProjectPriceRange(nextMin, nextMax);
    if (priceRangeError) {
      toast.error(priceRangeError);
      return;
    }
    const unitsPriceError = validateUnitsPriceRange(
      project.units?.map((u) => ({ unitNumber: u.unitNumber, price: u.price })) || [],
      nextMin,
      nextMax
    );
    if (unitsPriceError) {
      toast.error(unitsPriceError);
      return;
    }
    try {
      const { data } = await projectService.update(uuid, {
        name: editForm.name,
        description: editForm.description,
        reraId: editForm.reraId || undefined,
        addressLine: editForm.addressLine || undefined,
        minPrice: editForm.minPrice !== '' ? Number(editForm.minPrice) : undefined,
        maxPrice: editForm.maxPrice !== '' ? Number(editForm.maxPrice) : undefined,
        launchDate: editForm.launchDate || undefined,
        possessionDate: editForm.possessionDate || undefined,
        categoryId: editForm.categoryId || undefined,
        countryId: editForm.countryId || undefined,
        stateId: editForm.stateId || undefined,
        cityId: editForm.cityId || undefined,
        localityId: editForm.localityId || undefined,
        amenityIds: selectedAmenities,
      });
      const updatedProject = await uploadPendingAmenityImages(uuid, pendingAmenityImages);
      setProject(updatedProject || data.data);
      setPendingAmenityImages({});
      setEditing(false);
      toast.success('Project details updated');
    } catch (err) {
      toast.apiError(err, 'Update failed');
    }
  };

  const addUnit = async (e) => {
    e.preventDefault();
    const priceError = validateUnitPrice(unitForm.price, project.minPrice, project.maxPrice);
    if (priceError) {
      toast.error(priceError);
      return;
    }
    try {
      const { data } = await projectService.addUnit(uuid, {
        ...mapUnitPayload(unitForm),
        towerId: unitForm.towerId || undefined,
      });
      setProject(data.data);
      setUnitForm({ ...EMPTY_UNIT_FORM });
      toast.success('Unit added');
    } catch (err) {
      toast.apiError(err, 'Failed');
    }
  };

  const setUnitStatus = async (unitId, status) => {
    const { data } = await projectService.updateUnitStatus(uuid, unitId, status);
    setProject(data.data);
  };

  const uploadImages = async () => {
    if (!pendingImages.length) return;
    setUploadingImages(true);
    try {
      const fd = appendImagesToFormData(new FormData(), pendingImages, {
        mediaType: 'image',
        isPrimary: 'true',
      });
      const { data } = await projectService.uploadMedia(uuid, fd);
      setProject(data.data.project);
      revokeImagePreviewUrls(pendingImages);
      setPendingImages([]);
      toast.success('Images uploaded');
    } catch (err) {
      toast.apiError(err, 'Upload failed');
    } finally {
      setUploadingImages(false);
    }
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

  const uploadDocuments = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    fd.append('mediaType', 'document');
    try {
      const { data } = await projectService.uploadMedia(uuid, fd);
      setProject(data.data.project);
      toast.success('Documents uploaded');
      e.target.value = '';
    } catch (err) {
      toast.apiError(err, 'Upload failed');
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const payload = { status: 'pending' };
      if (['rejected', 'published'].includes(project.status)) {
        if (!resubmitNote.trim()) {
          toast.error('Please add a note explaining what you updated before requesting review again');
          return;
        }
        payload.resubmitNote = resubmitNote.trim();
      }
      await projectService.updateStatus(uuid, payload);
      setResubmitNote('');
      await load();
      if (project.status === 'published') {
        toast.success('Review requested — project is pending admin approval');
      } else {
        toast.success(project.status === 'rejected' ? 'Sent for review again' : 'Submitted for review');
      }
    } catch (err) {
      toast.apiError(err, 'Submit failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!project && !loadFailed) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (loadFailed) {
    return (
      <div>
        <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Projects</Link>
        <p className="text-secondary">Could not load project.</p>
      </div>
    );
  }

  return (
    <div>
      <Link to=".." className="btn btn-sm btn-outline-secondary mb-3">← Projects</Link>
      {project && (
        <>
          {isAdmin && project.status === 'pending' && (
            <div className="panel-card mb-3">
              <h2 className="h6 mb-3">Admin review</h2>
              <ProjectReviewPanel
                projectId={uuid}
                project={project}
                review={project.review}
                onCompleted={(data) => {
                  setProject(data);
                  toast.success(data.status === 'published' ? 'Project published' : 'Project rejected');
                }}
              />
            </div>
          )}

          {project.review?.status === 'completed' && !showBuilderResubmit && (
            <ProjectReviewResults review={project.review} />
          )}

          {showBuilderResubmit && (
            <div ref={resubmitPanelRef}>
              <BuilderProjectResubmitPanel
                project={project}
                variant={project.status === 'published' ? 'published' : 'rejected'}
                resubmitNote={resubmitNote}
                onResubmitNoteChange={setResubmitNote}
                onSubmit={submitReview}
                submitting={submittingReview}
                onEditClick={() => setEditing(true)}
              />
            </div>
          )}

          {project.status === 'pending' && !isAdmin && (
            <div className="alert alert-warning py-2 small mb-3">
              This project is pending admin approval. Editing is locked until a decision is made.
            </div>
          )}

          <div className="panel-card mb-3">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <h1 className="h4 mb-0">Project details</h1>
              </div>
              <div className="d-flex gap-2">
                {canEdit && !editing && (
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(true)}>
                    Edit details
                  </button>
                )}
                {canSubmitForReview && project.status === 'draft' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={submittingReview}
                    onClick={submitReview}
                  >
                    {submittingReview ? 'Submitting…' : 'Submit for review'}
                  </button>
                )}
              </div>
            </div>

            {!editing ? (
              <ProjectDetailsView project={project} showPublicLink />
            ) : (
              <form onSubmit={saveDetails}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Project name</label>
                    <input className="form-control" required value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={4} required minLength={10}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={editForm.categoryId}
                      onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
                      <option value="">Select</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">RERA ID</label>
                    <input className="form-control" value={editForm.reraId}
                      onChange={(e) => setEditForm({ ...editForm, reraId: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Min price</label>
                    <input type="number" min="0" className="form-control" value={editForm.minPrice}
                      onChange={(e) => handleMinPriceChange(e.target.value)}
                      onBlur={handleProjectPriceBlur} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Max price</label>
                    <input type="number" min="0" className="form-control" value={editForm.maxPrice}
                      onChange={(e) => handleMaxPriceChange(e.target.value)}
                      onBlur={handleProjectPriceBlur} />
                    {editForm.minPrice !== '' && editForm.minPrice != null && (
                      <div className="form-text small">Must be greater than min price</div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Launch date</label>
                    <input type="date" className="form-control" min={minDate} value={editForm.launchDate}
                      onChange={(e) => setEditForm({ ...editForm, launchDate: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Possession date</label>
                    <input type="date" className="form-control" min={minDate} value={editForm.possessionDate}
                      onChange={(e) => setEditForm({ ...editForm, possessionDate: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Country</label>
                    <select className="form-select" value={editForm.countryId}
                      onChange={(e) => handleCountryChange(e.target.value)}>
                      <option value="">Select</option>
                      {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">State</label>
                    <select className="form-select" value={editForm.stateId}
                      onChange={(e) => handleStateChange(e.target.value)}>
                      <option value="">Select</option>
                      {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">City</label>
                    <select className="form-select" value={editForm.cityId}
                      onChange={(e) => handleCityChange(e.target.value)}>
                      <option value="">Select</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Locality</label>
                    <select className="form-select" value={editForm.localityId}
                      onChange={(e) => setEditForm({ ...editForm, localityId: e.target.value })}>
                      <option value="">Select</option>
                      {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Address</label>
                    <input className="form-control" value={editForm.addressLine}
                      onChange={(e) => setEditForm({ ...editForm, addressLine: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label d-block">Amenities</label>
                    <AmenitySelector
                      amenities={amenities}
                      selectedIds={selectedAmenities}
                      onToggle={toggleAmenity}
                      projectAmenities={project?.amenities || []}
                      pendingImages={pendingAmenityImages}
                      onPendingImageChange={handlePendingAmenityImage}
                    />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button type="submit" className="btn btn-primary btn-sm">Save changes</button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>

          {!isSuperAdmin && (
            <ProjectStructureSection
              project={project}
              canEdit={canEditStructure}
              projectStatus={project.status}
              onUpdated={setProject}
            />
          )}

          <div className="row g-3">
            <div className="col-lg-4">
              {canEditStructure && (
                <>
                  <div className="panel-card">
                    <h2 className="h6 mb-2">Gallery <span className="text-secondary fw-normal">(optional)</span></h2>
                    <ImageUploadWithCaption
                      items={pendingImages}
                      onChange={setPendingImages}
                      label=""
                      hint="Select photos, add a description for each, then upload."
                      inputId="project-manage-gallery"
                    />
                    {pendingImages.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary mt-2"
                        disabled={uploadingImages}
                        onClick={uploadImages}
                      >
                        {uploadingImages ? 'Uploading…' : 'Upload images'}
                      </button>
                    )}
                    <div className="d-flex flex-column gap-2 mt-3">
                      {project.media?.filter((m) => m.mediaType === 'image').map((m) => (
                        <div key={m.id} className="border rounded p-2 d-flex gap-2 align-items-start">
                          <img
                            src={mediaUrl(m.url)}
                            alt={m.caption || m.fileName || 'Project image'}
                            width={72}
                            height={56}
                            style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                          />
                          <div className="flex-grow-1">
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
                  <div className="panel-card mt-3">
                    <h2 className="h6 mb-2">Documents <span className="text-secondary fw-normal">(optional)</span></h2>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      className="form-control form-control-sm mb-2"
                      onChange={uploadDocuments}
                    />
                    <ul className="small mb-0">
                      {project.media?.filter((m) => m.mediaType === 'document').map((m) => (
                        <li key={m.id}>
                          <a href={mediaUrl(m.url)} target="_blank" rel="noreferrer">
                            {m.fileName || 'Document'}
                          </a>
                        </li>
                      ))}
                    </ul>
                    {!project.media?.some((m) => m.mediaType === 'document') && (
                      <div className="text-secondary small">No documents</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="col-lg-8">
              {canEditStructure && (
                <form className="panel-card mb-3" onSubmit={addUnit}>
                  <h2 className="h6 mb-3">Add unit</h2>
                  <UnitDetailsFields
                    values={unitForm}
                    lookups={lookups}
                    showTower
                    towers={project.towers?.filter((t) => t.isActive !== false) || []}
                    size="md"
                    minPrice={project.minPrice}
                    maxPrice={project.maxPrice}
                    onChange={(field, value) => setUnitForm({ ...unitForm, [field]: value })}
                  />
                  <button className="btn btn-primary mt-3" type="submit">Add unit</button>
                </form>
              )}

              <div className="panel-card">
                <h2 className="h6 mb-3">Inventory</h2>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Type</th>
                        <th>Details</th>
                        <th>Tower</th>
                        <th>Area</th>
                        <th>Price</th>
                        <th>Status</th>
                        {canEditStructure && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {project.units?.map((u) => (
                        <tr key={u.id}>
                          <td>{u.unitNumber}</td>
                          <td>{u.unitType || '—'}</td>
                          <td className="small">
                            {[
                              u.bedrooms != null ? `${u.bedrooms} bed` : null,
                              u.bathrooms != null ? `${u.bathrooms} bath` : null,
                              u.balconies != null ? `${u.balconies} balcony` : null,
                              u.parking != null ? `${u.parking} parking` : null,
                              u.furnishing?.name || null,
                              u.facing?.name || null,
                            ].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td>{u.tower?.name || '—'}</td>
                          <td>
                            {u.area != null || u.carpetArea != null
                              ? [
                                u.area != null ? `${u.area} super` : null,
                                u.carpetArea != null ? `${u.carpetArea} carpet` : null,
                              ].filter(Boolean).join(' / ')
                              : '—'}
                          </td>
                          <td>{u.price != null ? `₹${Number(u.price).toLocaleString('en-IN')}` : '—'}</td>
                          <td><span className="badge text-bg-light border">{u.status}</span></td>
                          {canEditStructure && (
                            <td className="text-end">
                              <select
                                className="form-select form-select-sm"
                                style={{ width: 120 }}
                                value={u.status}
                                onChange={(e) => setUnitStatus(u.id, e.target.value)}
                              >
                                <option value="available">available</option>
                                <option value="held">held</option>
                                <option value="sold">sold</option>
                                <option value="blocked">blocked</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!project.units?.length && <div className="text-secondary">No units yet</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
