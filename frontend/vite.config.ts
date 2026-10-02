import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// VITE_DEMO=1 builds a self-contained preview (one HTML file + /img) backed by recorded API data.
const demo = !!process.env.VITE_DEMO

const demoHtml = {
  name: 'demo-html',
  transformIndexHtml: (html: string) => html.replace(/<title>[^<]*<\/title>/, '<title>DilGO Önizleme</title>').replace(/\s*<link rel="(manifest|apple-touch-icon)"[^>]*>/g, ''),
}

/**
 * The production .htaccess sends a strict Content-Security-Policy. The only inline
 * script (the theme switch that runs before paint) is allowed by its hash, which
 * is computed here from the built index.html, so editing that script never
 * silently breaks the page.
 */
const cspHashes = {
  name: 'csp-hashes',
  apply: 'build' as const,
  closeBundle() {
    const dir = fileURLToPath(new URL('./dist', import.meta.url))
    const html = join(dir, 'index.html')
    const access = join(dir, '.htaccess')
    if (!existsSync(html) || !existsSync(access)) return
    const hashes = [...readFileSync(html, 'utf8').matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
    writeFileSync(access, readFileSync(access, 'utf8').replace('__INLINE_SCRIPT_HASHES__', hashes.join(' ')))
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(demo ? [viteSingleFile(), demoHtml] : [cspHashes])],
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
