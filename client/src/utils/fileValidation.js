/**
 * Windows file picker: extension list first filters Explorer reliably.
 * MIME types are included for macOS / mobile browsers.
 */
export const PROJECT_IMAGE_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';

export const PROJECT_DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const INVALID_IMAGE_MESSAGE = 'Only JPEG, PNG, and JPG files are allowed.';
export const INVALID_DOCUMENT_MESSAGE = 'Only PDF, DOC, or DOCX files are allowed.';

const PROJECT_IMAGE_EXT = /\.(jpe?g|png)$/i;
const PROJECT_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/pjpeg', 'image/x-png']);

const PROJECT_DOCUMENT_EXT = /\.(pdf|docx?)$/i;
const PROJECT_DOCUMENT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function fileExtension(name = '') {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

export function isImageFile(file) {
  if (!file) return false;
  const ext = fileExtension(file.name);
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') return true;
  const type = String(file.type || '').toLowerCase();
  return PROJECT_IMAGE_MIME.has(type);
}

export function isDocumentFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (PROJECT_DOCUMENT_MIME.has(type)) return true;
  const name = String(file.name || '').toLowerCase();
  return PROJECT_DOCUMENT_EXT.test(name);
}

export function partitionImageFiles(files) {
  const valid = [];
  const invalid = [];
  for (const file of Array.from(files || [])) {
    if (isImageFile(file)) valid.push(file);
    else invalid.push(file);
  }
  return { valid, invalid };
}

export function partitionDocumentFiles(files) {
  const valid = [];
  const invalid = [];
  for (const file of Array.from(files || [])) {
    if (isDocumentFile(file)) valid.push(file);
    else invalid.push(file);
  }
  return { valid, invalid };
}

export function invalidFilesMessage(invalid, baseMessage) {
  if (!invalid.length) return '';
  const names = invalid.map((f) => f.name).join(', ');
  return names ? `${names}: ${baseMessage}` : baseMessage;
}
