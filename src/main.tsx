import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Trata recarregamentos automáticos quando houver deploy de novos hashes de assets em produção
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (msg.includes('dynamically imported module') || msg.includes('MIME type')) {
    const key = 'tracker_chunk_reload';
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last > 10000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
