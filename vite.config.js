import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // generateSW: Workbox generates the SW automatically.
      // Our custom push-notification logic is in public/sw.js which the
      // browser registers separately via main.jsx.
      // VitePWA handles the precache manifest and install prompt criteria.
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // Don't cache Supabase API calls
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/functions\//],
      },
      includeAssets: ['icons/*.png', 'icons/*.svg'],
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
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
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
    }),
  ],
  server: { port: 5173 },
});
