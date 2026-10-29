import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: { outDir: '../public/admin', emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target, changeOrigin: true, headers: { origin: target } },
      '/q/': { target, changeOrigin: true },
      '/l/': { target, changeOrigin: true },
    },
  },
})
