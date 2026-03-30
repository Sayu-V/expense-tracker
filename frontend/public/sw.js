/**
 * sw.js — Expense Tracker Service Worker
 * v2.3.0 — PWA offline mode
 *
 * Strategy:
 *   App shell (HTML, JS, CSS, fonts)  → cache-first  (fast loads, background update)
 *   API calls (/api/)                  → network-first (fresh data, fallback to cache)
 *
 * Cache names are versioned — activate step purges old caches automatically.
 */

const SHELL_CACHE = 'et-shell-v2.3.0'
const DATA_CACHE  = 'et-data-v2.3.0'
const KEEP_CACHES = [SHELL_CACHE, DATA_CACHE]

// ── Install: pre-cache the app shell entry point ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting())   // activate immediately
  )
})

// ── Activate: purge old versioned caches ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !KEEP_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())  // take control of open tabs
  )
})

// ── Fetch: route requests to the right strategy ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Skip non-http(s) requests (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return

  // ── API calls: network-first ────────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Cache a clone so we can serve it offline later
            caches.open(DATA_CACHE).then((cache) => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(() =>
          // Network down — serve from cache or return a JSON error
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                JSON.stringify({ error: 'You are offline. Showing cached data.' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              )
          )
        )
    )
    return
  }

  // ── App shell: cache-first with background revalidation ────────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      // Kick off a background fetch to refresh the cache
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(() => null)

      // Return cached version immediately; fall back to network if no cache
      return cached || networkFetch || caches.match('/')
    })
  )
})
