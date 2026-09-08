import config from '../config/index.js';

const LAN_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isDevLanOrigin(origin) {
  return LAN_ORIGIN_RE.test(origin);
}

/** Allow configured origins + private LAN IPs in development (phone/tablet on same Wi-Fi). */
export function corsOriginHandler(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (config.corsOrigin.includes(origin)) {
    callback(null, true);
    return;
  }

  if (!config.isProd && isDevLanOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

export function getSocketCorsOrigin() {
  if (config.isProd) {
    return config.corsOrigin;
  }
  return corsOriginHandler;
}
