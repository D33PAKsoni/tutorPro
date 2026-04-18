// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register the Workbox-generated SW via VitePWA virtual module.
// This is required for Chrome to fire beforeinstallprompt.
registerSW({
  onNeedRefresh() { /* auto-update, no UI needed */ },
  onOfflineReady() { console.log('[SW] Offline ready'); },
  onRegisterError(e) { console.error('[SW] Registration error:', e); },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
