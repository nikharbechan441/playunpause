import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { tryAutoReloadForStaleChunk } from './utils/chunkRecovery.js';
import './styles/deck.css';
import './styles/gameStudios.css';
import './styles/gameWorldGraphics.css';
import './styles/gameTypography.css';
import './styles/leonidaHud.css';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (tryAutoReloadForStaleChunk()) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
