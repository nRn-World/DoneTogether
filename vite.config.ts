import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { staticLanding } from './scripts/static-landing'

// Security headers for every dev/preview response. Keep in sync with the "headers"
// block in firebase.json so local, preview and hosting all answer the same way.
//
// Content-Security-Policy: the guest list is built from what the app actually loads.
// Report-only first (Content-Security-Policy-Report-Only): the browser reports
// violations in the console but blocks nothing. Flip REPORT_ONLY to false to enforce.
const REPORT_ONLY = false

// Everything the app really fetches, so nothing below is guessed:
//   maps.googleapis.com / maps.gstatic.com : Google Maps JS + Places (index.html)
//   www.gstatic.com                        : Firebase compat scripts (firebase-messaging-sw.js)
//   accounts.google.com / apis.google.com   : Google Sign-In (Firebase Auth popup)
//   *.googleapis.com                        : Firestore, Identity Toolkit, Cloud Messaging
//   *.firebaseapp.com                       : Firebase Auth iframe/popup origin
//   *.googleusercontent.com                 : Google profile photos
//   firebasestorage.googleapis.com          : uploaded plan images
//   ui-avatars.com                          : fallback avatar images (App.tsx)
//   nominatim.openstreetmap.org             : address search / reverse geocoding
//   api.github.com, nrn-world.github.io     : app update check (version.json, releases)
//   fonts.gstatic.com / fonts.googleapis.com: Maps widget fonts
const CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'", // no 'unsafe-inline': the pre-React error handler lives in public/early-errors.js
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
    'https://www.gstatic.com',
    'https://apis.google.com',
    'https://accounts.google.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // inline styles come from framer-motion + Maps
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
    'https://*.googleapis.com',
    'https://*.googleusercontent.com',
    'https://firebasestorage.googleapis.com',
    'https://*.firebasestorage.app',
    'https://ui-avatars.com',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://maps.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://*.firebaseapp.com',
    'https://firebasestorage.googleapis.com',
    'https://*.firebasestorage.app',
    'https://nominatim.openstreetmap.org',
    'https://api.github.com',
    'https://nrn-world.github.io',
  ],
  'frame-src': ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com', 'https://maps.googleapis.com'],
  'worker-src': ["'self'", 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
}

const buildCsp = (dev: boolean) => {
  const policy: Record<string, string[]> = { ...CSP }
  if (dev) {
    // Vite dev server injects inline modules and talks to itself over websockets.
    policy['script-src'] = [...policy['script-src'], "'unsafe-inline'"]
    policy['connect-src'] = [...policy['connect-src'], 'ws://localhost:*', 'http://localhost:*']
  }
  if (!REPORT_ONLY) {
    // ignored by browsers in report-only mode, so only sent when enforcing
    policy['upgrade-insecure-requests'] = []
  }
  return Object.entries(policy)
    .map(([name, values]) => (values.length ? `${name} ${values.join(' ')}` : name))
    .join('; ')
}

// Permissions-Policy: only the features the app actually uses.
//   geolocation      : GPS reminders / geofencing (navigator.geolocation, useLocation)
//   clipboard-write   : "copy invite link" / "copy email" buttons
//   fullscreen, autoplay, picture-in-picture : allowed for our own pages, not for embeds
// Everything else (camera, microphone, payment, usb, ...) is switched off, also for
// any embedded content, so injected code cannot even ask.
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=(self)',
  'camera=()',
  'clipboard-write=(self)',
  'display-capture=()',
  'fullscreen=(self)',
  'geolocation=(self)',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=(self)',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ')

// Kept enforced while the rest of the policy is still being observed.
const FRAME_PROTECTION: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': PERMISSIONS_POLICY,
}

const securityHeaders = (): Plugin => {
  const middlewareFor =
    (dev: boolean) =>
    (_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
      for (const [key, value] of Object.entries(FRAME_PROTECTION)) res.setHeader(key, value)
      const csp = buildCsp(dev)
      if (REPORT_ONLY) {
        // observe everything, block nothing yet; framing stays enforced below
        res.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
        res.setHeader('Content-Security-Policy-Report-Only', csp)
      } else {
        res.setHeader('Content-Security-Policy', csp)
      }
      next()
    }
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use(middlewareFor(true))
    },
    configurePreviewServer(server) {
      server.middlewares.use(middlewareFor(false))
    },
  }
}

export default defineConfig({
  // staticLanding() writes the crawlable landing section into #root: GitHub Pages and
  // Firebase Hosting serve files only, so the indexable content has to exist in the
  // HTML at build time (see scripts/static-landing.ts).
  plugins: [react(), tailwindcss(), staticLanding(), securityHeaders()],
  base: './',
})
