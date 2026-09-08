import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, [], 'NOT_FOUND'));
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn(err.message, { code, path: req.originalUrl });
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    errors: err.errors || [],
    ...(config.env !== 'production' && !err.isOperational ? { stack: err.stack } : {}),
  });
}
