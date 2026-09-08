function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Build a safe, unique filename for uploaded images and media.
 */
export function generateImageFileName(originalName, { prefix = '', index = 0, ext } = {}) {
  const parts = String(originalName || '').split('.');
  const parsedExt = (ext || parts.pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/gi, '') || 'jpg';
  const baseName = parts.join('.') || 'image';
  const slugBase = slugify(prefix || baseName) || 'image';
  const seq = index > 0 ? `-${String(index + 1).padStart(2, '0')}` : '';
  const unique = Math.random().toString(36).slice(2, 10);
  return `${slugBase}${seq}-${unique}.${parsedExt}`;
}

export function renameFileForUpload(file, options = {}) {
  const name = generateImageFileName(file.name, options);
  return new File([file], name, { type: file.type, lastModified: file.lastModified });
}

export function appendNamedImageFiles(formData, files, { prefix = '', field = 'files' } = {}) {
  files.forEach((file, index) => {
    formData.append(field, renameFileForUpload(file, { prefix, index }));
  });
  return formData;
}
