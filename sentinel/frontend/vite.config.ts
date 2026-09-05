import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/health': 'http://localhost:8000',
      '/transactions': 'http://localhost:8000',
      '/audit-log': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
    },
  },
})
