import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      // Pre-cache all build output (app shell, JS, CSS, fonts)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // SPA fallback: serve index.html for any navigate request when offline
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // NetworkFirst for all API calls — tries network, falls back to cache
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'flight-log-api',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // StaleWhileRevalidate for uploaded photos / static media
            urlPattern: /\/uploads(-flight-log)?\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'flight-log-uploads',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Flight Log',
        short_name: 'FlightLog',
        description: 'Cabin Crew Logbook',
        theme_color: '#040A1D',
        background_color: '#040A1D',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
