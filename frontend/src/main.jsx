import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';   // ⬅️ YE LINE ZAROORI HAI

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);