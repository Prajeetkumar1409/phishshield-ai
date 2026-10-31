import config from '../config/index.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.originalUrl} not found` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: status >= 500 ? 'InternalServerError' : err.name || 'Error',
    message: status >= 500 && config.env === 'production' ? 'Something went wrong' : err.message,
  });
}

/** Wrap async route handlers so rejections reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
