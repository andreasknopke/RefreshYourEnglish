import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.railway.app',
      '.up.railway.app',
      'localhost'
    ]
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Refresh Your English',
        short_name: 'EnglishTrainer',
        description: 'Vokabeltrainer mit LLM-gestützten Modulen und Spaced Repetition',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // index.html wird bewusst NICHT precached – sonst liefert der
        // Service-Worker nach einem Deploy die alte App aus.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            // Hashed Build-Assets: sicher cache-first (Dateiname ändert sich pro Build)
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            // HTML/Navigation: immer zuerst Netzwerk, damit ein Deploy sofort sichtbar ist
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              (url.pathname === '/' || url.pathname.endsWith('.html')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.app\.github\.dev\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'backend-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ],
})
