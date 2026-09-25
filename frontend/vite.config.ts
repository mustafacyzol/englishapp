import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

// VITE_DEMO=1 builds a self-contained preview (one HTML file + /img) backed by recorded API data.
const demo = !!process.env.VITE_DEMO

const demoHtml = {
  name: 'demo-html',
  transformIndexHtml: (html: string) => html.replace(/<title>[^<]*<\/title>/, '<title>DilGO Önizleme</title>').replace(/\s*<link rel="(manifest|apple-touch-icon)"[^>]*>/g, ''),
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(demo ? [viteSingleFile(), demoHtml] : [])],
  base: demo ? './' : '/',
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
    ...(demo && { outDir: 'dist-demo', assetsInlineLimit: 100_000_000 }),
  },
})
