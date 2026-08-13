import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Global early capture of beforeinstallprompt event to guarantee it is never missed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    (window as any).deferredPwaPrompt = e;
    console.log('[PWA] Captured beforeinstallprompt event globally.');
    window.dispatchEvent(new CustomEvent('nexcivic-pwa-prompt-ready', { detail: e }));
  });

  window.addEventListener('appinstalled', () => {
    (window as any).deferredPwaPrompt = null;
    console.log('[PWA] Application successfully installed.');
    window.dispatchEvent(new CustomEvent('nexcivic-pwa-installed'));
  });
}

// Register PWA Service Worker with Update Detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(
      (registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check if there is already a waiting worker
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('nexcivic-sw-update', { detail: registration }));
        }

        // Listen for new updates installing
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version ready for activation');
                window.dispatchEvent(new CustomEvent('nexcivic-sw-update', { detail: registration }));
              }
            };
          }
        };
      },
      (error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
