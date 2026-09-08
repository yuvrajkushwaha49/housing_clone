import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import { isProjectImageFile, normalizeImageMime } from '../helpers/storage.helper.js';

const storage = multer.memoryStorage();

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/x-webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/heic',
  'image/heif',
  'image/tiff',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 12,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    const allowed = [
      ...IMAGE_MIME_TYPES,
      'application/octet-stream',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(mime) || IMAGE_MIME_TYPES.has(normalizeImageMime(mime, file.originalname))) {
      return cb(null, true);
    }
    if (mime === 'application/octet-stream' && isProjectImageFile(file)) {
      return cb(null, true);
    }
    if (mime.startsWith('image/') || isProjectImageFile(file)) {
      return cb(null, true);
    }
    return cb(new ApiError(400, `Unsupported file type: ${file.mimetype || 'unknown'}`));
  },
});

const projectImageUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 12,
  },
  fileFilter: (_req, file, cb) => {
    if (isProjectImageFile(file)) return cb(null, true);
    return cb(new ApiError(400, 'Only JPEG, PNG, and JPG images are allowed.'));
  },
});

export const uploadSingle = (field = 'file') => upload.single(field);
export const uploadMultiple = (field = 'files', max = 12) => upload.array(field, max);
export const uploadProjectImageSingle = (field = 'file') => projectImageUpload.single(field);
export const uploadProjectImageMultiple = (field = 'files', max = 12) => projectImageUpload.array(field, max);

export default upload;
