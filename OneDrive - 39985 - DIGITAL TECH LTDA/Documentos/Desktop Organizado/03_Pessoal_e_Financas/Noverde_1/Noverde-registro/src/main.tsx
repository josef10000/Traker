import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Trata recarregamentos automáticos quando houver deploy de novos hashes de assets em produção
window.addEventListener('error', (event: any) => {
  const target = event.target || {};
  const isCSSOrScriptFail = target.tagName === 'LINK' || target.tagName === 'SCRIPT';
  const msg = String(event.message || event.error || '');
  
  if (isCSSOrScriptFail || msg.includes('dynamically imported module') || msg.includes('MIME type') || msg.includes('Loading chunk')) {
    const key = 'tracker_chunk_reload';
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last > 5000) {
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
