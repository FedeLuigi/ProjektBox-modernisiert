import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { socketService } from '@projektbox/ui';
import { initPwaRegistration } from './utils/pwa';
import './index.css';
import App from './App.tsx';

socketService.setClientRole('smartphone');
initPwaRegistration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
