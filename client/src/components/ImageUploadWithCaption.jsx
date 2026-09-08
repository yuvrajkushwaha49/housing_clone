import { useState } from 'react';
import { createImageUploadItem } from '../utils/imageUpload';
import {
  INVALID_IMAGE_MESSAGE,
  partitionImageFiles,
  invalidFilesMessage,
  PROJECT_IMAGE_ACCEPT,
} from '../utils/fileValidation';

export default function ImageUploadWithCaption({
  items,
  onChange,
  label = 'Images',
  hint = 'Only JPEG, PNG, or JPG. Add a short description for each photo.',
  multiple = true,
  inputId = 'image-upload-with-caption',
  accept = PROJECT_IMAGE_ACCEPT,
}) {
  const [error, setError] = useState('');

  const addFiles = (e) => {
    const { valid, invalid } = partitionImageFiles(e.target.files);
    if (invalid.length) {
      setError(invalidFilesMessage(invalid, INVALID_IMAGE_MESSAGE));
    } else {
      setError('');
    }
    if (valid.length) {
      const picked = valid.map(createImageUploadItem);
      onChange(multiple ? [...items, ...picked] : picked);
    }
    e.target.value = '';
  };

  const updateCaption = (id, caption) => {
    onChange(items.map((item) => (item.id === id ? { ...item, caption } : item)));
  };

  const removeItem = (id) => {
    const removed = items.find((item) => item.id === id);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className={`upload-field ${error ? 'has-error' : ''}`}>
      {label ? (
        <label className={`form-label ${error ? 'text-danger' : ''}`} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="file"
        className={`form-control ${error ? 'is-invalid' : ''}`}
        accept={accept}
        multiple={multiple}
        onChange={addFiles}
        onFocus={() => error && setError('')}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error ? (
        <div id={`${inputId}-error`} className="invalid-feedback d-block">
          {error}
        </div>
      ) : (
        hint && <p className="small text-secondary mb-2 mt-1">{hint}</p>
      )}

      {items.length > 0 && (
        <div className="d-flex flex-column gap-2 mt-2">
          {items.map((item, index) => (
            <div key={item.id} className="border rounded p-2 d-flex gap-2 align-items-start">
              <img
                src={item.previewUrl}
                alt={item.file.name}
                width={72}
                height={56}
                style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
              <div className="flex-grow-1">
                <div className="small text-secondary mb-1">{item.file.name}</div>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={`Description for photo ${index + 1}`}
                  value={item.caption}
                  onChange={(e) => updateCaption(item.id, e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeItem(item.id)}
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
