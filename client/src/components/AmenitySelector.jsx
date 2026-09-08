import { useState } from 'react';
import { mediaUrl } from '../services';
import {
  INVALID_IMAGE_MESSAGE,
  isImageFile,
  PROJECT_IMAGE_ACCEPT,
} from '../utils/fileValidation';
import { FieldReviewRating } from './projects/FieldReviewRating';

function amenityIconClass(icon) {
  const value = (icon || 'bi-star').trim();
  if (!value) return 'bi bi-star';
  return value.startsWith('bi ') ? value : `bi ${value}`;
}

function AmenityThumb({ amenity, projectAmenity, pendingFile }) {
  if (pendingFile) {
    return (
      <img
        src={URL.createObjectURL(pendingFile)}
        alt={amenity.name}
        className="amenity-selector-thumb"
      />
    );
  }

  const imageUrl = projectAmenity?.projectImageUrl || projectAmenity?.imageUrl;
  if (imageUrl) {
    return (
      <img
        src={mediaUrl(imageUrl)}
        alt={amenity.name}
        className="amenity-selector-thumb"
      />
    );
  }

  return (
    <div className="amenity-selector-icon">
      <i className={amenityIconClass(amenity.icon)} />
    </div>
  );
}

export default function AmenitySelector({
  amenities,
  selectedIds,
  onToggle,
  projectAmenities = [],
  pendingImages = {},
  onPendingImageChange,
  project = null,
  review = null,
}) {
  const [imageErrors, setImageErrors] = useState({});

  const clearImageError = (amenityId) => {
    setImageErrors((prev) => {
      if (!prev[amenityId]) return prev;
      const next = { ...prev };
      delete next[amenityId];
      return next;
    });
  };

  return (
    <div className="amenity-selector-grid">
      {amenities.map((amenity) => {
        const selected = selectedIds.includes(amenity.id);
        const projectAmenity = projectAmenities.find((item) => item.id === amenity.id);
        const pendingFile = pendingImages[amenity.id];
        const imageError = imageErrors[amenity.id];
        const inputId = `amenity-photo-${amenity.id}`;

        return (
          <div key={amenity.id} className="amenity-selector-item">
            <div className={`amenity-selector-card ${selected ? 'is-selected' : ''} ${imageError ? 'amenity-card-invalid' : ''}`}>
              <label className="amenity-selector-label">
                <input
                  type="checkbox"
                  className="form-check-input amenity-selector-check"
                  checked={selected}
                  onChange={() => {
                    clearImageError(amenity.id);
                    onToggle(amenity.id);
                  }}
                />
                <AmenityThumb
                  amenity={amenity}
                  projectAmenity={projectAmenity}
                  pendingFile={pendingFile}
                />
                <span className="amenity-selector-meta">
                  <span className="amenity-selector-name-row">
                    <span className="amenity-selector-name">{amenity.name}</span>
                    {project && review && (
                      <FieldReviewRating
                        project={project}
                        review={review}
                        sectionKey="amenity"
                        fieldKey="selection"
                        entityUuid={amenity.id}
                      />
                    )}
                  </span>
                  <span className="amenity-selector-category text-capitalize">{amenity.category}</span>
                </span>
              </label>

              {selected && onPendingImageChange && (
                <div className="amenity-selector-upload upload-field">
                  <label className={`form-label small mb-1 ${imageError ? 'text-danger' : ''}`} htmlFor={inputId}>
                    Project photo <span className="text-secondary fw-normal">(optional)</span>
                  </label>
                  <input
                    id={inputId}
                    type="file"
                    className={`form-control form-control-sm ${imageError ? 'is-invalid' : ''}`}
                    accept={PROJECT_IMAGE_ACCEPT}
                    aria-invalid={imageError ? 'true' : 'false'}
                    aria-describedby={imageError ? `${inputId}-error` : undefined}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && !isImageFile(file)) {
                        setImageErrors((prev) => ({
                          ...prev,
                          [amenity.id]: `${file.name}: ${INVALID_IMAGE_MESSAGE}`,
                        }));
                        e.target.value = '';
                        return;
                      }
                      clearImageError(amenity.id);
                      onPendingImageChange(amenity.id, file);
                    }}
                    onFocus={() => clearImageError(amenity.id)}
                  />
                  {imageError ? (
                    <div id={`${inputId}-error`} className="invalid-feedback d-block">
                      {imageError}
                    </div>
                  ) : (
                    <div className="small text-secondary mt-1">
                      {projectAmenity?.projectImageUrl && !pendingFile
                        ? 'Photo saved. Upload to replace.'
                        : 'JPEG, PNG, or JPG'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!amenities.length && <div className="text-secondary small">No amenities available</div>}
    </div>
  );
}
