import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initPwaRegistration } from './utils/pwa';
import './index.css';
import App from './App.tsx';

// Service Worker kontrolliert und ohne doppelte Start-Reloads registrieren
initPwaRegistration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
