import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      // SW filename — must NOT conflict with any file in public/
      // VitePWA outputs this to dist/sw.js
      filename: 'sw.js',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/functions\//],
        // Import our push notification handler into the generated SW
        importScripts: ['/push-handler.js'],
        // SW must claim clients immediately for installability
        clientsClaim: true,
        skipWaiting: true,
      },
      includeAssets: ['icons/*.png', 'push-handler.js'],
      manifest: {
        name: 'Tuition Pro',
        short_name: 'TuitionPro',
        description: 'Academic Records Management — Attendance, Fees & Assessments',
        theme_color: '#00246a',
        background_color: '#f7f9fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Mark Attendance',
            short_name: 'Attendance',
            url: '/teacher/attendance',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'View Fees',
            short_name: 'Fees',
            url: '/teacher/fees',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      // Dev mode: also enable SW in development so you can test installability locally
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: { port: 5173 },
});
