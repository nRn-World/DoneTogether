import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (error) {
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
