// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// VitePWA's virtual module — registers the Workbox-generated SW
// and handles auto-updates. This is what makes Chrome fire beforeinstallprompt.
registerSW({
  onNeedRefresh() {
    // New content available — we silently update (autoUpdate mode)
  },
  onOfflineReady() {
    console.log('[SW] App ready to work offline');
  },
  onRegisterError(error) {
    console.error('[SW] Registration failed:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
