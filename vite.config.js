// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src/workers',
      filename: 'sw.js',
      includeAssets: ['icons/*.svg', 'icons/*.png', 'sw-push.js'],
      manifest: {
        name: 'Tuition Pro',
        short_name: 'TuitionPro',
        description: 'Academic Records Management — Attendance, Fees & Assessments',
        theme_color: '#00246a',
        background_color: '#f7f9fb',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Mark Attendance', short_name: 'Attendance', url: '/teacher/attendance', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Manage Fees',     short_name: 'Fees',       url: '/teacher/fees',       icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
  server: { port: 5173, open: true },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'date-fns': ['date-fns'],
        },
      },
    },
  },
});
