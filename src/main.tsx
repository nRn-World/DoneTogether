import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

function isGeolocationRejection(reason: unknown): boolean {
  if (reason == null) return false
  try {
    const anyReason = reason as { code?: number; message?: string; name?: string }
    const text = [
      Object.prototype.toString.call(reason),
      String(reason),
      anyReason.message || '',
      anyReason.name || '',
    ]
      .join(' ')
      .toLowerCase()
    if (text.includes('geolocation') || text.includes('positionerror')) return true
    if (typeof anyReason.code === 'number' && anyReason.code >= 1 && anyReason.code <= 3) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

// Override aggressive index.html handlers — never wipe the UI for GPS errors
window.onerror = function (message, _source, _lineno, _colno, error) {
  const msg = String(message || '')
  if (/geolocation|positionerror/i.test(msg) || isGeolocationRejection(error)) {
    console.warn('[GPS] swallowed window.onerror:', message)
    return true
  }
  console.error('[GLOBAL ERROR]', message, error)
  return false
}

window.onunhandledrejection = function (event) {
  if (isGeolocationRejection(event.reason)) {
    console.warn('[GPS] swallowed unhandledrejection:', event.reason)
    event.preventDefault()
    return
  }
  console.error('[UNHANDLED PROMISE]', event.reason)
}

window.addEventListener('unhandledrejection', (event) => {
  if (isGeolocationRejection(event.reason)) {
    console.warn('[GPS] swallowed unhandledrejection listener:', event.reason)
    event.preventDefault()
  }
})

try {
  console.log('[main.tsx] Starting app initialization...')

  // Register FCM/PWA service worker early (GitHub Pages subdirectory)
  if ('serviceWorker' in navigator) {
    const swUrl = new URL('firebase-messaging-sw.js', window.location.href).href
    void navigator.serviceWorker.register(swUrl, { scope: new URL('./', window.location.href).href }).then(
      () => console.log('[main.tsx] Service worker registered'),
      (err) => console.warn('[main.tsx] Service worker register failed', err)
    )
  }

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element not found')

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
  console.log('[main.tsx] React app rendered successfully')
} catch (error) {
  console.error('[main.tsx] CRITICAL ERROR during app initialization:', error)
  document.body.textContent = ''

  const wrapper = document.createElement('div')
  wrapper.style.background = '#09090b'
  wrapper.style.color = '#fff'
  wrapper.style.minHeight = '100vh'
  wrapper.style.padding = '20px'
  wrapper.style.fontFamily = 'monospace'

  const title = document.createElement('h1')
  title.style.color = '#ef4444'
  title.textContent = 'Startup Error'

  const pre = document.createElement('pre')
  pre.textContent = error instanceof Error ? error.stack || error.message : String(error)

  wrapper.appendChild(title)
  wrapper.appendChild(pre)
  document.body.appendChild(wrapper)
}
