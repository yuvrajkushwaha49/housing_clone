import { useState } from 'react';
import {
  INVALID_DOCUMENT_MESSAGE,
  invalidFilesMessage,
  partitionDocumentFiles,
  PROJECT_DOCUMENT_ACCEPT,
} from '../utils/fileValidation';

export default function DocumentUploadField({
  files,
  onChange,
  label = 'Documents',
  hint = 'Brochures, floor plans, RERA certificate, etc.',
  inputId = 'document-upload',
  multiple = true,
}) {
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { valid, invalid } = partitionDocumentFiles(e.target.files);
    if (invalid.length) {
      setError(invalidFilesMessage(invalid, INVALID_DOCUMENT_MESSAGE));
    } else {
      setError('');
    }
    if (valid.length) {
      onChange(multiple ? [...files, ...valid] : valid);
    }
    e.target.value = '';
  };

  return (
    <div className={`upload-field ${error ? 'has-error' : ''}`}>
      <label className={`form-label ${error ? 'text-danger' : ''}`} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        className={`form-control ${error ? 'is-invalid' : ''}`}
        accept={PROJECT_DOCUMENT_ACCEPT}
        multiple
        onChange={handleChange}
        onFocus={() => error && setError('')}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error ? (
        <div id={`${inputId}-error`} className="invalid-feedback d-block">
          {error}
        </div>
      ) : (
        <div className="form-text">{hint}</div>
      )}
      {files.length > 0 && (
        <ul className="small text-secondary mb-0 mt-2 ps-3">
          {files.map((file) => (
            <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
