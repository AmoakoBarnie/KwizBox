import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // VitePWA disabled temporarily — PWA service worker intercepts API calls
    // causing "Failed to fetch" on localhost:8001. Re-enable with proper
    // navigateFallbackDenylist after verifying login works.
  ],
  server: {
  port: 5173,
  host: "::",
  allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com',
    ],
    proxy: {
      // API routes only — page navigations (/quiz?..., /choose-quiz, etc.) are
      // served by Vite dev as SPA index.html; do NOT blanket-proxy /quiz/*.
      '/auth': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/quiz/pack': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/quiz/check': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/quiz/submit': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/quiz/leaderboard': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/quiz/challenge': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      // Admin API endpoints only — the /admin page is a Vite dev SPA route
      '/admin/token': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/me': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/dashboard': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/users': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/questions': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/school-codes': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/leaderboard': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/monitor': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/settings': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/audit': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/admins': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/admin/export': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/curriculum': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
  build: { outDir: 'dist' }
})
