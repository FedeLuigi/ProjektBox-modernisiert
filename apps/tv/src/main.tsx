import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { socketService } from '@projektbox/ui';
import './index.css';
import App from './App.tsx';

socketService.setClientRole('tv');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
