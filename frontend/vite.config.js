// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // ถ้ารัน Vite บนเครื่อง: ใช้ localhost
        // target: 'http://localhost:4000',
        // ถ้ารันทั้งคู่ใน docker-compose เดียวกัน: ใช้ service name
        target: 'http://backend:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },

      /*
      // Auth 
      '/auth': {
          target: 'http://backend:4000',
          changeOrigin: true,
      },
      '/me': {
          target: 'http://backend:4000',
          changeOrigin: true,
      },
      // Artist
      '/artists': {
          target: 'http://backend:4000',
          changeOrigin: true,
      },
      // Venue
      '/venues': {
          target: 'http://backend:4000',
          changeOrigin: true,
      }
      */

    }
  }
})
