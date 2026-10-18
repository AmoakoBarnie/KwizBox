import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const API_TARGET = process.env.VITE_API_URL || 'http://localhost:8001'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'KwizBox Ghana STEM Trivia',
        short_name: 'KwizBox',
        description: 'Curriculum-aligned quizzes for Ghanaian learners, available offline.',
        theme_color: '#0b7a4b',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(api|auth|admin|curriculum|media|docs|openapi)(\/|$)/],
        runtimeCaching: [
          {
            urlPattern: /\/media\/.+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kwizbox-offline-media',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      '/media': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: { outDir: 'dist' },
})
