import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function ignoreBenignWsProxyErrors(proxy) {
  const isBenign = (err) => ['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code);

  proxy.on('error', (err) => {
    if (isBenign(err)) return;
    console.error('[vite] proxy error:', err);
  });

  proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
    socket.on('error', (err) => {
      if (isBenign(err)) return;
      console.error('[vite] ws proxy socket error:', err);
    });
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: ignoreBenignWsProxyErrors,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
