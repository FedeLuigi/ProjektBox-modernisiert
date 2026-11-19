import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: devProxyTarget,
        ws: true,
      },
    },
  },
});
