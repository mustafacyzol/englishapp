import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // In dev, /api is proxied to `php artisan serve` so no CORS setup is needed locally.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
})
