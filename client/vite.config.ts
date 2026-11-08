import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://twelvo-fit-webapp.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
