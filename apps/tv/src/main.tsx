import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { socketService } from '@projektbox/ui';
import './index.css';
import App from './App.tsx';

socketService.setClientRole('tv');

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const reg of registrations) {
        void reg.unregister();
      }
    })
    .catch(() => {
      // ignore service worker cleanup errors
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
