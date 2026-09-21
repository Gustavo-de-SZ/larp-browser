import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8')
);

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  root: path.resolve(import.meta.dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
