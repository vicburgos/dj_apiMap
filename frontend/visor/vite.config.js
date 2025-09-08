import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  server: {
    port: 3007, // Puerto donde se ejecutara el servidor de desarrollo
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Dirección del backend en desarrollo
        changeOrigin: true,  // Cambia el origen de la solicitud
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'static/main.js',
        assetFileNames: 'static/main.css',
      }
    }
  },
  plugins: [vue()]
});