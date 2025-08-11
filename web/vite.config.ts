import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use BASE from environment for gh-pages (e.g., '/<repo>/')
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  plugins: [react()],
  base,
  resolve: { alias: { '@': '/src' } },
  build: { outDir: 'dist' }
})