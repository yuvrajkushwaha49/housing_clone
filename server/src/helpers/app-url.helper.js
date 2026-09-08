import os from 'os';
import config from '../config/index.js';
import logger from '../utils/logger.js';

function getLanIPv4() {
  const nets = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
        addresses.push(net.address);
      }
    }
  }

  return addresses[0] || null;
}

function appUrlPort(appUrl) {
  try {
    const u = new URL(appUrl);
    return u.port || (u.protocol === 'https:' ? '443' : '80');
  } catch {
    return '5173';
  }
}

/**
 * URL used in verification / reset emails.
 * In development, replaces localhost with LAN IP so phones on same Wi-Fi can open links.
 */
export function getPublicAppUrl() {
  if (process.env.LAN_APP_URL?.trim()) {
    return process.env.LAN_APP_URL.trim().replace(/\/$/, '');
  }

  const configured = (config.appUrl || 'http://localhost:5173').replace(/\/$/, '');

  if (config.isProd) {
    return configured;
  }

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured);
  if (!isLocalhost) {
    return configured;
  }

  const lanIp = getLanIPv4();
  if (!lanIp) {
    return configured;
  }

  const port = appUrlPort(configured);
  return `http://${lanIp}:${port}`;
}

let logged = false;

export function logPublicAppUrlOnce() {
  if (logged) return;
  logged = true;

  const publicUrl = getPublicAppUrl();
  const configured = (config.appUrl || '').replace(/\/$/, '');

  if (publicUrl !== configured) {
    logger.info(`[app] Email verification links → ${publicUrl}`);
  } else {
    logger.info(`[app] Email verification links → ${publicUrl}`);
  }
}
