import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Point to our custom SW in src/workers/ — VitePWA copies it to dist/sw.js
      strategies: 'injectManifest',
      srcDir: 'src/workers',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        injectionPoint: undefined, // our SW manages its own caching
      },
      includeAssets: ['icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Tuition Pro',
        short_name: 'TuitionPro',
        description: 'Academic Records Management System',
        theme_color: '#00246a',
        background_color: '#f7f9fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
