import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxy /api calls to the FastAPI backend
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
