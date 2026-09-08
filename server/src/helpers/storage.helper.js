import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { generateUuid } from './crypto.helper.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const PROJECT_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/pjpeg', 'image/x-png']);
const PROJECT_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const IMAGE_MIME_ALIASES = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
  'image/x-webp': 'image/webp',
  'image/x-icon': 'image/png',
};
const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.heic', '.heif', '.tif', '.tiff',
]);
const DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function normalizeImageMime(mimetype, originalname = '') {
  const raw = String(mimetype || '').trim().toLowerCase();
  if (IMAGE_MIME.has(raw)) return raw;
  if (IMAGE_MIME_ALIASES[raw]) return IMAGE_MIME_ALIASES[raw];
  const ext = path.extname(originalname || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.avif') return 'image/avif';
  if (raw === 'application/octet-stream' && IMAGE_EXTENSIONS.has(ext)) {
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
  }
  return raw;
}

export function isProjectImageFile(file) {
  if (!file) return false;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = normalizeImageMime(file.mimetype, file.originalname);
  if (PROJECT_IMAGE_MIME.has(mime)) return true;
  return PROJECT_IMAGE_EXTENSIONS.has(ext);
}

export function isLikelyImageUpload(file) {
  return isProjectImageFile(file);
}

async function resolveProjectImageMime(file) {
  if (!isProjectImageFile(file)) return null;
  const normalized = normalizeImageMime(file.mimetype, file.originalname);
  if (PROJECT_IMAGE_MIME.has(normalized)) {
    if (!file.buffer?.length) return normalized;
    try {
      const meta = await sharp(file.buffer).metadata();
      if (meta.format && ['jpeg', 'png'].includes(meta.format)) {
        return meta.format === 'png' ? 'image/png' : 'image/jpeg';
      }
    } catch {
      return null;
    }
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!PROJECT_IMAGE_EXTENSIONS.has(ext) || !file.buffer?.length) return null;
  try {
    const meta = await sharp(file.buffer).metadata();
    if (!meta.format || !['jpeg', 'png'].includes(meta.format)) return null;
    return meta.format === 'png' ? 'image/png' : 'image/jpeg';
  } catch {
    return null;
  }
}

/**
 * Persist an uploaded file. Images are optimized with Sharp.
 * Returns relative web path under /uploads.
 */
export async function storeUpload(file, { folder = 'properties', mediaType = 'image' } = {}) {
  if (!file) {
    throw new ApiError(400, 'File is required');
  }

  const destDir = path.join(config.uploadDir, folder);
  ensureDir(destDir);

  const base = `${Date.now()}-${generateUuid()}`;
  let filename;
  let mimeType = file.mimetype;
  let size = file.size;

  const wantsImage = mediaType === 'image';

  if (wantsImage) {
    const resolvedMime = await resolveProjectImageMime(file);
    if (!resolvedMime) {
      throw new ApiError(400, 'Invalid image type. Only JPEG, PNG, and JPG are allowed.');
    }
    filename = `${base}.webp`;
    const outPath = path.join(destDir, filename);
    const optimized = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await fs.promises.writeFile(outPath, optimized);
    mimeType = 'image/webp';
    size = optimized.length;
  } else if (mediaType === 'video') {
    if (!VIDEO_MIME.has(file.mimetype)) {
      throw new ApiError(400, 'Invalid video type. Allowed: MP4, WebM, MOV');
    }
    const ext = path.extname(file.originalname) || '.mp4';
    filename = `${base}${ext}`;
    await fs.promises.writeFile(path.join(destDir, filename), file.buffer);
  } else {
    if (!DOC_MIME.has(file.mimetype) && !IMAGE_MIME.has(normalizeImageMime(file.mimetype, file.originalname))) {
      throw new ApiError(400, 'Invalid document type');
    }
    const ext = path.extname(file.originalname) || '';
    filename = `${base}${ext}`;
    await fs.promises.writeFile(path.join(destDir, filename), file.buffer);
  }

  const relativePath = path.posix.join(folder, filename);
  return {
    filePath: relativePath,
    fileName: file.originalname,
    mimeType,
    fileSize: size,
    url: `/uploads/${relativePath}`,
  };
}

export async function deleteStoredFile(relativePath) {
  if (!relativePath) return;
  const abs = path.join(config.uploadDir, relativePath);
  if (fs.existsSync(abs)) {
    await fs.promises.unlink(abs);
  }
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}
