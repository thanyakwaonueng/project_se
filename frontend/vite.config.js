import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  //added from gpt to make frontend->backend service communication in development
  //in production might have to use CORS or better yet deploy both service in the same origin
  server: {
    proxy: {
      // Users
      '/users': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
      // Single-user routes also start with /users
      // Artists
      '/artists': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
      // Venues
      '/venues': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
      // Events
      '/events': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
      // Auth 
      '/auth/login': {
          target: 'http://backend:4000',
          changeOrigin: true,
      },
      '/auth/logout': {
          target: 'http://backend:4000',
          changeOrigin: true,
      }


    }
  }
})
