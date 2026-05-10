import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['lightweight-charts']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
