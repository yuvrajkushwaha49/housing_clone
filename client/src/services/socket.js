import { io } from 'socket.io-client';
import { refreshSession } from './api';

let socket = null;
let currentToken = null;
let lifecycleAttached = false;
let authRefreshInFlight = false;

const AUTH_ERROR_MESSAGES = new Set([
  'Authentication required',
  'Invalid token',
  'Unauthorized',
]);

function getSocketOrigin() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // Dev: bypass Vite's /socket.io ws proxy (avoids noisy ECONNABORTED errors on disconnect).
  if (import.meta.env.DEV) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:5000';
    }
    return `http://${hostname}:5000`;
  }

  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  return origin || window.location.origin;
}

function readStoredToken() {
  return localStorage.getItem('hous_access_token');
}

function syncSocketAuth(token = readStoredToken()) {
  if (!socket || !token) return null;
  currentToken = token;
  socket.auth = { token };
  return token;
}

async function refreshSocketAuth() {
  if (authRefreshInFlight) return readStoredToken();
  authRefreshInFlight = true;
  try {
    const { accessToken } = await refreshSession();
    syncSocketAuth(accessToken);
    return accessToken;
  } catch {
    return null;
  } finally {
    authRefreshInFlight = false;
  }
}

function attachSocketLifecycle(sock) {
  if (lifecycleAttached) return;
  lifecycleAttached = true;

  sock.io.on('reconnect_attempt', () => {
    syncSocketAuth();
  });

  sock.on('connect_error', async (err) => {
    if (!AUTH_ERROR_MESSAGES.has(err?.message)) return;
    const latest = readStoredToken();
    if (latest && latest !== currentToken) {
      syncSocketAuth(latest);
      return;
    }
    await refreshSocketAuth();
  });
}

function createSocket(accessToken) {
  const sock = io(getSocketOrigin(), {
    path: '/socket.io',
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  attachSocketLifecycle(sock);
  return sock;
}

export function getSocket() {
  return socket;
}

export function updateSocketAuth(accessToken) {
  if (!accessToken) return null;
  if (!socket) {
    return connectSocket(accessToken);
  }
  if (currentToken === accessToken) {
    return socket;
  }
  syncSocketAuth(accessToken);
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
  return socket;
}

export function connectSocket(accessToken) {
  const token = accessToken || readStoredToken();
  if (!token) return null;

  if (socket) {
    if (currentToken !== token) {
      return updateSocketAuth(token);
    }
    return socket;
  }

  currentToken = token;
  socket = createSocket(token);
  return socket;
}

export function disconnectSocket() {
  if (!socket) {
    currentToken = null;
    lifecycleAttached = false;
    return;
  }

  socket.disconnect();
  socket = null;
  currentToken = null;
  lifecycleAttached = false;
}
