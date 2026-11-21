import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const sharedRoot = resolve(appRoot, '..', 'shared');

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: 5174,
    host: '127.0.0.1',
    fs: { allow: [appRoot, sharedRoot] },
  },
});
