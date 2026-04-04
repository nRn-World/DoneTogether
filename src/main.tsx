import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler for debugging
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[GLOBAL ERROR]', message, source, lineno, colno, error);
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('[UNHANDLED PROMISE]', event.reason);
});

try {
  console.log('[main.tsx] Starting app initialization...');
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  console.log('[main.tsx] Root element found, creating React root...');
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
  console.log('[main.tsx] React app rendered successfully');
} catch (error) {
  console.error('[main.tsx] CRITICAL ERROR during app initialization:', error);
  document.body.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.style.background = '#09090b';
  wrapper.style.color = '#fff';
  wrapper.style.minHeight = '100vh';
  wrapper.style.padding = '20px';
  wrapper.style.fontFamily = 'monospace';

  const title = document.createElement('h1');
  title.style.color = '#ef4444';
  title.textContent = 'Startup Error';

  const pre = document.createElement('pre');
  pre.textContent = error instanceof Error ? (error.stack || error.message) : String(error);

  wrapper.appendChild(title);
  wrapper.appendChild(pre);
  document.body.appendChild(wrapper);
}
