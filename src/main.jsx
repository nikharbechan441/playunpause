import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/deck.css';
import './styles/gameStudios.css';
import './styles/gameWorldGraphics.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
