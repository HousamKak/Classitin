import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const certPath = path.resolve(__dirname, '../../infrastructure/certs/cert.pem');
const keyPath = path.resolve(__dirname, '../../infrastructure/certs/key.pem');
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: hasCerts
      ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
      : undefined,
    proxy: {
      '/api': {
        target: `http${hasCerts ? 's' : ''}://localhost:3001`,
        secure: false,
      },
      '/socket.io': {
        target: `http${hasCerts ? 's' : ''}://localhost:3001`,
        ws: true,
        secure: false,
      },
    },
  },
});
