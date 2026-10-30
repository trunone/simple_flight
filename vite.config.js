import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Crucial for GitHub Pages relative path resolution
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 3000
  }
});
