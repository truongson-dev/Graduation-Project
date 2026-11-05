import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const backendUrl = 'http://127.0.0.1:8000';
const backendProxy = {
  target: backendUrl,
  changeOrigin: true,
  headers: {
    Origin: backendUrl,
    Referer: `${backendUrl}/`,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': backendProxy,
      '/sanctum': backendProxy,
    },
  },
  test: {
    environment: 'jsdom',
  },
});
