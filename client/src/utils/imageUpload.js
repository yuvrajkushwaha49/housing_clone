import {
  INVALID_IMAGE_MESSAGE,
  isImageFile,
  partitionImageFiles,
  PROJECT_IMAGE_ACCEPT,
} from './fileValidation';

export { INVALID_IMAGE_MESSAGE, isImageFile, PROJECT_IMAGE_ACCEPT };

export function createImageUploadItem(file) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    caption: '',
    previewUrl: URL.createObjectURL(file),
  };
}

export function filterImageFiles(files) {
  return partitionImageFiles(files).valid;
}

export function filesToImageUploadItems(files) {
  return partitionImageFiles(files).valid.map(createImageUploadItem);
}

export function appendImagesToFormData(formData, items, { mediaType = 'image', isPrimary = false } = {}) {
  items.forEach((item) => {
    formData.append('files', item.file);
    formData.append('captions', item.caption?.trim() || '');
  });
  formData.append('mediaType', mediaType);
  if (isPrimary) formData.append('isPrimary', 'true');
  return formData;
}

export function revokeImagePreviewUrls(items) {
  items.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
}
